import { useState }     from 'react'
import { motion }       from 'framer-motion'
import { useWallet }    from '@solana/wallet-adapter-react'
import { useArenaToast }       from '../hooks/useToast'
import { useTournamentContext } from '../context/TournamentContext'
import type { Tournament } from '../data/tournaments'

const STATUS_CONFIG = {
  open:     { label: 'OPEN',     color: 'text-arena-green  border-arena-green/40  bg-arena-green/10'  },
  active:   { label: 'LIVE',     color: 'text-arena-gold   border-arena-gold/40   bg-arena-gold/10'   },
  finished: { label: 'ENDED',    color: 'text-arena-muted  border-arena-border    bg-arena-border/40' },
}

interface Props {
  tournament: Tournament
  index:      number
}

export default function TournamentCard({ tournament, index }: Props) {
  const { connected, publicKey } = useWallet()
  const toast          = useArenaToast()
  const { joinTournament, submitting, joinedIds, likeTournament, dislikeTournament } = useTournamentContext()

  // Layer 1: local UI guard with 2-second cooldown after any attempt
  const [isJoining, setIsJoining] = useState(false)

  const { title, entryFee, maxPlayers, playerCount, prizePool, organizer, status, game, likes, dislikes, streamUrl, organizerReputation, proposedWinner } = tournament
  const vote        = localStorage.getItem(`vote_${tournament.id}`)
  const fillPct     = (playerCount / maxPlayers) * 100
  const cfg         = STATUS_CONFIG[status]
  const isFull      = playerCount >= maxPlayers
  const isJoined    = joinedIds.has(tournament.id)
  const isOrganizer = connected && publicKey != null && tournament.organizerPubkey != null
    ? publicKey.toBase58() === tournament.organizerPubkey
    : false
  const canJoin  = status === 'open' && !isFull && !submitting && !isJoined && !isJoining && !isOrganizer

  const handleJoin = async () => {
    if (!connected)  { toast.error('Connect your wallet first'); return }
    if (isJoining)   { return }   // layer 1 guard
    if (isJoined)    { toast.error('Ya te uniste a este torneo'); return }  // layer 2 guard

    setIsJoining(true)
    try {
      await joinTournament(tournament)
    } finally {
      // Keep button locked for 2 seconds after any outcome — prevents same-blockhash reuse
      setTimeout(() => setIsJoining(false), 2000)
    }
  }

  const handleVote = (type: 'like' | 'dislike') => {
    if (!connected) {
      toast.error('Connect your Phantom wallet first')
      return
    }

    if (type === 'like') {
      likeTournament(tournament.id)
    } else {
      dislikeTournament(tournament.id)
    }
  }

  const streamPlatform = getStreamPlatform(streamUrl)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -3 }}
      className="group relative bg-arena-card border border-arena-border rounded overflow-hidden shadow-card hover:border-arena-red/40 transition-colors duration-300"
    >
      {/* Top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-300 ${
          canJoin ? 'bg-arena-red group-hover:shadow-red-glow' : 'bg-arena-border'
        }`}
      />

      {/* Glitch corner decoration */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-arena-red/20 group-hover:border-arena-red/60 transition-colors" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-arena-border/60" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="block font-body text-xs text-arena-muted tracking-widest mb-1">{game}</span>
            <h3 className="font-display font-bold text-arena-text tracking-wider text-base leading-tight">{title}</h3>
            {organizerReputation && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm leading-none">{organizerReputation.badge}</span>
                <span className={`font-body text-xs tracking-widest ${
                  organizerReputation.label === 'TRUSTED'  ? 'text-arena-gold'  :
                  organizerReputation.label === 'RELIABLE' ? 'text-arena-green' :
                  organizerReputation.label === 'FAIR'     ? 'text-arena-cyan'  :
                  organizerReputation.label === 'NEW'      ? 'text-arena-muted' : 'text-arena-red'
                }`}>{organizerReputation.label}</span>
                <span className="font-body text-xs text-arena-muted/60">{organizerReputation.score}%</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {status === 'active' && streamUrl ? (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`group font-body text-xs px-2 py-0.5 rounded border tracking-widest flex items-center gap-1 hover:opacity-90 transition-opacity ${cfg.color}`}
              >
                <svg className="w-2.5 h-2.5 group-hover:scale-110 transition-transform flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                {cfg.label}
              </a>
            ) : (
              <span className={`font-body text-xs px-2 py-0.5 rounded border tracking-widest ${cfg.color}`}>
                {cfg.label}
              </span>
            )}
            {status === 'finished' && proposedWinner && (
              <span className="font-body text-xs px-2 py-0.5 rounded border tracking-widest text-arena-green border-arena-green/40 bg-arena-green/10">
                ✓ COMPLETED
              </span>
            )}
          </div>
        </div>

        {/* Winner display — finished tournaments only */}
        {status === 'finished' && proposedWinner && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-4 bg-gradient-to-r from-arena-gold/20 to-transparent border-l-4 border-arena-gold rounded-r-lg p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-body text-xs text-arena-gold tracking-widest block mb-1">
                  🏆 WINNER
                </span>
                <p className="font-mono text-xs text-white truncate mb-1">
                  {proposedWinner.slice(0, 8)}…{proposedWinner.slice(-8)}
                </p>
                <a
                  href={`https://solscan.io/account/${proposedWinner}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-xs text-arena-gold/70 hover:text-arena-gold underline flex items-center gap-1 transition-colors"
                >
                  Ver en Solscan ↗
                </a>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-body text-xs text-arena-muted tracking-widest block mb-0.5">PRIZE WON</span>
                <p className="font-display text-xl text-arena-gold font-bold">{prizePool.toFixed(3)} SOL</p>
                <p className="font-body text-xs text-arena-muted">≈ ${(prizePool * 150).toFixed(2)} USD</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="ENTRY" value={`${entryFee} SOL`} highlight />
          <Stat label="PRIZE" value={`${prizePool.toFixed(1)} SOL`} gold />
          <Stat label="SLOTS" value={`${playerCount}/${maxPlayers}`} />
        </div>

        {streamUrl && (
          <div className="mb-4">
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-arena-red px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-arena-red/90"
            >
              <span>🔴 EN VIVO</span>
              <span>{streamPlatform ?? 'LIVE'}</span>
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleVote('like')}
            disabled={!connected || vote === 'like'}
            className={`font-display text-xs font-bold tracking-widest px-3 py-2 rounded transition-all duration-200 ${
              vote === 'like'
                ? 'bg-arena-green text-black border border-arena-green/50'
                : 'bg-arena-surface border border-arena-border text-white hover:bg-arena-surface/80'
            } ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            👍 {likes}
          </button>
          <button
            type="button"
            onClick={() => handleVote('dislike')}
            disabled={!connected || vote === 'dislike'}
            className={`font-display text-xs font-bold tracking-widest px-3 py-2 rounded transition-all duration-200 ${
              vote === 'dislike'
                ? 'bg-arena-muted text-white border border-arena-border'
                : 'bg-arena-surface border border-arena-border text-white hover:bg-arena-surface/80'
            } ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            👎 {dislikes}
          </button>
        </div>

        {/* Player fill bar */}
        <div className="mb-4">
          <div className="flex justify-between font-body text-xs text-arena-muted mb-1">
            <span>Players</span>
            <span>{Math.round(fillPct)}%</span>
          </div>
          <div className="h-1.5 bg-arena-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ delay: index * 0.07 + 0.3, duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                fillPct >= 100 ? 'bg-arena-muted' :
                fillPct >= 75  ? 'bg-arena-gold'  : 'bg-arena-red'
              }`}
            />
          </div>
        </div>

        {/* Player list */}
        {tournament.players && tournament.players.length > 0 && (
          <div className="mb-4 pt-3 border-t border-arena-border/50">
            <span className="block font-body text-xs text-arena-muted tracking-widest mb-2">
              PLAYERS ({tournament.players.length}/{maxPlayers})
            </span>
            <div className="space-y-1">
              {tournament.players.map((pk, i) => {
                const isMe     = connected && publicKey?.toBase58() === pk
                const isWinner = pk === proposedWinner
                return (
                  <div
                    key={pk}
                    className={`flex items-center gap-2 text-xs font-mono rounded px-1 ${
                      isWinner
                        ? 'text-arena-gold font-bold bg-arena-gold/10 py-1'
                        : isMe
                          ? 'text-arena-gold font-bold'
                          : 'text-arena-muted'
                    }`}
                  >
                    <span className="w-4 text-right opacity-50">{i + 1}.</span>
                    <span className="flex-1">{pk.slice(0, 4)}…{pk.slice(-4)}</span>
                    {isWinner && (
                      <span className="font-body text-xs tracking-widest text-arena-gold bg-arena-gold/20 px-1.5 py-0.5 rounded">
                        🏆 WINNER
                      </span>
                    )}
                    {isMe && !isWinner && (
                      <span className="font-body tracking-widest text-arena-gold">(TÚ)</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Organizer + CTA */}
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-arena-muted">
            ORG: <span className="text-arena-cyan">{organizer}</span>
          </span>
          {isOrganizer ? (
            <span className="font-display text-xs font-bold tracking-widest px-4 py-2 rounded bg-arena-gold/10 border border-arena-gold/30 text-arena-gold cursor-default">
              ⚖️ ÁRBITRO
            </span>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
              disabled={!canJoin}
              className={`font-display text-xs font-bold tracking-widest px-4 py-2 rounded transition-all duration-200 ${
                isJoined
                  ? 'bg-arena-green/20 border border-arena-green/40 text-arena-green cursor-default'
                  : canJoin
                    ? 'bg-arena-red hover:bg-arena-red/80 text-white hover:shadow-red-glow'
                    : 'bg-arena-border text-arena-muted cursor-not-allowed'
              }`}
            >
              {isJoining
                ? '⏳ JOINING…'
                : isFull
                  ? 'FULL'
                  : status === 'finished'
                    ? 'ENDED'
                    : status === 'active'
                      ? 'LIVE'
                      : isJoined
                        ? 'JOINED ✓'
                        : 'JOIN →'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function Stat({ label, value, highlight, gold }: { label: string; value: string; highlight?: boolean; gold?: boolean }) {
  return (
    <div className="bg-arena-surface border border-arena-border/50 rounded p-2 text-center">
      <span className="block font-body text-xs text-arena-muted tracking-widest">{label}</span>
      <span className={`block font-display font-semibold text-sm mt-0.5 ${
        gold ? 'text-arena-gold' : highlight ? 'text-white' : 'text-arena-text'
      }`}>
        {value}
      </span>
    </div>
  )
}

function getStreamPlatform(url?: string) {
  if (!url) return null
  if (/tiktok\.com/i.test(url)) return 'TikTok 🎵'
  if (/discord\.com/i.test(url)) return 'Discord 🎮'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube ▶️'
  if (/twitch\.tv/i.test(url)) return 'Twitch 💜'
  return 'LIVE'
}
