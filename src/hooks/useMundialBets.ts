import { useState, useCallback } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import type { Pick, BetEntry, PoolData } from '../data/mundial2026'
import {
  apostar           as apostarOnChain,
  getPoolData       as getPoolDataOnChain,
  getMiApuesta      as getMiApuestaOnChain,
  reclamarGanancias as reclamarGananciasOnChain,
} from '../lib/mundialContract'

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'arenawar_mundial_bets'
const POOL_KEY    = 'arenawar_mundial_pools'

function loadBets(): Record<number, BetEntry> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function loadPools(): Record<number, PoolData> {
  try { return JSON.parse(localStorage.getItem(POOL_KEY) ?? '{}') } catch { return {} }
}
function saveBets(b: Record<number, BetEntry>)  { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)) }
function savePools(p: Record<number, PoolData>) { localStorage.setItem(POOL_KEY,    JSON.stringify(p)) }

// ─── Toast styles ─────────────────────────────────────────────────────────────
const T_ERR  = { style: { background: '#111827', color: '#E5E7EB', border: '1px solid #ef4444' } }
const T_OK   = { style: { background: '#111827', color: '#E5E7EB', border: '1px solid #4caf50' } }
const T_WARN = { style: { background: '#111827', color: '#E5E7EB', border: '1px solid #f59e0b' } }

// ─── Anchor error parser ──────────────────────────────────────────────────────
const ANCHOR_ERRORS: Record<string, string> = {
  ApuestasCerradas:  'Las apuestas para este partido ya están cerradas',
  MontoInsuficiente: 'Monto insuficiente — mínimo 1 USDT',
  YaReclamado:       'Ya reclamaste tu premio o devolución',
  NoGanaste:         'No ganaste este partido',
  PartidoCancelado:  'Partido cancelado — usá la devolución',
  PoolVacio:         'El pool ganador está vacío',
  NoEresAdmin:       'No tenés permisos de administrador',
}

