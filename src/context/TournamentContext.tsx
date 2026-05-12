import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import {
  Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import { PROGRAM_ID } from '../lib/anchor'
import type { Tournament, OrgReputation } from '../data/tournaments'

// ─── Instruction discriminators ───────────────────────────────────────────────

const DISC_CREATE       = Buffer.from([158, 137, 233, 231, 73, 132, 191, 68])
const DISC_JOIN         = Buffer.from([77,  21,  212, 206, 77,  82,  124, 31])
const DISC_DECLARE      = Buffer.from([140, 135, 197, 50,  9,   23,  4,   80])
const DISC_DISTRIB      = Buffer.from([154, 99,  201, 93,  82,  104, 73,  232])
// TODO: replace with sha256("global:start_tournament_early")[0..8] from target/idl/arena_war.json after build
const DISC_START_EARLY  = Buffer.from([0,   0,   0,   0,   0,   0,   0,   0])

// ─── Known platform accounts ──────────────────────────────────────────────────

// This is ArenaState.authority — always receives the 5% platform fee.
// Must match the value stored on-chain in the ArenaState account.
const PLATFORM_AUTHORITY = new PublicKey('7hUtdo1NNWLZ5Kb78H4nVDgKhFBdaey4w6k5atvtCKFL')

// ─── PDA helpers ──────────────────────────────────────────────────────────────

const [ARENA_STATE_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('arena_state')],
  PROGRAM_ID,
)

const tournamentPDA = (organizer: PublicKey, title: string) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from('tournament'), organizer.toBuffer(), Buffer.from(title)],
    PROGRAM_ID,
  )[0]

const playerListPDA = (tournament: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from('player_list'), tournament.toBuffer()],
    PROGRAM_ID,
  )[0]

const orgReputationPDA = (organizer: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from('org_reputation'), organizer.toBuffer()],
    PROGRAM_ID,
  )[0]

// ─── TX helper with proper blockhash + confirmation ───────────────────────────

async function sendTx(
  connection: Connection,
  wallet: AnchorWallet,
  ixs: TransactionInstruction[],
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash('confirmed')

  const tx = new Transaction()
  tx.add(...ixs)
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey

  const signed = await wallet.signTransaction(tx)

  // skipPreflight: true avoids false-negative simulation errors ("already processed")
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  })

  console.log('[arena] TX enviada:', signature)
  console.log('[arena] Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)

  // Poll getSignatureStatus instead of confirmTransaction — more reliable on devnet
  for (let i = 0; i < 30; i++) {
    const { value: status } = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    })

    if (status !== null) {
      if (status.err) {
        throw new Error(`TX fallida on-chain: ${JSON.stringify(status.err)}`)
      }
      if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
        console.log('[arena] TX confirmada ✓', signature, `(slot ${status.slot})`)
        return signature
      }
    }

    if (i > 0 && i % 5 === 0) {
      console.log(`[arena] Esperando confirmación… intento ${i}/30`)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error(
    `Timeout: TX ${signature} no confirmada en 30 s. Verificá en el Explorer si se procesó.`,
  )
}

// ─── Error parser ──────────────────────────────────────────────────────────────

