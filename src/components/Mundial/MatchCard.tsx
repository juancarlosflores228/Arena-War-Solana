import { useState, useEffect } from 'react'
import { FLAGS, POOL_CONFIG } from '../../data/mundial2026'
import type { MatchData, Pick, PoolData } from '../../data/mundial2026'
import Countdown from './Countdown'

interface Props {
  match: MatchData
  onBet: (matchId: number, pick: Pick, amount: number, matchLabel: string, teamLabel: string, fecha: string) => boolean | Promise<boolean>
  refreshPoolData?: (matchId: number) => Promise<void>
  userBet: { pick: Pick; amount: number } | undefined
  poolData: PoolData
  walletBalance: number
  fase?: string
}

function calcOdds(pool: PoolData) {
  const total = pool.total || 1
  return {
    local:  Math.max(total / Math.max(pool.local, 0.01), 1.01),
    empate: Math.max(total / Math.max(pool.empate, 0.01), 1.01),
    visita: Math.max(total / Math.max(pool.visita, 0.01), 1.01),
  }
}

export default function MatchCard({ match, onBet, refreshPoolData, userBet, poolData, walletBalance, fase = 'grupos' }: Props) {
  const [apuestaCerrada, setApuestaCerrada] = useState(false)
  const [selected, setSelected] = useState<Pick | null>(userBet?.pick ?? null)
  const [amount, setAmount]     = useState<string>(userBet ? String(userBet.amount) : '')
  const [loading, setLoading]   = useState(false)

  // Fetch live pool data from devnet once on mount
  useEffect(() => {
    refreshPoolData?.(match.id)
  }, [match.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const config     = POOL_CONFIG[fase] ?? POOL_CONFIG.grupos
  const odds       = calcOdds(poolData)
  const localFlag  = FLAGS[match.local]  ?? '🏳️'
  const visitaFlag = FLAGS[match.visita] ?? '🏳️'

  const matchDate = new Date(match.fecha)
  const dateLabel = matchDate.toLocaleDateString('es-MX', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const handleBet = async () => {
    if (!selected || !amount) return
    const parsed = parseFloat(amount)
    if (isNaN(parsed)) return

    const teamLabel =
      selected === 'local'  ? match.local  :
      selected === 'visita' ? match.visita : 'Empate'

    setLoading(true)
    const ok = await onBet(match.id, selected, parsed, `${match.local} vs ${match.visita}`, teamLabel, match.fecha)
    setLoading(false)
    if (ok) setAmount('')
  }

  const pickBtn = (pick: Pick, label: string, flag: string, odd: number) => {
    const isSelected = selected === pick
    const colors = {
      local:  'border-[#4caf50] bg-[#4caf50]/10 text-[#4caf50]',
      empate: 'border-[#8892a4] bg-[#8892a4]/10 text-[#8892a4]',
      visita: 'border-[#5ba3f5] bg-[#5ba3f5]/10 text-[#5ba3f5]',
    }
    const idle = 'border-[#1e2535] bg-transparent text-[#8892a4] hover:border-[#8892a4]/50'

    return (
      <button
        key={pick}
        disabled={apuestaCerrada}
        onClick={() => setSelected(pick)}
        className={`flex-1 rounded border py-2 px-1 text-center transition-all duration-150 ${
          isSelected ? colors[pick] : idle
        } ${apuestaCerrada ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
      >
        <div className="text-base">{flag}</div>
        <div className="font-display text-[10px] tracking-wider mt-0.5 truncate">{label}</div>
        <div className={`text-[11px] font-bold mt-1 ${odd < 1.5 ? 'text-[#f59e0b]' : ''}`}>
          {odd.toFixed(2)}x
        </div>
      </button>
    )
  }

  return (
    <div
      className={`rounded-lg border bg-[#111520] flex flex-col gap-3 p-4 transition-all ${
        apuestaCerrada ? 'border-[#ef4444]/30' : 'border-[#1e2535] hover:border-[#1e2535]/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-display text-[10px] tracking-widest text-[#8892a4]">
              GRUPO {match.grupo}
            </span>
            <Countdown
              fechaPartido={match.fecha}
              onClose={() => setApuestaCerrada(true)}
            />
          </div>
          <div className="font-display text-xs text-[#8892a4] mt-1">
            📍 {match.estadio} · {dateLabel}
          </div>
        </div>

        {/* Pool */}
        <div className="text-right shrink-0">
          {poolData.total < config.threshold ? (
            <div className="text-[10px] text-[#f59e0b] font-bold">💰 Acumulando...</div>
          ) : (
            <div className="text-[11px] font-bold text-[#4caf50]">
              💰 {poolData.total.toFixed(0)} USDT
            </div>
          )}
          <div className="text-[10px] text-[#8892a4]">
            {poolData.total > 0 ? `${poolData.total.toFixed(0)} apostados` : 'Sin apuestas aún'}
          </div>
        </div>
      </div>

      {/* Teams — siempre visibles */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex-1 text-center">
          <div className="text-3xl">{localFlag}</div>
          <div className="font-display text-xs mt-1 text-white truncate">{match.local}</div>
        </div>
        <div className="font-display text-sm text-[#8892a4] shrink-0">VS</div>
        <div className="flex-1 text-center">
          <div className="text-3xl">{visitaFlag}</div>
          <div className="font-display text-xs mt-1 text-white truncate">{match.visita}</div>
        </div>
      </div>

      {/* Sección interactiva con overlay cuando cierra */}
      <div className="relative flex flex-col gap-3">
        {/* Overlay de cierre */}
        {apuestaCerrada && (
          <div className="absolute inset-0 z-10 rounded-lg bg-[#111520]/80 backdrop-blur-[2px] flex items-center justify-center border border-[#ef4444]/20">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10">
              <span className="text-base">🔒</span>
              <span className="font-display text-xs tracking-wider text-[#ef4444]">Apuestas cerradas</span>
            </div>
          </div>
        )}

        {/* Pick buttons */}
        <div className="flex gap-2">
          {pickBtn('local',  match.local,  localFlag,  odds.local)}
          {pickBtn('empate', 'Empate',     '🤝',       odds.empate)}
          {pickBtn('visita', match.visita, visitaFlag, odds.visita)}
        </div>

        {/* Bet input */}
        <div className={`flex gap-2 items-center transition-opacity ${apuestaCerrada ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="relative flex-1">
            <input
              type="number"
              min={1}
              max={walletBalance}
              step={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={apuestaCerrada}
              placeholder="Monto USDT"
              className="w-full bg-arena-bg border border-[#1e2535] rounded px-3 py-1.5 text-sm text-white font-body placeholder-[#8892a4]/50 focus:outline-none focus:border-[#5ba3f5]/60 disabled:opacity-40"
            />
            <button
              disabled={apuestaCerrada}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8892a4] hover:text-white"
              onClick={() => setAmount(String(Math.floor(walletBalance)))}
            >
              MAX
            </button>
          </div>
          <button
            disabled={apuestaCerrada || !selected || !amount || parseFloat(amount) < 1 || loading}
            onClick={handleBet}
            className="px-4 py-1.5 rounded font-display text-xs tracking-wider bg-[#5ba3f5] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#5ba3f5]/80 transition-colors shrink-0"
          >
            {loading ? '...' : 'APOSTAR'}
          </button>
        </div>
      </div>

      {/* Current bet indicator — siempre visible */}
      {userBet && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#4caf50] border border-[#4caf50]/20 rounded px-2 py-1">
          <span>✅</span>
          <span>
            Tu apuesta: {userBet.amount} USDT →{' '}
            {userBet.pick === 'local' ? match.local : userBet.pick === 'visita' ? match.visita : 'Empate'}
          </span>
        </div>
      )}
    </div>
  )
}
