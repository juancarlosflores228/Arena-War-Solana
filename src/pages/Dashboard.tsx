import { motion }        from 'framer-motion'
import { useWallet }     from '@solana/wallet-adapter-react'
import { Link }          from 'react-router-dom'
import { useTournamentContext } from '../context/TournamentContext'
import type { Tournament }     from '../data/tournaments'
import RecentWinners           from '../components/RecentWinners'

export default function Dashboard() {
  const { connected, publicKey }                    = useWallet()
  const { tournaments, joinedIds, loading }         = useTournamentContext()

  const truncate = (pk: string) => `${pk.slice(0, 6)}...${pk.slice(-6)}`

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 opacity-20">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="30" width="60" height="40" rx="4" stroke="#E5202E" strokeWidth="3"/>
              <path d="M25 30V20a15 15 0 0130 0v10" stroke="#E5202E" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="40" cy="50" r="5" fill="#E5202E"/>
            </svg>
          </div>
          <h2 className="font-display font-bold text-2xl text-white tracking-widest mb-3">LOCKED</h2>
          <p className="font-body text-arena-muted text-sm">Connect your Phantom wallet to access your dashboard</p>
        </motion.div>
      </div>
    )
  }

  const myPubkey  = publicKey.toBase58()
  const created   = tournaments.filter(t => t.organizerPubkey === myPubkey)
  const joined    = tournaments.filter(t => joinedIds.has(t.id) && t.organizerPubkey !== myPubkey)
  const activeSol = created
    .filter(t => t.status !== 'finished')
    .reduce((sum, t) => sum + t.prizePool, 0)
  const finished  = created.filter(t => t.status === 'finished').length

  return (
    <div className="min-h-screen bg-arena-bg pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4">

        {/* Recent winners carousel */}
        <RecentWinners />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <span className="font-body text-xs text-arena-red tracking-[0.3em] block mb-2">▶ COMMANDER HQ</span>
            <h1 className="font-display font-bold text-4xl text-white tracking-tight">DASHBOARD</h1>
          </div>
          <div className="font-body text-xs bg-arena-card border border-arena-border rounded px-4 py-2 text-arena-cyan">
            {truncate(myPubkey)}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
        >
          {[
            { label: 'CREATED',      value: loading ? '…' : created.length,              accent: 'text-arena-red'   },
            { label: 'JOINED',       value: loading ? '…' : joined.length,               accent: 'text-arena-cyan'  },
            { label: 'ACTIVE PRIZE', value: loading ? '…' : `${activeSol.toFixed(2)} SOL`, accent: 'text-arena-gold'  },
            { label: 'COMPLETED',    value: loading ? '…' : finished,                    accent: 'text-arena-green' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-arena-card border border-arena-border rounded p-4 text-center"
            >
              <span className="font-body text-xs text-arena-muted tracking-widest block mb-1">{s.label}</span>
              <span className={`font-display font-bold text-2xl ${s.accent}`}>{s.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Created tournaments */}
        <Section title="ARENAS CREATED" count={created.length} delay={0.2}>
          {loading ? (
            <LoadingSkeleton />
          ) : created.length === 0 ? (
            <Empty
              message="No has creado ninguna arena todavía."
              action={{ label: 'Crear primera arena', to: '/create' }}
            />
          ) : (
            <div className="space-y-3">
              {created.map((t, i) => (
                <DashboardRow key={t.id} tournament={t} index={i} role="organizer" />
              ))}
            </div>
          )}
        </Section>

        {/* Joined tournaments */}
        <Section title="ARENAS JOINED" count={joined.length} delay={0.3}>
          {loading ? (
            <LoadingSkeleton />
          ) : joined.length === 0 ? (
            <Empty
              message="No te has unido a ninguna arena todavía."
              action={{ label: 'Ver arenas abiertas', to: '/' }}
            />
          ) : (
            <div className="space-y-3">
              {joined.map((t, i) => (
                <DashboardRow key={t.id} tournament={t} index={i} role="player" />
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, count, delay, children,
}: {
  title: string; count: number; delay: number; children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display font-bold text-lg tracking-widest text-white">{title}</h2>
        <span className="font-body text-xs bg-arena-red/10 border border-arena-red/30 text-arena-red px-2 py-0.5 rounded">
          {count}
        </span>
      </div>
      {children}
    </motion.div>
  )
}

function DashboardRow({
  tournament, index, role,
}: {
  tournament: Tournament; index: number; role: 'organizer' | 'player'
}) {
  const { title, entryFee, playerCount, maxPlayers, prizePool, status, game } = tournament

  const STATUS_COLORS = {
    open:     'text-arena-green border-arena-green/40 bg-arena-green/5',
    active:   'text-arena-gold  border-arena-gold/40  bg-arena-gold/5',
    finished: 'text-arena-muted border-arena-border   bg-transparent',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-arena-card border border-arena-border rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-arena-border/80 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 w-1 h-10 rounded-full ${
          role === 'organizer' ? 'bg-arena-red' : 'bg-arena-cyan'
        }`} />
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-display font-bold text-sm text-arena-text tracking-wider">{title}</span>
            <span className={`font-body text-xs border px-1.5 py-0.5 rounded tracking-widest ${STATUS_COLORS[status]}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <span className="font-body text-xs text-arena-muted">{game} · {playerCount}/{maxPlayers} players</span>
        </div>
      </div>

      <div className="flex items-center gap-6 sm:gap-8">
        <div className="text-right">
          <span className="font-body text-xs text-arena-muted block">ENTRY</span>
          <span className="font-display text-sm text-white font-semibold">{entryFee} SOL</span>
        </div>
        <div className="text-right">
          <span className="font-body text-xs text-arena-muted block">PRIZE</span>
          <span className="font-display text-sm text-arena-gold font-semibold">{prizePool.toFixed(2)} SOL</span>
        </div>
        <span className={`font-body text-xs tracking-widest px-2 py-1 rounded border ${
          role === 'organizer'
            ? 'text-arena-red border-arena-red/30 bg-arena-red/5'
            : 'text-arena-cyan border-arena-cyan/30 bg-arena-cyan/5'
        }`}>
          {role === 'organizer' ? 'ORG' : 'PLAYER'}
        </span>
      </div>
    </motion.div>
  )
}

function Empty({ message, action }: { message: string; action: { label: string; to: string } }) {
  return (
    <div className="text-center py-10 border border-dashed border-arena-border/50 rounded">
      <p className="font-body text-arena-muted text-sm mb-3">{message}</p>
      <Link
        to={action.to}
        className="font-display text-xs text-arena-red border border-arena-red/30 px-4 py-2 rounded hover:bg-arena-red/10 transition-colors tracking-widest"
      >
        {action.label} →
      </Link>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <div key={i} className="bg-arena-card border border-arena-border rounded p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 rounded-full bg-arena-border" />
            <div className="space-y-2">
              <div className="h-3 w-40 bg-arena-border rounded" />
              <div className="h-2.5 w-24 bg-arena-border/60 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
