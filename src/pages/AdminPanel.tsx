import { useState, useCallback }                        from 'react'
import { motion, AnimatePresence }                      from 'framer-motion'
import { useWallet, useConnection, useAnchorWallet }    from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram }                     from '@solana/web3.js'
import { Buffer }                                       from 'buffer'
import { Link }                                         from 'react-router-dom'
import { useTournamentContext }                         from '../context/TournamentContext'
import { PROGRAM_ID, getProgram }                       from '../lib/anchor'
import type { Tournament }                              from '../data/tournaments'
import ConfettiEffect                                   from '../components/ConfettiEffect'

const PLATFORM_AUTHORITY = '7hUtdo1NNWLZ5Kb78H4nVDgKhFBdaey4w6k5atvtCKFL'

// ─── PlayerList deserializer ──────────────────────────────────────────────────

const PLAYER_LIST_DISC = [236, 228, 0, 20, 213, 244, 46, 92]

function playerListPDA(tournament: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player_list'), tournament.toBuffer()],
    PROGRAM_ID,
  )[0]
}

async function fetchPlayerList(
  connection: ReturnType<typeof useConnection>['connection'],
  tournamentPubkey: string,
): Promise<string[]> {
  try {
    const tPDA = new PublicKey(tournamentPubkey)
    const plPDA = playerListPDA(tPDA)
    const info = await connection.getAccountInfo(plPDA)
    if (!info) return []

    const d = info.data

    // Verify discriminator
    const disc = Array.from(d.subarray(0, 8))
    if (!disc.every((b, i) => b === PLAYER_LIST_DISC[i])) return []

    // IDL layout: 8 disc + 32 tournament + 4 vec_len + n*32 players + 1 bump
    const vecLen = d.readUInt32LE(40)
    if (vecLen === 0) return []

    const players: string[] = []
    let off = 44
    for (let i = 0; i < Math.min(vecLen, 64); i++) {
      if (off + 32 > d.length) break
      players.push(new PublicKey(d.subarray(off, off + 32)).toBase58())
      off += 32
    }
    return players
  } catch {
    return []
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { connected, publicKey } = useWallet()
  const { connection }           = useConnection()
  const anchorWallet             = useAnchorWallet()
  const { tournaments, loading, submitting, declareWinner, distributePrize, startTournamentEarly, refreshTournaments } =
    useTournamentContext()

  const [showConfetti, setShowConfetti]   = useState(false)
  const [initializing, setInitializing]   = useState(false)
  const [initResult, setInitResult]       = useState<{ ok: boolean; msg: string } | null>(null)

  const isPlatformAdmin = publicKey?.toBase58() === PLATFORM_AUTHORITY

  const handleInitialize = async () => {
    if (!anchorWallet || !publicKey) return
    setInitializing(true)
    setInitResult(null)
    try {
      const program = getProgram(anchorWallet)
      const [arenaStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('arena_state')],
        PROGRAM_ID,
      )
      const tx = await program.methods
        .initialize(publicKey, 500)
        .accounts({
          arenaState:    arenaStatePDA,
          payer:         publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      setInitResult({ ok: true, msg: `✅ ArenaState initialized! TX: ${tx.slice(0, 12)}…` })
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      setInitResult({ ok: false, msg: `❌ ${msg.length > 120 ? msg.slice(0, 120) + '…' : msg}` })
    } finally {
      setInitializing(false)
    }
  }

  const myTournaments = publicKey
    ? tournaments.filter(t => t.organizerPubkey === publicKey.toBase58())
    : []

  const handleDistribute = async (t: Tournament) => {
    const ok = await distributePrize(t)
    if (ok) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }
    return ok
  }

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-30">🔒</div>
          <h2 className="font-display font-bold text-2xl text-white tracking-widest mb-2">LOCKED</h2>
          <p className="font-body text-arena-muted text-sm">Connect your wallet to access the admin panel</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <ConfettiEffect trigger={showConfetti} />
    <div className="min-h-screen bg-arena-bg pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <span className="font-body text-xs text-arena-red tracking-[0.3em] block mb-2">
                ▶ ORGANIZER CONTROL PANEL
              </span>
              <h1 className="font-display font-bold text-4xl text-white tracking-tight">ADMIN PANEL</h1>
              <p className="font-body text-arena-muted text-sm mt-2">
                Manage your arenas, declare winners, and distribute prizes.
              </p>
            </div>

            {/* Reputation card — uses data already fetched by context */}
            {(() => {
              const rep = myTournaments[0]?.organizerReputation
              if (!rep) return null
              return (
                <div className="bg-arena-card border border-arena-gold/30 rounded p-4 min-w-[160px] text-center">
                  <div className="text-3xl mb-1">{rep.badge}</div>
                  <div className="font-display text-xs text-arena-gold tracking-widest mb-0.5">{rep.label}</div>
                  <div className="font-display text-2xl text-white font-bold">{rep.score}%</div>
                  <div className="font-body text-xs text-arena-muted mt-1">
                    {rep.paid}/{rep.created} paid
                  </div>
                </div>
              )
            })()}
          </div>
        </motion.div>

        {/* Initialize Platform — visible only to platform authority */}
        {isPlatformAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-arena-surface border border-arena-red/30 rounded p-5"
          >
            <span className="font-body text-xs text-arena-red tracking-[0.3em] block mb-1">
              ▶ PLATFORM AUTHORITY
            </span>
            <h2 className="font-display font-bold text-lg text-white tracking-wider mb-1">
              Initialize Platform
            </h2>
            <p className="font-body text-xs text-arena-muted mb-4">
              Crea el ArenaState PDA on-chain. Solo necesita ejecutarse una vez.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="font-display text-xs font-bold tracking-widest px-6 py-3 rounded transition-all duration-200 bg-arena-red hover:bg-arena-red/80 text-white disabled:opacity-50 disabled:cursor-wait"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  INITIALIZING…
                </span>
              ) : 'INITIALIZE PLATFORM ◆'}
            </button>
            {initResult && (
              <p className={`mt-3 font-body text-xs ${initResult.ok ? 'text-arena-green' : 'text-arena-red'}`}>
                {initResult.msg}
              </p>
            )}
          </motion.div>
        )}

        {/* Refresh */}
        <div className="flex justify-end mb-6">
          <button
            onClick={refreshTournaments}
            disabled={loading}
            className="font-display text-xs tracking-widest px-4 py-2 border border-arena-border rounded text-arena-muted hover:text-white hover:border-arena-border/80 transition-colors disabled:opacity-40"
          >
            {loading ? '⟳ LOADING…' : '⟳ REFRESH'}
          </button>
        </div>

        {/* Empty state */}
        {!loading && myTournaments.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 border border-dashed border-arena-border/50 rounded"
          >
            <p className="font-body text-arena-muted text-sm mb-4">You haven't created any arenas yet.</p>
            <Link
              to="/create"
              className="font-display text-xs text-arena-red border border-arena-red/30 px-4 py-2 rounded hover:bg-arena-red/10 transition-colors tracking-widest"
            >
              CREATE ARENA →
            </Link>
          </motion.div>
        )}

        {/* Tournament rows */}
        <div className="space-y-4">
          {myTournaments.map((t, i) => (
            <TournamentAdminRow
              key={t.id}
              tournament={t}
              index={i}
              submitting={submitting}
              onDeclare={declareWinner}
              onDistribute={handleDistribute}
              onStartEarly={startTournamentEarly}
              fetchPlayers={() => fetchPlayerList(connection, t.id)}
              walletPubkey={publicKey.toBase58()}
            />
          ))}
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  tournament:    Tournament
  index:         number
  submitting:    boolean
  walletPubkey:  string
  onDeclare:     (t: Tournament, winner: string) => Promise<boolean>
  onDistribute:  (t: Tournament) => Promise<boolean>
  onStartEarly:  (t: Tournament) => Promise<boolean>
  fetchPlayers:  () => Promise<string[]>
}