function parseError(err: any): string {
  console.error('[arena] Error completo:', err)
  if (err?.logs) console.error('[arena] TX logs:', err.logs)

  const msg: string = err?.message ?? String(err)
  // Also search program logs — Anchor puts the human-readable error name there
  const logStr: string = Array.isArray(err?.logs) ? err.logs.join('\n') : ''
  const full = msg + '\n' + logStr

  if (full.includes('already processed'))
    return 'Esa TX ya fue procesada. Recargá la página e intentá de nuevo.'
  if (full.includes('OrganizerCannotJoin') || /0x1783/i.test(full))
    return 'El organizador no puede unirse a su propio torneo'
  if (full.includes('AlreadyJoined') || /0x1776/.test(msg))
    return 'Ya te uniste a este torneo'
  if (full.includes('TournamentFull') || /0x1775/.test(msg))
    return 'El torneo ya está lleno'
  if (full.includes('AlreadyInUse') || full.includes('already in use'))
    return 'Ya existe un torneo con ese título. Elegí otro nombre.'
  if (full.includes('TournamentNotActive'))
    return 'El torneo no está activo'
  if (full.includes('Unauthorized') || /0x177e/i.test(full))
    return 'Solo el organizador o el admin de la plataforma pueden distribuir premios'
  if (full.includes('WinnerNotPlayer'))
    return 'El ganador no está en la lista de jugadores'
  if (full.includes('NoWinnerDeclared'))
    return 'Primero declarar un ganador con Declare Winner'
  if (full.includes('InvalidWinner'))
    return 'La wallet conectada no coincide con el ganador declarado'
  if (full.includes('RegistrationClosed') || /0x1780/i.test(full))
    return 'El registro de este torneo ya está cerrado'
  if (full.includes('AlreadyClosed') || /0x1781/i.test(full))
    return 'El registro ya fue cerrado anteriormente'
  if (full.includes('NotEnoughPlayers') || /0x177f/i.test(full))
    return 'Se necesitan al menos 2 jugadores para iniciar anticipadamente'
  if (full.includes('TournamentAlreadyFull') || /0x1782/i.test(full))
    return 'El torneo ya está lleno, no es necesario iniciar anticipadamente'
  if (full.includes('rejected') || full.includes('WalletSignTransactionError'))
    return 'Transacción rechazada por la wallet'
  // Match exact 0x1 (lamport insufficient) — negative lookahead prevents matching 0x1776 etc.
  if (/custom program error: 0x1(?![0-9a-fA-F])/.test(msg) || full.includes('insufficient lamports'))
    return 'Fondos insuficientes (SOL para entry fee + rent de cuenta)'
  if (full.includes('Insufficient'))
    return msg
  return msg.length > 140 ? msg.slice(0, 140) + '…' : msg
}

// ─── Chain deserializer ────────────────────────────────────────────────────────

// sha256("account:Tournament")[0..8] — from arena_war.json IDL
const TOURNAMENT_DISC   = [175, 139, 119, 242, 115, 194, 57, 92]
// sha256("account:PlayerList")[0..8]
const PLAYER_LIST_DISC  = [236, 228,   0,  20, 213, 244,  46, 92]

interface ChainFetchResult {
  tournaments: Tournament[]
  joinedIds:   Set<string>  // tournament pubkeys where the wallet is a player
}

