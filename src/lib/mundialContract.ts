import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import type { Pick } from '../data/mundial2026'
import IDL_JSON from '../../target/idl/arena_war_mundial.json'

// ─── Constants ───────────────────────────────────────────────────────────────

export const MUNDIAL_PROGRAM_ID = new PublicKey('5xkEnY6QthFiXSpqCMwBFPVrZNguAWdbcMEJxNKZuZRZ')

const NETWORK = clusterApiUrl('devnet')
export const MUNDIAL_CONNECTION = new Connection(NETWORK, 'confirmed')

// Override the IDL address so the Anchor Program targets the devnet deployment
const IDL = { ...(IDL_JSON as any), address: MUNDIAL_PROGRAM_ID.toBase58() }

// Read-only provider — used for account fetches that don't require signing
const READ_ONLY_PROVIDER = new AnchorProvider(
  MUNDIAL_CONNECTION,
  {
    publicKey: new PublicKey('11111111111111111111111111111111'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any) => txs,
  } as AnchorWallet,
  { commitment: 'confirmed' }
)

// Single read-only Program instance reused across all read calls
const READ_PROGRAM = new Program(IDL, READ_ONLY_PROVIDER)

// ─── Public types ─────────────────────────────────────────────────────────────

export interface OnChainPoolData {
  /** Total USDT in the pool (whole units, e.g. 12.5 = 12.5 USDT) */
  total: number
  local: number
  empate: number
  visita: number
  estado: 'abierto' | 'cerrado' | 'finalizado' | 'cancelado'
  resultado: 'pendiente' | 'local' | 'empate' | 'visita'
}

export interface OnChainApuesta {
  /** Bet amount in whole USDT */
  monto: number
  seleccion: 'local' | 'empate' | 'visita' | 'pendiente'
  reclamado: boolean
}

// ─── PDA derivation ───────────────────────────────────────────────────────────

function idBuf(partidoId: number): Buffer {
  return new BN(partidoId).toArrayLike(Buffer, 'le', 8)
}

function partidoPda(partidoId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('partido'), idBuf(partidoId)],
    MUNDIAL_PROGRAM_ID
  )[0]
}

function vaultPda(partidoId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), idBuf(partidoId)],
    MUNDIAL_PROGRAM_ID
  )[0]
}

function apuestaPda(usuario: PublicKey, partidoId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('apuesta'), usuario.toBuffer(), idBuf(partidoId)],
    MUNDIAL_PROGRAM_ID
  )[0]
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildProgram(wallet: AnchorWallet): Program {
  const provider = new AnchorProvider(MUNDIAL_CONNECTION, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  return new Program(IDL, provider)
}

function pickToEnum(pick: Pick): object {
  if (pick === 'local')  return { local: {} }
  if (pick === 'empate') return { empate: {} }
  return { visita: {} }
}

async function getUserAta(wallet: AnchorWallet, partidoId: number): Promise<PublicKey> {
  const vault = vaultPda(partidoId)
  const vaultAcc = await getAccount(MUNDIAL_CONNECTION, vault)
  return getAssociatedTokenAddress(vaultAcc.mint, wallet.publicKey)
}

function normalizeEstado(e: any): OnChainPoolData['estado'] {
  if ('abierto' in e)    return 'abierto'
  if ('cerrado' in e)    return 'cerrado'
  if ('finalizado' in e) return 'finalizado'
  return 'cancelado'
}

function normalizeResultado(r: any): OnChainApuesta['seleccion'] {
  if ('local' in r)  return 'local'
  if ('empate' in r) return 'empate'
  if ('visita' in r) return 'visita'
  return 'pendiente'
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a bet on-chain.
 * @param wallet     Connected AnchorWallet (from useAnchorWallet)
 * @param partidoId  Numeric match ID (1–104)
 * @param pick       'local' | 'empate' | 'visita'
 * @param montoUsdt  Amount in whole USDT (e.g. 5 = 5 USDT = 5_000_000 micro-units)
 * @returns          Transaction signature
 */
export async function apostar(
  wallet: AnchorWallet,
  partidoId: number,
  pick: Pick,
  montoUsdt: number
): Promise<string> {
  const program = buildProgram(wallet)
  const monto = new BN(Math.round(montoUsdt * 1_000_000))
  const userTokenAccount = await getUserAta(wallet, partidoId)

  return (program.methods as any)
    .apostar(new BN(partidoId), pickToEnum(pick), monto)
    .accounts({ userTokenAccount, usuario: wallet.publicKey })
    .rpc()
}

/**
 * Fetch live pool data for a match from the blockchain.
 * Returns null if the match hasn't been created on-chain yet.
 */
export async function getPoolData(partidoId: number): Promise<OnChainPoolData | null> {
  try {
    const raw = await (READ_PROGRAM.account as any).partidoPool.fetch(partidoPda(partidoId))
    return {
      total:     raw.totalApostado.toNumber() / 1_000_000,
      local:     raw.poolLocal.toNumber()     / 1_000_000,
      empate:    raw.poolEmpate.toNumber()    / 1_000_000,
      visita:    raw.poolVisita.toNumber()    / 1_000_000,
      estado:    normalizeEstado(raw.estado),
      resultado: normalizeResultado(raw.resultado),
    }
  } catch {
    return null
  }
}

/**
 * Fetch the on-chain bet record for a user on a specific match.
 * Returns null if no bet was placed.
 */
export async function getMiApuesta(
  wallet: AnchorWallet,
  partidoId: number
): Promise<OnChainApuesta | null> {
  try {
    const raw = await (READ_PROGRAM.account as any).apuesta.fetch(
      apuestaPda(wallet.publicKey, partidoId)
    )
    return {
      monto:     raw.monto.toNumber() / 1_000_000,
      seleccion: normalizeResultado(raw.seleccion),
      reclamado: raw.reclamado,
    }
  } catch {
    return null
  }
}

/**
 * Claim parimutuel winnings for a finalized match.
 * @returns Transaction signature
 */
export async function reclamarGanancias(
  wallet: AnchorWallet,
  partidoId: number
): Promise<string> {
  const program = buildProgram(wallet)
  const userTokenAccount = await getUserAta(wallet, partidoId)

  return (program.methods as any)
    .reclamarGanancias(new BN(partidoId))
    .accounts({ userTokenAccount, usuario: wallet.publicKey })
    .rpc()
}
