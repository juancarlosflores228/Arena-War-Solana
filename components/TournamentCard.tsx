import { motion }              from 'framer-motion'
import { useWallet }           from '@solana/wallet-adapter-react'
import { useArenaToast }       from '../hooks/useToast'
import { useTournamentContext } from '../context/TournamentContext'
import { useLang }             from '../context/LangContext'
import type { Tournament }     from '../data/tournaments'

interface Props { tournament: Tournament; index: number }

export default function TournamentCard({ tournament, index }: Props) {
  const { connected }     = useWallet()
  const toast             = useArenaToast()
  const { joinTournament } = useTournamentContext()
  const { t }             = useLang()

  const { title, entryFee, maxPlayers, playerCount, prizePool, organizer, status, game } = tournament
  const fillPct = (playerCount / maxPlayers) * 100
  const isFull  = playerCount >= maxPlayers
  const canJoin = status === 'open' && !isFull

  const STATUS_CONFIG = {
    open:     { label: t.card.statusOpen,     color: 'text-arena-green  border-arena-green/40  bg-arena-green/10'  },
    active:   { label: t.card.statusActive,   color: 'text-arena-gold   border-arena-gold/40   bg-arena-gold/10'   },
    finished: { label: t.card.statusFinished, color: 'text-arena-muted  border-arena-border    bg-arena-border/40' },
  }
  const cfg = STATUS_CONFIG[status]

  const handleJoin = () => {
    if (!connected) { toast.error(t.toast.connectFirst); return }
    console.log('[Arena War] Joining tournament:', tournament.id)
    joinTournament(tournament.id)
    toast.info(`${t.toast.joining} ${title} ${t.toast.pending}`)
  }

  const btnLabel = isFull ? t.card.full
    : status === 'finished' ? t.card.ended
    : status === 'active'   ? t.card.live
    : t.card.join

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -3 }}
      className="group relative bg-arena-card border border-arena-border rounded overflow-hidden shadow-card hover:border-arena-red/40 transition-colors duration-300"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-300 ${canJoin ? 'bg-arena-red group-hover:shadow-red-glow' : 'bg-arena-border'}`} />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-arena-red/20 group-hover:border-arena-red/60 transition-colors" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="block font-body text-xs text-arena-muted tracking-widest mb-1">{game}</span>
            <h3 className="font-display font-bold text-arena-text tracking-wider text-base leading-tight">{title}</h3>
          </div>
          <span className={`flex-shrink-0 font-body text-xs px-2 py-0.5 rounded border tracking-widest ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label={t.card.entry}  value={`${entryFee} SOL`} highlight />
          <Stat label={t.card.prize}  value={`${prizePool.toFixed(1)} SOL`} gold />
          <Stat label={t.card.slots}  value={`${playerCount}/${maxPlayers}`} />
        </div>

        <div className="mb-4">
          <div className="flex justify-between font-body text-xs text-arena-muted mb-1">
            <span>{t.card.players}</span>
            <span>{Math.round(fillPct)}%</span>
          </div>
          <div className="h-1.5 bg-arena-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ delay: index * 0.07 + 0.3, duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${fillPct >= 100 ? 'bg-arena-muted' : fillPct >= 75 ? 'bg-arena-gold' : 'bg-arena-red'}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-arena-muted">
            {t.card.org}: <span className="text-arena-cyan">{organizer}</span>
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleJoin}
            disabled={!canJoin}
            className={`font-display text-xs font-bold tracking-widest px-4 py-2 rounded transition-all duration-200 ${
              canJoin
                ? 'bg-arena-red hover:bg-arena-red/80 text-white hover:shadow-red-glow'
                : 'bg-arena-border text-arena-muted cursor-not-allowed'
            }`}
          >
            {btnLabel}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function Stat({ label, value, highlight, gold }: { label: string; value: string; highlight?: boolean; gold?: boolean }) {
  return (
    <div className="bg-arena-surface border border-arena-border/50 rounded p-2 text-center">
      <span className="block font-body text-xs text-arena-muted tracking-widest">{label}</span>
      <span className={`block font-display font-semibold text-sm mt-0.5 ${gold ? 'text-arena-gold' : highlight ? 'text-white' : 'text-arena-text'}`}>
        {value}
      </span>
    </div>
  )
}