async function fetchFromChain(
  connection: Connection,
  programId:  PublicKey,
  walletPubkey: PublicKey | null,
): Promise<ChainFetchResult> {
  const allAccounts = await connection.getProgramAccounts(programId)

  // ── Parse Tournament accounts ────────────────────────────────────────────
  const tournaments: Tournament[] = allAccounts
    .filter(({ account }) => {
      const disc = Array.from(account.data.subarray(0, 8))
      return disc.every((b, i) => b === TOURNAMENT_DISC[i])
    })
    .flatMap(({ pubkey, account }) => {
      try {
        const d = account.data

        // offset 8: title length (u32 LE)
        const titleLen = d.readUInt32LE(8)
        if (titleLen < 1 || titleLen > 32) return []
        const title = d.subarray(12, 12 + titleLen).toString('utf-8')

        // Fields start immediately after title bytes (Borsh compact, NOT padded to MAX_TITLE_LEN)
        let off = 12 + titleLen

        const entryFee    = Number(d.readBigUInt64LE(off)); off += 8
        const maxPlayers  = d.readUInt8(off);               off += 1
        const playerCount = d.readUInt8(off);               off += 1
        const prizePool   = Number(d.readBigUInt64LE(off)); off += 8
        const organizer   = new PublicKey(d.subarray(off, off + 32)); off += 32
        const isActive    = d.readUInt8(off) === 1;         off += 1
        // Option<Pubkey>: 1-byte tag + 32-byte value (always present in layout)
        const hasWinner   = d.readUInt8(off) === 1;         off += 1
        const proposedWinner = hasWinner
          ? new PublicKey(d.subarray(off, off + 32)).toBase58()
          : undefined
        off += 32
        const createdAt         = Number(d.readBigInt64LE(off)); off += 8
        // skip bump (1) and completed (1)
        off += 2
        const registrationClosed = off < d.length ? d.readUInt8(off) === 1 : false

        const status: Tournament['status'] = !isActive
          ? 'finished'
          : (playerCount >= maxPlayers || registrationClosed)
            ? 'active'
            : 'open'

        const tournamentId = pubkey.toBase58()
        const savedStream = localStorage.getItem(`stream_${tournamentId}`)

        return [{
          id:              tournamentId,
          title,
          entryFee:        entryFee / 1e9,
          maxPlayers,
          playerCount,
          prizePool:       prizePool / 1e9,
          organizer:       organizer.toBase58().slice(0, 4) + '...' + organizer.toBase58().slice(-4),
          organizerPubkey: organizer.toBase58(),
          proposedWinner,
          status,
          registrationClosed,
          game:            'FPS Combat',
          createdAt:       new Date(createdAt * 1000).toLocaleDateString('es-MX'),
          likes:            0,
          dislikes:         0,
          streamUrl:       savedStream || undefined,
        }] satisfies Tournament[]
      } catch {
        return []
      }
    })

  // ── Parse PlayerList accounts — build player map + joined set in one pass ─
  const playersByTournament = new Map<string, string[]>()
  const joinedIds           = new Set<string>()
  const walletBytes         = walletPubkey?.toBuffer() ?? null

  allAccounts
    .filter(({ account }) => {
      const disc = Array.from(account.data.subarray(0, 8))
      return disc.every((b, i) => b === PLAYER_LIST_DISC[i])
    })
    .forEach(({ account }) => {
      try {
        const d = account.data
        // IDL layout: 8 disc + 32 tournament + 4 vec_len + n*32 players + 1 bump
        const tournamentKey = new PublicKey(d.subarray(8, 40)).toBase58()
        const vecLen        = d.readUInt32LE(40)
        const players: string[] = []
        let off = 44
        for (let i = 0; i < Math.min(vecLen, 64); i++) {
          if (off + 32 > d.length) break
          const playerBytes = d.subarray(off, off + 32)
          const playerKey   = new PublicKey(playerBytes).toBase58()
          players.push(playerKey)
          if (walletBytes && playerBytes.every((b, idx) => b === walletBytes[idx])) {
            joinedIds.add(tournamentKey)
          }
          off += 32
        }
        if (players.length > 0) playersByTournament.set(tournamentKey, players)
      } catch { /* skip malformed accounts */ }
    })

  // Attach player list to each tournament (no extra RPC calls needed)
  for (const t of tournaments) {
    const pl = playersByTournament.get(t.id)
    if (pl) t.players = pl
  }

  // ── Fetch OrgReputation for unique organizers (single batched RPC call) ──
  const uniqueOrgs = [...new Set(
    tournaments.map(t => t.organizerPubkey).filter((pk): pk is string => Boolean(pk)),
  )]
  if (uniqueOrgs.length > 0) {
    const repPDAs = uniqueOrgs.map(pk => orgReputationPDA(new PublicKey(pk)))
    const infos   = await connection.getMultipleAccountsInfo(repPDAs)
    const repMap  = new Map<string, OrgReputation>()

    uniqueOrgs.forEach((orgPk, i) => {
      const info = infos[i]
      if (!info) {
        repMap.set(orgPk, { created: 0, completed: 0, paid: 0, score: 0, badge: '⚠️', label: 'NEW' })
        return
      }
      const d = info.data
      // Layout: 8 disc + 32 organizer + 8 created (u64) + 8 completed (u64) + 8 score (u64) + 1 bump
      const created   = Number(d.readBigUInt64LE(40))
      const completed = Number(d.readBigUInt64LE(48))
      const repScore  = Number(d.readBigUInt64LE(56))
      const paid      = Math.floor(repScore / 10)  // +10 pts per distributed tournament
      const score     = created > 0 ? Math.round((paid / created) * 100) : 0

      let badge: OrgReputation['badge'] = '⚠️'
      let label: OrgReputation['label'] = 'RISKY'
      if (created === 0) {
        label = 'NEW'
      } else if (paid === created && created >= 2) {
        badge = '🏆'; label = 'TRUSTED'
      } else if (score >= 80) {
        badge = '🥈'; label = 'RELIABLE'
      } else if (score >= 50) {
        badge = '🥉'; label = 'FAIR'
      }

      repMap.set(orgPk, { created, completed, paid, score, badge, label })
    })

    for (const t of tournaments) {
      if (t.organizerPubkey) t.organizerReputation = repMap.get(t.organizerPubkey)
    }
  }

  return { tournaments, joinedIds }
}

// ─── Context type ──────────────────────────────────────────────────────────────

interface CreateParams {
  title:      string
  entryFee:   number
  maxPlayers: number
  game:       string
  streamUrl?: string
}

