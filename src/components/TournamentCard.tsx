import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence }      from 'framer-motion'
import { useWallet }                    from '@solana/wallet-adapter-react'
import { useArenaToast }                from '../hooks/useToast'
import { useTournamentContext }         from '../context/TournamentContext'
import { useSolPrice }                  from '../hooks/useSolPrice'
import type { Tournament } from '../data/tournaments'

/* ───────────────────────── Age formatter (pump.fun style) ───────────────────────── */
function formatAge(createdAtTs: number): string {
  const diffMs  = Date.now() - createdAtTs * 1000
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)
  if (diffMin  < 1)  return `${diffSec}s`
  if (diffHrs  < 1)  return `${diffMin}m`
  if (diffDays < 1)  return `${diffHrs}h ${diffMin % 60}m`
  if (diffDays < 3)  return `${diffDays}d ${diffHrs % 24}h ${diffMin % 60}m`
  return `${diffDays}d`
}

/* ───────────────────────── Egg SVG — cracks as tournament ages ───────────────────────── */
function EggAge({ createdAtTs }: { createdAtTs: number }) {
  const valid        = createdAtTs > 100_000   // unix ts válido (no es 0 ni basura)
  const ageDays      = valid ? (Date.now() - createdAtTs * 1000) / (1000 * 60 * 60 * 24) : 0
  const crackPct     = Math.min(100, (ageDays / 3) * 100)
  const cracked      = crackPct > 60
  const forgotten    = ageDays >= 10
  const age          = valid ? formatAge(createdAtTs) : 'nuevo'

  return (
    <div className="flex items-center gap-1">
      <svg width="18" height="21" viewBox="0 0 52 60" fill="none" style={{ filter: cracked ? 'drop-shadow(0 0 4px rgba(255,200,50,0.6))' : undefined }}>
        <path
          d="M26 4C14 4 4 18 4 34C4 47 14 56 26 56C38 56 48 47 48 34C48 18 38 4 26 4Z"
          fill={cracked ? '#f5c842' : '#f0e6c8'}
          stroke={cracked ? '#c8960a' : '#c8b080'}
          strokeWidth="1.5"
        />
        {crackPct > 20 && (
          <path
            d="M22 28 L25 33 L21 38 L26 44 L30 38 L27 33 L30 28"
            stroke={cracked ? '#8B6000' : '#b09060'}
            strokeWidth={cracked ? 2 : 1.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={Math.min(1, crackPct / 60)}
          />
        )}
        {crackPct > 40 && (
          <>
            <path d="M25 33 L18 31" stroke="#8B6000" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M27 33 L34 35" stroke="#8B6000" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
          </>
        )}
        <ellipse cx="19" cy="20" rx="4" ry="6" fill="white" opacity="0.2" transform="rotate(-15 19 20)" />
        {cracked && (
          <>
            <circle cx="22" cy="36" r="2" fill="#333" />
            <circle cx="30" cy="36" r="2" fill="#333" />
            <circle cx="22.8" cy="35.2" r="0.7" fill="white" />
            <circle cx="30.8" cy="35.2" r="0.7" fill="white" />
            <path d="M22 41 Q26 44 30 41" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="font-mono text-[10px] text-arena-muted/70">{age}</span>
      {forgotten && <span title="En el olvido...">🕸️</span>}
    </div>
  )
}

const STATUS_CONFIG = {
  open:     { label: 'OPEN 🔥',  color: 'text-arena-green  border-arena-green/40  bg-arena-green/10'  },
  active:   { label: 'LIVE',     color: 'text-arena-gold   border-arena-gold/40   bg-arena-gold/10'   },
  finished: { label: 'ENDED',    color: 'text-arena-muted  border-arena-border    bg-arena-border/40' },
}

interface Props {
  tournament: Tournament
  index:      number
}

/* ───────────────────────── Animated number (prize pool count-up) ───────────────────────── */
function useAnimatedNumber(target: number, duration = 800) {
  const [display, setDisplay]  = useState(target)
  const prevRef                = useRef(target)
  const rafRef                 = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    if (from === target) return
    prevRef.current = target
    const start = performance.now()

    const tick = (now: number) => {
      const t      = Math.min((now - start) / duration, 1)
      const eased  = 1 - Math.pow(1 - t, 3)            // easeOutCubic
      setDisplay(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return display
}

/* ───────────────────────── Circuit-style corner decoration ───────────────────────── */
function CircuitCorner({ position, color }: { position: 'tr' | 'bl'; color: string }) {
  const isTR = position === 'tr'
  return (
    <svg
      className={`pointer-events-none absolute w-12 h-12 transition-all duration-500 ${
        isTR ? 'top-0 right-0' : 'bottom-0 left-0 rotate-180'
      } ${color}`}
      viewBox="0 0 48 48"
      fill="none"
    >
      {/* outer L-frame */}
      <path d="M14 2 H46 V34" stroke="currentColor" strokeWidth="2" />
      {/* inner trace */}
      <path d="M24 8 H40 V24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* circuit nodes */}
      <circle cx="14" cy="2"  r="2" fill="currentColor" />
      <circle cx="46" cy="34" r="2" fill="currentColor" />
      <circle cx="24" cy="8"  r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="24" r="1.5" fill="currentColor" opacity="0.6" />
      {/* stub traces */}
      <path d="M14 2 V10 M46 34 H38" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}

export default function TournamentCard({ tournament, index }: Props) {
  const { connected, publicKey } = useWallet()
  const toast          = useArenaToast()
  const { joinTournament, submitting, joinedIds, likeTournament, dislikeTournament } = useTournamentContext()
  const { price: solPrice } = useSolPrice()

  // Layer 1: local UI guard with 2-second cooldown after any attempt
  const [isJoining, setIsJoining]           = useState(false)
  const [showAllPlayers, setShowAllPlayers] = useState(false)
  const [showEmbed, setShowEmbed]           = useState(false)

  const { title, entryFee, maxPlayers, playerCount, prizePool, organizer, status, game, likes, dislikes, streamUrl, organizerReputation, proposedWinner, isLiveUpdating } = tournament
  const vote        = localStorage.getItem(`vote_${tournament.id}`)
  const fillPct     = (playerCount / maxPlayers) * 100
  const cfg         = STATUS_CONFIG[status]
  const isFull      = playerCount >= maxPlayers
  const isJoined    = joinedIds.has(tournament.id)
  const isOrganizer = connected && publicKey != null && tournament.organizerPubkey != null
    ? publicKey.toBase58() === tournament.organizerPubkey
    : false
  const canJoin  = status === 'open' && !isFull && !submitting && !isJoined && !isJoining && !isOrganizer

  /* Prize pool count-up animation */
  const animatedPrize = useAnimatedNumber(prizePool)

  /* Live-update pulse — green outer border for 2 seconds */
  const [livePulse, setLivePulse] = useState(false)
  useEffect(() => {
    if (!isLiveUpdating) return
    setLivePulse(true)
    const t = setTimeout(() => setLivePulse(false), 2000)
    return () => clearTimeout(t)
  }, [isLiveUpdating, playerCount, prizePool])

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
      whileHover={{ y: -4 }}
      className="group relative bg-arena-card border border-arena-border rounded overflow-hidden shadow-card transition-all duration-300 hover:border-arena-red/70 hover:shadow-[0_0_24px_rgba(229,32,46,0.35),0_0_60px_rgba(229,32,46,0.12)]"
    >
      {/* Hover glow halo */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top,rgba(229,32,46,0.10),transparent_60%)]" />

      {/* Live-update green pulse overlay (2s) */}
      <AnimatePresence>
        {livePulse && (
          <motion.div
            key="live-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-0 z-20 rounded border-2 border-arena-green shadow-[0_0_18px_rgba(0,255,135,0.55),inset_0_0_18px_rgba(0,255,135,0.15)]"
          />
        )}
      </AnimatePresence>

      {/* Top accent bar — pulses softly when open + has players */}
      {canJoin && playerCount > 0 ? (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-arena-red via-arena-gold to-arena-red group-hover:shadow-red-glow"
        />
      ) : (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-300 ${
            canJoin ? 'bg-arena-red group-hover:shadow-red-glow' : 'bg-arena-border'
          }`}
        />
      )}

      {/* Circuit corner decorations */}
      <CircuitCorner position="tr" color="text-arena-red/25 group-hover:text-arena-red/80" />
      <CircuitCorner position="bl" color="text-arena-border group-hover:text-arena-cyan/50" />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-body text-xs text-arena-muted tracking-widest">{game}</span>
              <EggAge createdAtTs={tournament.createdAtTs} />
            </div>
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
            ) : status === 'open' ? (
              <motion.span
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(0,255,135,0)',
                    '0 0 14px rgba(0,255,135,0.55)',
                    '0 0 0px rgba(0,255,135,0)',
                  ],
                  scale: [1, 1.04, 1],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className={`font-body text-xs px-2 py-0.5 rounded border tracking-widest ${cfg.color}`}
              >
                {cfg.label}
              </motion.span>
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
            initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-4 overflow-hidden bg-gradient-to-br from-arena-gold/25 via-arena-gold/10 to-transparent border-l-4 border-arena-gold rounded-r-lg p-3 shadow-[inset_0_0_30px_rgba(245,158,11,0.08)]"
          >
            {/* reveal shimmer sweep */}
            <motion.div
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ delay: 0.25, duration: 1, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-arena-gold/20 to-transparent skew-x-12"
            />

            {/* Winner address */}
            <div className="mb-3">
              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="font-body text-xs text-arena-gold tracking-widest block mb-1"
              >
                🏆 WINNER
              </motion.span>
              <p className="font-mono text-xs text-white truncate mb-1">
                {proposedWinner.slice(0, 8)}…{proposedWinner.slice(-8)}
              </p>
              <a
                href={`https://solscan.io/account/${proposedWinner}?cluster=mainnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-arena-gold/70 hover:text-arena-gold underline flex items-center gap-1 transition-colors"
              >
                Ver en Solscan ↗
              </a>
            </div>

            {/* Prize breakdown — ROI style */}
            <div className="border-t border-arena-gold/20 pt-2 space-y-2">

              {/* Winner ROI */}
              {(() => {
                const winnerRoi = entryFee > 0
                  ? (((prizePool * 0.8) - entryFee) / entryFee * 100).toFixed(0)
                  : '—'
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="bg-arena-surface/60 border border-arena-green/20 rounded p-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-xs text-arena-gold tracking-widest">🏆 WINNER ROI</span>
                      <span className="font-display text-sm font-bold text-arena-green">+{winnerRoi}%</span>
                    </div>
                    <div className="font-body text-xs flex items-center gap-1.5">
                      <span className="text-arena-muted">Invirtió</span>
                      <span className="text-white font-semibold">${(entryFee * solPrice).toFixed(2)}</span>
                      <span className="text-arena-border mx-0.5">→</span>
                      <span className="text-arena-gold font-bold">${(prizePool * 0.8 * solPrice).toFixed(2)}</span>
                      <span className="text-arena-muted/50 text-[10px]">ganado</span>
                    </div>
                  </motion.div>
                )
              })()}

              {/* Organizer earnings */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex items-center justify-between px-1"
              >
                <span className="font-body text-xs text-arena-muted tracking-widest">👤 Organizador</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm text-arena-cyan font-bold">
                    +${(prizePool * 0.15 * solPrice).toFixed(2)}
                  </span>
                  <span className="font-body text-[10px] text-arena-muted/60">por organizar</span>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="ENTRY" value={`${entryFee} SOL`} highlight />
          <Stat label="PRIZE" value={`${animatedPrize.toFixed(3)} SOL`} gold />
          <Stat
            label="SLOTS"
            value={isFull ? '🔥 FULL' : `${playerCount}/${maxPlayers}`}
            danger={isFull}
          />
        </div>

        {/* ROI — solo torneos abiertos o en vivo */}
        {status !== 'finished' && entryFee > 0 && (() => {
          const maxWin   = maxPlayers * entryFee * 0.8
          const roi      = ((maxWin - entryFee) / entryFee) * 100
          const entryUSD = (entryFee * solPrice).toFixed(2)
          const winUSD   = (maxWin   * solPrice).toFixed(2)
          return (
            <div className="flex items-center justify-between mb-4 bg-arena-surface border border-arena-green/20 rounded px-3 py-2">
              <div className="font-body text-xs flex items-center gap-1.5">
                <span className="text-arena-muted">Metes</span>
                <span className="text-white font-semibold">${entryUSD}</span>
                <span className="text-arena-border">→</span>
                <span className="text-arena-gold font-bold">${winUSD}</span>
                <span className="text-arena-muted/60 text-[10px]">si ganas</span>
              </div>
              <motion.span
                animate={{
                  textShadow: [
                    '0 0 4px rgba(0,255,135,0.3)',
                    '0 0 12px rgba(0,255,135,0.9), 0 0 24px rgba(0,255,135,0.4)',
                    '0 0 4px rgba(0,255,135,0.3)',
                  ],
                  opacity: [0.85, 1, 0.85],
                }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="font-display text-sm font-bold tracking-wider text-arena-green whitespace-nowrap"
              >
                +{roi.toFixed(0)}% ROI
              </motion.span>
            </div>
          )
        })()}

        {streamUrl && (() => {
          const ytId     = getYouTubeId(streamUrl)
          const twCh     = getTwitchChannel(streamUrl)
          const canEmbed = !!(ytId || twCh)
          const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

          const embedSrc = ytId
            ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&rel=0`
            : twCh
              ? `https://player.twitch.tv/?channel=${twCh}&parent=${hostname}&autoplay=true&muted=true`
              : ''

          return (
            <div className="mb-4">
              {/* Botón toggle */}
              <button
                type="button"
                onClick={() => canEmbed ? setShowEmbed(p => !p) : window.open(streamUrl, '_blank')}
                className="inline-flex items-center gap-2 rounded-full bg-arena-red px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-arena-red/90"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>EN VIVO {streamPlatform ?? 'LIVE'}</span>
                {canEmbed && (
                  <span className="opacity-70">{showEmbed ? '▲' : '▼'}</span>
                )}
              </button>

              {/* Iframe embed — YouTube o Twitch */}
              {canEmbed && showEmbed && (
                <div className="mt-2 rounded-lg border border-arena-border overflow-hidden">
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%' }}>
                    <iframe
                      src={embedSrc}
                      title="Stream en vivo"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })()}

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
            {isFull ? (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                className="font-bold text-arena-red tracking-widest"
              >
                🔥 FULL
              </motion.span>
            ) : (
              <span>{Math.round(fillPct)}%</span>
            )}
          </div>
          <div className="relative h-2.5 bg-arena-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ delay: index * 0.07 + 0.3, duration: 1.2, type: 'spring', stiffness: 60, damping: 14 }}
              className={`relative h-full rounded-full ${
                fillPct >= 100 ? 'bg-arena-green shadow-[0_0_10px_rgba(0,255,135,0.6)]' :
                fillPct >= 75  ? 'bg-gradient-to-r from-arena-red to-arena-gold shadow-[0_0_10px_rgba(245,158,11,0.45)]' :
                'bg-arena-red'
              }`}
            >
              {/* moving shine inside the filled bar */}
              {fillPct > 0 && fillPct < 100 && (
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* Player list */}
        {tournament.players && tournament.players.length > 0 && (() => {
          const LIMIT        = 10
          const allPlayers   = tournament.players
          const visible      = showAllPlayers ? allPlayers : allPlayers.slice(0, LIMIT)
          const hiddenCount  = allPlayers.length - LIMIT

          return (
            <div className="mb-4 pt-3 border-t border-arena-border/50">
              <span className="block font-body text-xs text-arena-muted tracking-widest mb-2">
                PLAYERS ({allPlayers.length}/{maxPlayers})
              </span>
              <div className="space-y-1">
                {visible.map((pk, i) => {
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

              {/* Mostrar más / Mostrar menos */}
              {allPlayers.length > LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllPlayers(p => !p)}
                  className="mt-2 w-full font-body text-xs text-arena-cyan hover:text-white border border-arena-border hover:border-arena-cyan/50 rounded py-1.5 transition-all duration-200"
                >
                  {showAllPlayers
                    ? '▲ Mostrar menos'
                    : `▼ Ver ${hiddenCount} jugador${hiddenCount !== 1 ? 'es' : ''} más`}
                </button>
              )}
            </div>
          )
        })()}

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

function Stat({ label, value, highlight, gold, danger }: { label: string; value: string; highlight?: boolean; gold?: boolean; danger?: boolean }) {
  return (
    <div className={`bg-arena-surface border rounded p-2 text-center ${
      danger ? 'border-arena-red/40' : 'border-arena-border/50'
    }`}>
      <span className="block font-body text-xs text-arena-muted tracking-widest">{label}</span>
      {danger ? (
        <motion.span
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          className="block font-display font-semibold text-sm mt-0.5 text-arena-red"
        >
          {value}
        </motion.span>
      ) : (
        <span className={`block font-display font-semibold text-sm mt-0.5 ${
          gold ? 'text-arena-gold' : highlight ? 'text-white' : 'text-arena-text'
        }`}>
          {value}
        </span>
      )}
    </div>
  )
}

function getStreamPlatform(url?: string) {
  if (!url) return null
  if (/tiktok\.com/i.test(url))          return 'TikTok 🎵'
  if (/discord\.com/i.test(url))         return 'Discord 🎮'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube ▶️'
  if (/twitch\.tv/i.test(url))           return 'Twitch 💜'
  return 'LIVE'
}

/** Extrae el video ID de cualquier formato de URL de YouTube */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,          // watch?v=
    /youtu\.be\/([A-Za-z0-9_-]{11})/,      // youtu.be/
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/, // /live/
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/, // /embed/
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/** Extrae el nombre del canal de Twitch */
function getTwitchChannel(url: string): string | null {
  const m = url.match(/twitch\.tv\/([A-Za-z0-9_]+)/i)
  return m ? m[1] : null
}
