import { useState, useMemo } from 'react'
import { motion }        from 'framer-motion'
import TournamentCard    from '../components/TournamentCard'
import { useTournamentContext } from '../context/TournamentContext'
import { useLang }       from '../context/LangContext'
import type { TournamentStatus } from '../data/tournaments'

const FILTERS: { label: string; value: TournamentStatus | 'all' }[] = [
  { label: 'ALL',      value: 'all'      },
  { label: 'OPEN',     value: 'open'     },
  { label: 'LIVE',     value: 'active'   },
  { label: 'FINISHED', value: 'finished' },
]

export default function Home() {
  const [filter, setFilter]           = useState<TournamentStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { tournaments } = useTournamentContext()
  const { lang } = useLang()

  const subtitle = lang === 'es'
    ? 'Mientras otros estudian para ganar dinero… tú puedes ganarlo jugando. Bienvenido a Arena War.'
    : 'While others study to make money… you can earn it by playing. Welcome to Arena War.'

  const byStatus = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === filter)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.organizer.toLowerCase().includes(q) ||
      (t.organizerPubkey ?? '').toLowerCase().includes(q)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byStatus, searchQuery])

  const totalPrizePool      = tournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0)
  const openArenas          = tournaments.filter(t => t.status === 'open').length
  const totalArenas         = tournaments.length
  const finishedTournaments = tournaments.filter(t => t.status === 'finished')
  const prizesDistributed   = finishedTournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0)

  return (
    <div className="min-h-screen bg-arena-bg">
      {/* Hero section */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block font-body text-xs text-arena-red tracking-[0.3em] border border-arena-red/30 bg-arena-red/5 px-3 py-1 rounded mb-6">
              ⚡ POWERED BY SOLANA DEVNET
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl text-white tracking-tight mb-4 leading-none"
          >
            ENTER THE
            <span className="block text-arena-red drop-shadow-[0_0_30px_rgba(229,32,46,0.6)]">
              ARENA
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="font-body text-arena-muted max-w-xl mx-auto mb-10 text-sm leading-relaxed"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="inline-flex items-center divide-x divide-arena-border bg-arena-card border border-arena-border rounded overflow-hidden"
          >
            <StatBadge label="TOTAL PRIZE POOL"    value={`${totalPrizePool.toFixed(1)} SOL`} />
            <StatBadge label="PRIZES DISTRIBUTED" value={`${prizesDistributed.toFixed(2)} SOL`} green />
            <StatBadge label="OPEN ARENAS"         value={String(openArenas)} />
            <StatBadge label="TOTAL ARENAS"        value={String(totalArenas)} />
          </motion.div>
        </div>
      </section>

      {/* Tournament list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 className="font-display font-bold text-xl tracking-widest text-white">
            ACTIVE ARENAS
          </h2>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`font-body text-xs tracking-widest px-3 py-1.5 rounded border transition-all ${
                  filter === f.value
                    ? 'border-arena-red text-arena-red bg-arena-red/10'
                    : 'border-arena-border text-arena-muted hover:border-arena-border/80 hover:text-arena-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by arena name or organizer wallet…"
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-2.5 pl-10 pr-10 font-body text-sm text-white placeholder:text-arena-muted/50 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-muted hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 font-body text-xs text-arena-muted">
              {filtered.length} of {byStatus.length} arenas match &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-arena-muted font-body">
            {searchQuery
              ? `No arenas match "${searchQuery}"`
              : 'No arenas found for this filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatBadge({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="px-6 py-4 text-center">
      <span className={`block font-body text-xs tracking-widest mb-1 ${green ? 'text-arena-green' : 'text-arena-muted'}`}>{label}</span>
      <span className={`block font-display font-bold text-lg ${green ? 'text-arena-green' : 'text-arena-gold'}`}>{value}</span>
    </div>
  )
}