function TournamentAdminRow({ tournament, index, submitting, walletPubkey, onDeclare, onDistribute, onStartEarly, fetchPlayers }: RowProps) {
  const [expanded, setExpanded]       = useState(false)
  const [players, setPlayers]         = useState<string[]>([])
  const [loadingPL, setLoadingPL]     = useState(false)
  const [selectedWinner, setSelected] = useState('')

  const { title, status, playerCount, maxPlayers, prizePool, proposedWinner, registrationClosed } = tournament

  const isFull      = playerCount >= maxPlayers
  const canDeclare  = status === 'active' || (status === 'open' && isFull)
  const canStartEarly = status === 'open' && !registrationClosed && playerCount >= 2 && !isFull

  // Organizer is always players[0] but cannot win their own tournament
  const eligibleWinners = players.filter(pk => pk !== tournament.organizerPubkey)

  const loadPlayers = useCallback(async () => {
    if (players.length > 0) return
    // Use players already fetched by context when available
    if (tournament.players && tournament.players.length > 0) {
      setPlayers(tournament.players)
      const eligible = tournament.players.filter(pk => pk !== tournament.organizerPubkey)
      if (eligible.length > 0) setSelected(eligible[0])
      return
    }
    setLoadingPL(true)
    const list = await fetchPlayers()
    setPlayers(list)
    const eligible = list.filter(pk => pk !== tournament.organizerPubkey)
    if (eligible.length > 0) setSelected(eligible[0])
    setLoadingPL(false)
  }, [fetchPlayers, players.length, tournament.players, tournament.organizerPubkey])

  const handleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadPlayers()
  }

  const handleStartEarly = async () => {
    const ok = await onStartEarly(tournament)
    if (ok) setExpanded(false)
  }

  const handleDeclare = async () => {
    if (!selectedWinner) return
    const ok = await onDeclare(tournament, selectedWinner)
    if (ok) setExpanded(false)
  }

  const handleDistribute = async () => {
    await onDistribute(tournament)
  }

  const STATUS_COLORS = {
    open:     'text-arena-green border-arena-green/40 bg-arena-green/10',
    active:   'text-arena-gold  border-arena-gold/40  bg-arena-gold/10',
    finished: 'text-arena-muted border-arena-border   bg-transparent',
  }

  const truncate = (pk: string) => `${pk.slice(0, 6)}...${pk.slice(-6)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-arena-card border border-arena-border rounded overflow-hidden"
    >
      {/* Summary row */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-1 h-10 rounded-full ${
            status === 'open' ? 'bg-arena-green' : status === 'active' ? 'bg-arena-gold' : 'bg-arena-muted'
          }`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm text-white tracking-wider truncate">{title}</span>
              <span className={`font-body text-xs border px-1.5 py-0.5 rounded tracking-widest flex-shrink-0 ${STATUS_COLORS[status]}`}>
                {status.toUpperCase()}
              </span>
              {proposedWinner && (
                <span className="font-body text-xs bg-arena-gold/10 border border-arena-gold/40 text-arena-gold px-1.5 py-0.5 rounded tracking-widest flex-shrink-0">
                  WINNER SET
                </span>
              )}
            </div>
            <span className="font-body text-xs text-arena-muted">
              {playerCount}/{maxPlayers} players · {prizePool.toFixed(2)} SOL prize
            </span>
          </div>
        </div>

        <button
          onClick={handleExpand}
          className="flex-shrink-0 font-display text-xs tracking-widest px-3 py-2 border border-arena-border rounded text-arena-muted hover:text-white hover:border-arena-border/80 transition-colors"
        >
          {expanded ? 'CLOSE ▲' : 'MANAGE ▼'}
        </button>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-arena-border/60 p-4 space-y-4">

              {/* Players */}
              <div>
                <span className="font-body text-xs text-arena-muted tracking-widest block mb-2">
                  PLAYERS ({players.length})
                </span>
                {loadingPL ? (
                  <p className="font-body text-xs text-arena-muted animate-pulse">Loading players…</p>
                ) : players.length === 0 ? (
                  <p className="font-body text-xs text-arena-muted">No players yet (or PlayerList not found on chain)</p>
                ) : (
                  <div className="space-y-1">
                    {players.map((pk, i) => {
                      const isOrg = pk === tournament.organizerPubkey
                      return (
                        <div key={pk} className="flex items-center gap-3 bg-arena-surface border border-arena-border/50 rounded px-3 py-1.5">
                          <span className="font-body text-xs text-arena-muted w-4">{i + 1}.</span>
                          <span className="font-body text-xs text-arena-text font-mono flex-1 truncate">{pk}</span>
                          {isOrg && (
                            <span className="font-body text-xs text-arena-red tracking-widest">ORG</span>
                          )}
                          {!isOrg && pk === walletPubkey && (
                            <span className="font-body text-xs text-arena-cyan tracking-widest">YOU</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Proposed winner */}
              {proposedWinner && (
                <div className="bg-arena-gold/5 border border-arena-gold/30 rounded p-3">
                  <span className="font-body text-xs text-arena-gold tracking-widest block mb-1">DECLARED WINNER</span>
                  <span className="font-body text-xs text-white font-mono break-all">{proposedWinner}</span>
                </div>
              )}

              {/* Start early */}
              {canStartEarly && (
                <div className="border-t border-arena-border/40 pt-4">
                  <p className="font-body text-xs text-arena-muted mb-3">
                    El torneo no está lleno ({playerCount}/{maxPlayers}). Podés cerrar el registro ahora e iniciar con los jugadores actuales.
                  </p>
                  <button
                    onClick={handleStartEarly}
                    disabled={submitting}
                    className="w-full font-display text-xs font-bold tracking-widest py-2.5 rounded transition-all duration-200 bg-arena-cyan hover:bg-arena-cyan/80 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '⟳ PROCESANDO…' : `INICIAR CON ${playerCount} JUGADORES ◆`}
                  </button>
                </div>
              )}

              {/* Declare winner */}
              {canDeclare && !proposedWinner && (
                <div className="space-y-2">
                  <span className="font-body text-xs text-arena-muted tracking-widest block">DECLARE WINNER</span>
                  {players.length === 0 ? (
                    <p className="font-body text-xs text-arena-muted italic">Load players first</p>
                  ) : eligibleWinners.length === 0 ? (
                    <p className="font-body text-xs text-arena-muted italic">No eligible players (organizer is excluded)</p>
                  ) : (
                    <>
                      <select
                        value={selectedWinner}
                        onChange={e => setSelected(e.target.value)}
                        className="w-full bg-arena-surface border border-arena-border focus:border-arena-gold rounded px-3 py-2 font-body text-xs text-arena-text outline-none appearance-none"
                      >
                        {eligibleWinners.map(pk => (
                          <option key={pk} value={pk}>{truncate(pk)}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleDeclare}
                        disabled={submitting || !selectedWinner}
                        className="w-full font-display text-xs font-bold tracking-widest py-2.5 rounded transition-all duration-200 bg-arena-gold hover:bg-arena-gold/80 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? '⟳ PROCESSING…' : 'DECLARE WINNER ◆'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Distribute prize */}
              {proposedWinner && status !== 'finished' && (
                <div className="border-t border-arena-border/40 pt-4">
                  <p className="font-body text-xs text-arena-muted mb-3">
                    Winner declared. Distribute the prize pool: 80% winner, 15% organizer, 5% platform.
                  </p>
                  <button
                    onClick={handleDistribute}
                    disabled={submitting}
                    className="w-full font-display text-xs font-bold tracking-widest py-2.5 rounded transition-all duration-200 bg-arena-green hover:bg-arena-green/80 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '⟳ DISTRIBUTING…' : `DISTRIBUTE ${prizePool.toFixed(2)} SOL ◆`}
                  </button>
                </div>
              )}

              {/* Finished */}
              {status === 'finished' && (
                <p className="font-body text-xs text-arena-muted italic text-center py-2">
                  This arena has ended. Prizes have been distributed.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