interface TournamentContextType {
  tournaments:          Tournament[]
  joinedIds:            Set<string>
  loading:              boolean
  submitting:           boolean
  refreshTournaments:   () => Promise<void>
  createTournament:     (p: CreateParams) => Promise<boolean>
  joinTournament:       (t: Tournament)   => Promise<boolean>
  startTournamentEarly: (t: Tournament)   => Promise<boolean>
  declareWinner:        (t: Tournament, winnerPubkey: string) => Promise<boolean>
  distributePrize:      (t: Tournament)   => Promise<boolean>
  likeTournament:       (id: string) => void
  dislikeTournament:    (id: string) => void
}

const TournamentContext = createContext<TournamentContextType | null>(null)

// ─── Provider ──────────────────────────────────────────────────────────────────

export function TournamentProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const anchorWallet   = useAnchorWallet()

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [joinedIds, setJoinedIds]     = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  // useRef guard prevents race-condition double-submit (setState is async, ref is sync)
  const submittingRef = useRef(false)

  // ── Fetch tournaments from chain ─────────────────────────────────────────
  const fetchOnChainTournaments = async () => {
    setLoading(true)
    try {
      const { tournaments: raw, joinedIds: joined } = await fetchFromChain(
        connection, PROGRAM_ID, anchorWallet?.publicKey ?? null,
      )
      console.log('[arena] Loaded', raw.length, 'tournaments,', joined.size, 'joined from chain')
      setTournaments(raw)
      setJoinedIds(joined)
    } catch (err) {
      console.error('[arena] fetchTournaments error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOnChainTournaments()
  // Re-fetch whenever the connected wallet changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorWallet?.publicKey?.toBase58()])

  // ── Double-submit guard ──────────────────────────────────────────────────
  function beginTx(): boolean {
    if (submittingRef.current) {
      console.warn('[arena] Double-submit prevented')
      return false
    }
    submittingRef.current = true
    setSubmitting(true)
    return true
  }
  function endTx() {
    submittingRef.current = false
    setSubmitting(false)
  }

  // ── TAREA 0: createTournament ────────────────────────────────────────────
  const createTournament = async (p: CreateParams): Promise<boolean> => {
    if (!anchorWallet) { toast.error('Conectá tu wallet primero'); return false }
    if (!beginTx()) return false

    const tid = toast.loading('Creando arena en Solana…')
    try {
      const { title, entryFee, maxPlayers } = p
      const organizer = anchorWallet.publicKey
      const feeLamports = Math.floor(entryFee * 1e9)

      console.log('[arena] createTournament →', { title, entryFee, maxPlayers, organizer: organizer.toBase58() })

      // Pre-flight balance check: creation fee (0.009 SOL) + rent for 3 PDAs (~0.015 SOL)
      const balance = await connection.getBalance(organizer)
      const needed  = 9_000_000 + Math.ceil(0.015 * 1e9)
      if (balance < needed) {
        throw new Error(`Fondos insuficientes: tenés ${(balance / 1e9).toFixed(3)} SOL, necesitás ~${(needed / 1e9).toFixed(3)} SOL`)
      }

      const tPDA  = tournamentPDA(organizer, title)
      const plPDA = playerListPDA(tPDA)
      const orPDA = orgReputationPDA(organizer)

      console.log('[arena] PDAs →', { tournament: tPDA.toBase58(), playerList: plPDA.toBase58() })

      // Serialize instruction data: discriminator + title (4-byte len + bytes) + entry_fee (u64 LE) + max_players (u8)
      const titleBuf    = Buffer.from(title)
      const titleLenBuf = Buffer.alloc(4); titleLenBuf.writeUInt32LE(titleBuf.length, 0)
      const feeBuf      = new BN(feeLamports).toArrayLike(Buffer, 'le', 8)
      const data        = Buffer.concat([DISC_CREATE, titleLenBuf, titleBuf, feeBuf, Buffer.from([maxPlayers])])

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data,
        keys: [
          { pubkey: ARENA_STATE_PDA,         isSigner: false, isWritable: true  },
          { pubkey: tPDA,                    isSigner: false, isWritable: true  },
          { pubkey: plPDA,                   isSigner: false, isWritable: true  },
          { pubkey: orPDA,                   isSigner: false, isWritable: true  },
          { pubkey: organizer,               isSigner: true,  isWritable: true  },
          { pubkey: PLATFORM_AUTHORITY,      isSigner: false, isWritable: true  },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      })

      const sig = await sendTx(connection, anchorWallet, [ix])
      toast.dismiss(tid)
      toast.success(`Arena creada! TX: ${sig.slice(0, 8)}…`)

      // Guardar streamUrl en localStorage
      if (p.streamUrl) {
        const tKey = tPDA.toBase58()
        localStorage.setItem(`stream_${tKey}`, p.streamUrl)
        console.log('[arena] Stream URL guardado:', p.streamUrl, 'para torneo:', tKey)
      }

      await fetchOnChainTournaments()
      return true
    } catch (err: any) {
      toast.dismiss(tid)
      toast.error(parseError(err))
      return false
    } finally {
      endTx()
    }
  }

  // ── TAREA 1: joinTournament ──────────────────────────────────────────────
  const joinTournament = async (t: Tournament): Promise<boolean> => {
    if (!anchorWallet) { toast.error('Conectá tu wallet primero'); return false }
    if (!t.organizerPubkey) { toast.error('Torneo inválido (sin organizerPubkey)'); return false }
    // Layer 2: context-level guard — catches stale UI state after rapid re-click
    if (joinedIds.has(t.id)) {
      toast.error('Ya te uniste a este torneo')
      return false
    }
    if (!beginTx()) return false

    const tid = toast.loading(`Uniéndose a "${t.title}"…`)
    try {
      const player = anchorWallet.publicKey
      const tPDA   = new PublicKey(t.id)
      const plPDA  = playerListPDA(tPDA)

      console.log('[arena] joinTournament →', {
        tournament: tPDA.toBase58(),
        playerList: plPDA.toBase58(),
        player: player.toBase58(),
        entryFee: t.entryFee,
      })

      // Balance check: need at least the entry fee
      const balance = await connection.getBalance(player)
      const needed  = Math.floor(t.entryFee * 1e9) + Math.ceil(0.002 * 1e9)
      if (balance < needed) {
        throw new Error(`Fondos insuficientes: tenés ${(balance / 1e9).toFixed(3)} SOL, entry fee es ${t.entryFee} SOL`)
      }

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: DISC_JOIN,
        keys: [
          { pubkey: ARENA_STATE_PDA,         isSigner: false, isWritable: true  },
          { pubkey: tPDA,                    isSigner: false, isWritable: true  },
          { pubkey: plPDA,                   isSigner: false, isWritable: true  },
          { pubkey: player,                  isSigner: true,  isWritable: true  },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      })

      const sig = await sendTx(connection, anchorWallet, [ix])
      toast.dismiss(tid)
      toast.success(`¡Te uniste a ${t.title}! TX: ${sig.slice(0, 8)}…`)
      // Optimistically mark as joined immediately so the button flips before the full refresh
      setJoinedIds(prev => new Set(prev).add(t.id))
      // Full chain refresh deferred so the TX has time to propagate
      setTimeout(() => fetchOnChainTournaments(), 1500)
      return true
    } catch (err: any) {
      toast.dismiss(tid)
      toast.error(parseError(err))
      return false
    } finally {
      endTx()
    }
  }

  // ── TAREA 3: declareWinner ───────────────────────────────────────────────
  const declareWinner = async (t: Tournament, winnerPubkey: string): Promise<boolean> => {
    if (!anchorWallet) { toast.error('Conectá tu wallet primero'); return false }
    if (!beginTx()) return false

    const tid = toast.loading('Declarando ganador…')
    try {
      const tPDA   = new PublicKey(t.id)
      const plPDA  = playerListPDA(tPDA)
      const winner = new PublicKey(winnerPubkey)

      console.log('[arena] declareWinner →', {
        tournament: tPDA.toBase58(),
        organizer: anchorWallet.publicKey.toBase58(),
        winner: winner.toBase58(),
      })

      // Arg: winner pubkey (32 bytes) serialized after discriminator
      const data = Buffer.concat([DISC_DECLARE, winner.toBuffer()])

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data,
        keys: [
          { pubkey: tPDA,                    isSigner: false, isWritable: true  },
          { pubkey: plPDA,                   isSigner: false, isWritable: false },
          { pubkey: anchorWallet.publicKey,  isSigner: true,  isWritable: false },
        ],
      })

      const sig = await sendTx(connection, anchorWallet, [ix])
      toast.dismiss(tid)
      toast.success(`Ganador declarado! TX: ${sig.slice(0, 8)}…`)
      await fetchOnChainTournaments()
      return true
    } catch (err: any) {
      toast.dismiss(tid)
      toast.error(parseError(err))
      return false
    } finally {
      endTx()
    }
  }

  // ── TAREA 4: distributePrize ─────────────────────────────────────────────
  const distributePrize = async (t: Tournament): Promise<boolean> => {
    if (!anchorWallet) { toast.error('Conectá tu wallet primero'); return false }
    if (!t.organizerPubkey) { toast.error('Torneo inválido'); return false }
    if (!t.proposedWinner)  { toast.error('Primero declarar ganador'); return false }
    if (!beginTx()) return false

    const tid = toast.loading('Distribuyendo premios…')
    try {
      const tPDA      = new PublicKey(t.id)
      const organizer = new PublicKey(t.organizerPubkey)
      const winner    = new PublicKey(t.proposedWinner)
      const orRepPDA  = orgReputationPDA(organizer)

      console.log('[arena] distributePrize →', {
        tournament:  tPDA.toBase58(),
        winner:      winner.toBase58(),
        organizer:   organizer.toBase58(),
        signer:      anchorWallet.publicKey.toBase58(),
        prizePool:   t.prizePool,
      })

      // distribute_prizes takes no args — just the discriminator.
      // signer = connected wallet (organizer OR platform admin).
      // platform_authority always receives the 5% fee regardless of who signs.
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: DISC_DISTRIB,
        keys: [
          { pubkey: ARENA_STATE_PDA,         isSigner: false, isWritable: false },
          { pubkey: tPDA,                    isSigner: false, isWritable: true  },
          { pubkey: winner,                  isSigner: false, isWritable: true  },
          { pubkey: organizer,               isSigner: false, isWritable: true  },
          { pubkey: anchorWallet.publicKey,  isSigner: true,  isWritable: true  }, // signer
          { pubkey: PLATFORM_AUTHORITY,      isSigner: false, isWritable: true  }, // always gets 5%
          { pubkey: orRepPDA,                isSigner: false, isWritable: true  },
        ],
      })

      const sig = await sendTx(connection, anchorWallet, [ix])
      toast.dismiss(tid)
      toast.success(`¡Premios distribuidos! TX: ${sig.slice(0, 8)}…`)
      await fetchOnChainTournaments()
      return true
    } catch (err: any) {
      toast.dismiss(tid)
      toast.error(parseError(err))
      return false
    } finally {
      endTx()
    }
  }

  // ── TAREA 5: startTournamentEarly ───────────────────────────────────────
  const startTournamentEarly = async (t: Tournament): Promise<boolean> => {
    if (!anchorWallet) { toast.error('Conectá tu wallet primero'); return false }
    if (!beginTx()) return false

    const tid = toast.loading(`Cerrando registro de "${t.title}"…`)
    try {
      const tPDA = new PublicKey(t.id)

      console.log('[arena] startTournamentEarly →', {
        tournament: tPDA.toBase58(),
        organizer: anchorWallet.publicKey.toBase58(),
        playerCount: t.playerCount,
      })

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        data: DISC_START_EARLY,
        keys: [
          { pubkey: tPDA,                   isSigner: false, isWritable: true  },
          { pubkey: anchorWallet.publicKey, isSigner: true,  isWritable: false },
        ],
      })

      const sig = await sendTx(connection, anchorWallet, [ix])
      toast.dismiss(tid)
      toast.success(`Registro cerrado con ${t.playerCount} jugadores! TX: ${sig.slice(0, 8)}…`)
      await fetchOnChainTournaments()
      return true
    } catch (err: any) {
      toast.dismiss(tid)
      toast.error(parseError(err))
      return false
    } finally {
      endTx()
    }
  }

  // ── Like / Dislike (local only, no chain) ────────────────────────────────
  const likeTournament = (id: string) =>
    setTournaments(prev => prev.map(t => t.id === id ? { ...t, likes: (t.likes || 0) + 1 } : t))

  const dislikeTournament = (id: string) =>
    setTournaments(prev => prev.map(t => t.id === id ? { ...t, dislikes: (t.dislikes || 0) + 1 } : t))

  return (
    <TournamentContext.Provider value={{
      tournaments,
      joinedIds,
      loading,
      submitting,
      refreshTournaments: fetchOnChainTournaments,
      createTournament,
      joinTournament,
      startTournamentEarly,
      declareWinner,
      distributePrize,
      likeTournament,
      dislikeTournament,
    }}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournamentContext must be used inside TournamentProvider')
  return ctx
}