function parseError(e: unknown): string {
  if (!(e instanceof Error)) return 'Error desconocido'
  const m = e.message.match(/Error Code: (\w+)/)
  if (m) return ANCHOR_ERRORS[m[1]] ?? e.message
  if (e.message.toLowerCase().includes('user rejected')) return 'Transacción cancelada'
  if (e.message.includes('insufficient funds'))          return 'SOL insuficiente para fees'
  return e.message
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMundialBets(walletBalance: number) {
  const wallet = useAnchorWallet()

  const [bets,    setBets]    = useState<Record<number, BetEntry>>(loadBets)
  const [pools,   setPools]   = useState<Record<number, PoolData>>(loadPools)
  const [loading, setLoading] = useState(false)

  // Helpers that keep state + localStorage in sync atomically
  const writeBets  = (next: Record<number, BetEntry>)  => { setBets(next);  saveBets(next) }
  const writePools = (next: Record<number, PoolData>) => { setPools(next); savePools(next) }

  // ── Synchronous cache read — called on every render by MatchCard ─────────────
  const getPoolData = useCallback((matchId: number): PoolData => {
    return pools[matchId] ?? { total: 0, local: 0, empate: 0, visita: 0 }
  }, [pools])

  // ── Fetch live pool data from chain and update state cache ───────────────────
  const refreshPoolData = useCallback(async (matchId: number): Promise<void> => {
    const onChain = await getPoolDataOnChain(matchId)
    if (!onChain) return
    setPools(prev => {
      const next = {
        ...prev,
        [matchId]: { total: onChain.total, local: onChain.local, empate: onChain.empate, visita: onChain.visita },
      }
      savePools(next)
      return next
    })
  }, [])

  // ── Fetch my on-chain bet (reconciliation or detail view) ────────────────────
  const fetchMiApuesta = useCallback(async (matchId: number) => {
    if (!wallet) return null
    return getMiApuestaOnChain(wallet, matchId)
  }, [wallet])

  // ── Place bet on-chain ───────────────────────────────────────────────────────
  const placeBet = useCallback(async (
    matchId:    number,
    pick:       Pick,
    amount:     number,
    matchLabel: string,
    teamLabel:  string,
    fecha:      string,
  ): Promise<boolean> => {
    if (amount < 1) {
      toast.error('Mínimo 1 USDT por apuesta', T_ERR)
      return false
    }
    if (amount > walletBalance) {
      toast.error('Saldo insuficiente', T_ERR)
      return false
    }
    if (!wallet) {
      toast.error('Conectá tu wallet para apostar', T_WARN)
      return false
    }

    setLoading(true)
    const tid = toast.loading('Enviando apuesta a Solana…', T_WARN)

    try {
      await apostarOnChain(wallet, matchId, pick, amount)

      // Update local bet record
      const newBet: BetEntry = { matchId, pick, amount, matchLabel, teamLabel, fecha, status: 'activa' }
      writeBets({ ...bets, [matchId]: newBet })

      // Optimistic pool update (subtract previous bet from same match if any)
      const cur  = pools[matchId] ?? { total: 0, local: 0, empate: 0, visita: 0 }
      const prev = bets[matchId]
      writePools({
        ...pools,
        [matchId]: {
          total:  cur.total  - (prev?.amount ?? 0)                               + amount,
          local:  cur.local  - (prev?.pick === 'local'  ? (prev.amount ?? 0) : 0) + (pick === 'local'  ? amount : 0),
          empate: cur.empate - (prev?.pick === 'empate' ? (prev.amount ?? 0) : 0) + (pick === 'empate' ? amount : 0),
          visita: cur.visita - (prev?.pick === 'visita' ? (prev.amount ?? 0) : 0) + (pick === 'visita' ? amount : 0),
        },
      })

      toast.dismiss(tid)
      toast.success(`✅ Apuesta confirmada: ${amount} USDT → ${teamLabel}`, T_OK)
      return true
    } catch (e) {
      toast.dismiss(tid)
      toast.error(parseError(e), T_ERR)
      return false
    } finally {
      setLoading(false)
    }
  }, [wallet, walletBalance, bets, pools])

  // ── Claim parimutuel winnings on-chain ───────────────────────────────────────
  const reclamarGanancias = useCallback(async (matchId: number): Promise<boolean> => {
    if (!wallet) {
      toast.error('Conectá tu wallet para reclamar', T_WARN)
      return false
    }

    setLoading(true)
    const tid = toast.loading('Reclamando ganancias…', T_WARN)

    try {
      await reclamarGananciasOnChain(wallet, matchId)

      setBets(prev => {
        const next = { ...prev }
        if (next[matchId]) next[matchId] = { ...next[matchId], status: 'ganó' }
        saveBets(next)
        return next
      })

      toast.dismiss(tid)
      toast.success('🏆 ¡Ganancias reclamadas exitosamente!', T_OK)
      return true
    } catch (e) {
      toast.dismiss(tid)
      toast.error(parseError(e), T_ERR)
      return false
    } finally {
      setLoading(false)
    }
  }, [wallet])

  // ── Remove local bet record (no on-chain effect) ──────────────────────────────
  const removeBet = useCallback((matchId: number) => {
    const next = { ...bets }
    delete next[matchId]
    writeBets(next)
  }, [bets])

  const totalApostado = Object.values(bets).reduce((acc, b) => acc + b.amount, 0)

  return {
    bets,
    pools,
    loading,
    isConnected:      !!wallet,
    getPoolData,       // sync read from cache
    refreshPoolData,   // async: fetch from chain → updates cache
    fetchMiApuesta,    // async: fetch individual bet from chain
    placeBet,          // async: submit TX → returns Promise<boolean>
    reclamarGanancias, // async: claim winnings TX
    removeBet,
    totalApostado,
  }
}
