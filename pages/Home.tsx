import { useState }      from 'react'
import { motion }        from 'framer-motion'
import TournamentCard    from '../components/TournamentCard'
import { useTournamentContext } from '../context/TournamentContext'
import { useLang }             from '../context/LangContext'
import type { TournamentStatus } from '../data/tournaments'

export default function Home() {
  const [filter, setFilter] = useState<TournamentStatus | 'all'>('all')
  const { tournaments, openCount, totalPrize } = useTournamentContext()
  const { t } = useLang()

  const FILTERS = [
    { label: t.home.filterAll,      value: 'all'      },
    { label: t.home.filterOpen,     value: 'open'     },
    { label: t.home.filterLive,     value: 'active'   },
    { label: t.home.filterFinished, value: 'finished' },
  ] as const

  const filtered = filter === 'all' ? tournaments : tournaments.filter(x => x.status === filter)

  return (
    <div className="min-h-screen bg-arena-bg">
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block font-body text-xs text-arena-red tracking-[0.3em] border border-arena-red/30 bg-arena-red/5 px-3 py-1 rounded mb-6">
              {t.home.badge}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl text-white tracking-tight mb-4 leading-none"
          >
            {t.home.title1}
            <span className="block text-arena-red drop-shadow-[0_0_30px_rgba(229,32,46,0.6)]">
              {t.home.title2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="font-body text-arena-muted max-w-xl mx-auto mb-10 text-sm leading-relaxed"
          >
            {t.home.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
            className="inline-flex items-center divide-x divide-arena-border bg-arena-card border border-arena-border rounded overflow-hidden"
          >
            <StatBadge label={t.home.statPrize} value={`${totalPrize.toFixed(1)} SOL`} />
            <StatBadge label={t.home.statOpen}  value={String(openCount)} />
            <StatBadge label={t.home.statTotal} value={String(tournaments.length)} />
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 className="font-display font-bold text-xl tracking-widest text-white">{t.home.section}</h2>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as TournamentStatus | 'all')}
                className={`font-body text-xs tracking-widest px-3 py-1.5 rounded border transition-all ${
                  filter === f.value
                    ? 'border-arena-red text-arena-red bg-arena-red/10'
                    : 'border-arena-border text-arena-muted hover:text-arena-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-arena-muted font-body">{t.home.empty}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tour, i) => <TournamentCard key={tour.id} tournament={tour} index={i} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4 text-center">
      <span className="block font-body text-xs text-arena-muted tracking-widest mb-1">{label}</span>
      <span className="block font-display font-bold text-lg text-arena-gold">{value}</span>
    </div>
  )
}
