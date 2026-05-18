import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence }      from 'framer-motion'
import { useTournamentContext }         from '../context/TournamentContext'
import { useSolPrice }                  from '../hooks/useSolPrice'
import { getTimeAgo, truncateAddress }  from '../lib/activity-helpers'

const ADVANCE_MS = 5_000

export default function RecentWinners() {
  const { tournaments }       = useTournamentContext()
  const { price: solPrice }   = useSolPrice()
  const [activeIdx, setActive] = useState(0)
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const winners = tournaments
    .filter(t => t.status === 'finished' && t.proposedWinner)
    .slice(0, 8)

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % Math.max(1, winners.length))
    }, ADVANCE_MS)
  }

  useEffect(() => {
    if (winners.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners.length])

  if (winners.length === 0) return null

  const winnerShare = (pool: number) => pool * 0.8

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-arena-gold tracking-[0.3em]">🏆 ÚLTIMOS GANADORES</span>
        </div>
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {winners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); resetTimer() }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx ? 'bg-arena-gold w-4' : 'bg-arena-border hover:bg-arena-gold/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards container */}
      <div className="relative overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(calc(-${activeIdx} * (min(280px, 100%+ 16px))))` }}
        >
          {winners.map((t, i) => {
            const prize   = winnerShare(t.prizePool)
            const usd     = (prize * solPrice).toFixed(2)
            const created = t.createdAt
              ? Math.floor(new Date(t.createdAt).getTime() / 1000)
              : 0

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex-shrink-0 w-[260px] bg-arena-card border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  i === activeIdx
                    ? 'border-arena-gold/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                    : 'border-arena-border hover:border-arena-gold/30'
                }`}
                onClick={() => { setActive(i); resetTimer() }}
              >
                {/* Avatar + address */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-arena-gold/30 to-arena-red/20 border border-arena-gold/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-arena-gold text-xs font-bold">
                      {t.proposedWinner!.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-white truncate">
                      {truncateAddress(t.proposedWinner!, 5)}
                    </p>
                    <p className="font-body text-[10px] text-arena-muted truncate">
                      {t.title}
                    </p>
                  </div>
                </div>

                {/* Prize */}
                <div className="bg-arena-surface rounded p-2.5 text-center">
                  <p className="font-display text-xl font-bold text-arena-gold">
                    +{prize.toFixed(3)} SOL
                  </p>
                  <p className="font-body text-[11px] text-arena-muted">≈ ${usd} USD</p>
                </div>

                {/* Footer */}
                <div className="mt-2.5 flex items-center justify-between">
                  <a
                    href={`https://solscan.io/account/${t.proposedWinner}?cluster=mainnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="font-body text-[10px] text-arena-gold/60 hover:text-arena-gold transition-colors"
                  >
                    Ver en Solscan ↗
                  </a>
                  {created > 0 && (
                    <span className="font-body text-[10px] text-arena-muted">
                      {getTimeAgo(created)}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Prev / Next arrows */}
        {winners.length > 1 && (
          <>
            <button
              onClick={() => { setActive(p => (p - 1 + winners.length) % winners.length); resetTimer() }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-7 h-7 rounded-full bg-arena-card border border-arena-border flex items-center justify-center text-arena-muted hover:text-white hover:border-arena-gold/40 transition-all z-10"
            >
              ‹
            </button>
            <button
              onClick={() => { setActive(p => (p + 1) % winners.length); resetTimer() }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-7 h-7 rounded-full bg-arena-card border border-arena-border flex items-center justify-center text-arena-muted hover:text-white hover:border-arena-gold/40 transition-all z-10"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}
