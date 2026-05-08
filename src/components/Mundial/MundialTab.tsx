import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { GRUPOS, FASES_ELIMINATORIAS } from '../../data/mundial2026'
import type { EliminatoriaMatch, Pick } from '../../data/mundial2026'
import { useMundialBets } from '../../hooks/useMundialBets'
import MatchCard from './MatchCard'
import BetsSummary from './BetsSummary'

const GRUPO_KEYS = Object.keys(GRUPOS)
const FASE_KEYS  = Object.keys(FASES_ELIMINATORIAS)

const FASE_LABELS: Record<string, string> = {
  dieciseisavos: 'Dieciseisavos',
  octavos:       'Octavos',
  cuartos:       'Cuartos',
  semifinales:   'Semis',
  tercerLugar:   '3er Lugar',
  final:         'Final',
}

type Tab = 'grupos' | 'eliminatorias' | 'mis-apuestas'

// Balance mock: en prod leer USDT SPL desde la wallet conectada
const MOCK_BALANCE = 250

export default function MundialTab() {
  const { connected } = useWallet()

  const [activeTab,   setActiveTab]   = useState<Tab>('grupos')
  const [activeGroup, setActiveGroup] = useState('A')
  const [activeFase,  setActiveFase]  = useState('dieciseisavos')

  const { bets, getPoolData, refreshPoolData, placeBet, removeBet, totalApostado } = useMundialBets(MOCK_BALANCE)

  // Wrapper para placeBet con firma compatible con MatchCard
  const handleBet = async (
    matchId: number,
    pick: Pick,
    amount: number,
    matchLabel: string,
    teamLabel: string,
    fecha: string,
  ) => {
    if (!connected) return false
    return placeBet(matchId, pick, amount, matchLabel, teamLabel, fecha)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/5 text-[#f59e0b] text-xs font-display tracking-widest mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
          APUESTAS BLOCKCHAIN · SOLANA DEVNET
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-widest">
          ⚽ MUNDIAL <span className="text-[#f59e0b]">2026</span>
        </h1>
        <p className="font-body text-sm text-[#8892a4] mt-2">
          Apostá en los partidos. Gana del pozo colectivo. Powered by Solana.
        </p>

        {/* Wallet gate */}
        {!connected && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded border border-[#ef4444]/40 bg-[#ef4444]/5 text-[#ef4444] text-xs font-display tracking-wider">
            ⚠️ Conectá tu wallet para apostar
          </div>
        )}
      </motion.div>

      {/* Balance badge */}
      {connected && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#1e2535] bg-[#111520] text-xs font-body text-[#8892a4]">
            💵 Balance disponible:
            <span className="text-white font-bold">{MOCK_BALANCE} USDT</span>
            <span className="text-[10px] text-[#8892a4]/60">(mock)</span>
          </div>
        </div>
      )}

      {/* Main tabs */}
      <div className="flex border-b border-[#1e2535] mb-6 gap-0 overflow-x-auto">
        {(
          [
            { key: 'grupos',        label: '🗂 Grupos'        },
            { key: 'eliminatorias', label: '⚔️ Eliminatorias' },
            { key: 'mis-apuestas',  label: `🎯 Mis Apuestas ${Object.keys(bets).length > 0 ? `(${Object.keys(bets).length})` : ''}` },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 font-display text-xs tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[#f59e0b] text-[#f59e0b]'
                : 'border-transparent text-[#8892a4] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GRUPOS TAB */}
      {activeTab === 'grupos' && (
        <motion.div key="grupos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Group selector */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {GRUPO_KEYS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`w-9 h-9 rounded font-display text-xs font-bold transition-all ${
                  activeGroup === g
                    ? 'bg-[#f59e0b] text-black'
                    : 'border border-[#1e2535] text-[#8892a4] hover:border-[#8892a4]/50 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Matches grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(GRUPOS[activeGroup] ?? []).map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onBet={handleBet}
                refreshPoolData={refreshPoolData}
                userBet={bets[match.id]}
                poolData={getPoolData(match.id)}
                walletBalance={MOCK_BALANCE}
                fase="grupos"
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ELIMINATORIAS TAB */}
      {activeTab === 'eliminatorias' && (
        <motion.div key="eliminatorias" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Fase selector */}
          <div className="flex flex-wrap gap-1.5 mb-6 overflow-x-auto">
            {FASE_KEYS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFase(f)}
                className={`px-3 py-1.5 rounded font-display text-xs tracking-wider transition-all ${
                  activeFase === f
                    ? 'bg-[#f59e0b] text-black'
                    : 'border border-[#1e2535] text-[#8892a4] hover:border-[#8892a4]/50 hover:text-white'
                }`}
              >
                {FASE_LABELS[f] ?? f}
              </button>
            ))}
          </div>

          {/* Eliminatoria matches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(FASES_ELIMINATORIAS[activeFase] ?? []).map((m: EliminatoriaMatch) => (
              <EliminatoriaCard key={m.id} match={m} fase={activeFase} />
            ))}
          </div>
        </motion.div>
      )}

      {/* MIS APUESTAS TAB */}
      {activeTab === 'mis-apuestas' && (
        <motion.div key="apuestas" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BetsSummary
            bets={bets}
            totalApostado={totalApostado}
            onRemove={removeBet}
          />
        </motion.div>
      )}
    </div>
  )
}

// Card simplificado para partidos eliminatorios (equipos aún TBD)
function EliminatoriaCard({ match, fase }: { match: EliminatoriaMatch; fase: string }) {
  const matchDate = new Date(match.fecha).toLocaleDateString('es-MX', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const msLeft = new Date(match.fecha).getTime() - Date.now() - 10 * 60 * 1000
  const closed = msLeft <= 0

  const faseColor: Record<string, string> = {
    dieciseisavos: '#5ba3f5',
    octavos:       '#f59e0b',
    cuartos:       '#4caf50',
    semifinales:   '#E5202E',
    tercerLugar:   '#8892a4',
    final:         '#f59e0b',
  }
  const color = faseColor[fase] ?? '#8892a4'

  return (
    <div className="rounded-lg border border-[#1e2535] bg-[#111520] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className="font-display text-[10px] tracking-widest border rounded px-1.5 py-0.5 inline-block mb-1"
            style={{ color, borderColor: `${color}40` }}
          >
            {FASE_LABELS[fase] ?? fase}
          </div>
          <div className="font-display text-xs text-[#8892a4]">📍 {match.estadio} · {matchDate}</div>
        </div>
        {closed && (
          <span className="text-[10px] font-bold text-[#ef4444] border border-[#ef4444]/40 rounded px-1.5 py-0.5">
            CERRADA
          </span>
        )}
      </div>

      <div className="text-center py-2">
        <div className="font-display text-sm text-white tracking-wider">{match.desc}</div>
        <div className="text-xs text-[#8892a4] mt-1">Equipos por definir</div>
      </div>

      <div className="text-center font-display text-[10px] text-[#8892a4] tracking-wider border border-[#1e2535] rounded py-2">
        🔒 Apuestas disponibles cuando se confirmen los equipos
      </div>
    </div>
  )
}
