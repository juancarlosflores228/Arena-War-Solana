/**
 * init-partidos.ts
 *
 * Calls inicializar() and crear_partido() on the arena_war_mundial program
 * for the 6 matches of Grupo A (Mundial 2026).
 *
 * Requires scripts/config.json with { "usdtMint": "..." }.
 * Run mint-usdt-devnet.ts first if config.json doesn't exist yet.
 *
 * Run:  npx ts-node --project tsconfig.scripts.json scripts/init-partidos.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as fs   from 'fs'
import * as os   from 'os'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey('5xkEnY6QthFiXSpqCMwBFPVrZNguAWdbcMEJxNKZuZRZ')

// Grupo A — matches from mundial2026.ts
const GRUPO_A = [
  { id: 1,  local: 'México',        visita: 'Sudáfrica',     fecha: '2026-06-11T19:00:00Z' },
  { id: 2,  local: 'Corea del Sur', visita: 'Chequia',       fecha: '2026-06-12T02:00:00Z' },
  { id: 25, local: 'Chequia',       visita: 'Sudáfrica',     fecha: '2026-06-18T16:00:00Z' },
  { id: 28, local: 'México',        visita: 'Corea del Sur', fecha: '2026-06-19T01:00:00Z' },
  { id: 53, local: 'Chequia',       visita: 'México',        fecha: '2026-06-25T01:00:00Z' },
  { id: 54, local: 'Sudáfrica',     visita: 'Corea del Sur', fecha: '2026-06-25T01:00:00Z' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function idBuf(id: number): Buffer {
  return new BN(id).toArrayLike(Buffer, 'le', 8)
}

function partidoPda(id: number): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('partido'), idBuf(id)], PROGRAM_ID)[0]
}

function vaultPda(id: number): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), idBuf(id)], PROGRAM_ID)[0]
}

function statePda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID)[0]
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── Load admin keypair ───────────────────────────────────────────────────
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(keypairPath)) {
    console.error('❌ No se encontró la keypair en', keypairPath)
    process.exit(1)
  }
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
  const admin = Keypair.fromSecretKey(Uint8Array.from(secretKey))
  console.log('👤 Admin:', admin.publicKey.toBase58())

  // ── Load USDT mint from config ───────────────────────────────────────────
  const configPath = path.join(__dirname, 'config.json')
  if (!fs.existsSync(configPath)) {
    console.error('❌ No se encontró scripts/config.json')
    console.error('   Corrí primero: npx ts-node --project tsconfig.scripts.json scripts/mint-usdt-devnet.ts')
    process.exit(1)
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  if (!config.usdtMint) {
    console.error('❌ config.json no tiene "usdtMint". Corré mint-usdt-devnet.ts primero.')
    process.exit(1)
  }
  const usdtMint = new PublicKey(config.usdtMint)
  console.log('💵 USDT Mint:', usdtMint.toBase58())

  // ── Connect and build Program ────────────────────────────────────────────
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  const lamports = await connection.getBalance(admin.publicKey)
  console.log(`💰 Balance: ${(lamports / 1e9).toFixed(4)} SOL`)
  if (lamports < 0.05 * 1e9) {
    console.error('❌ Balance insuficiente para gas. Pedí un airdrop primero:')
    console.error('   solana airdrop 2 --url devnet')
    process.exit(1)
  }

  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'arena_war_mundial.json')
  const idlRaw  = JSON.parse(fs.readFileSync(idlPath, 'utf8'))
  const IDL     = { ...idlRaw, address: PROGRAM_ID.toBase58() }

  const wallet   = new Wallet(admin)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' })
  const program  = new Program(IDL, provider)

  const STATE_PDA = statePda()
  console.log('📦 State PDA:', STATE_PDA.toBase58())

  // ── 1. Inicializar state (idempotent) ────────────────────────────────────
  let stateExists = false
  try {
    await (program.account as any).arenaWarState.fetch(STATE_PDA)
    stateExists = true
  } catch { /* account doesn't exist yet */ }

  if (stateExists) {
    console.log('✅ State ya estaba inicializado')
  } else {
    console.log('⏳ Inicializando state global…')
    const tx = await (program.methods as any)
      .inicializar(admin.publicKey)
      .accounts({
        state: STATE_PDA,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    console.log('✅ State inicializado!')
    console.log('   TX:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`)
  }

  // ── 2. Crear partidos Grupo A ────────────────────────────────────────────
  console.log('\n⚽ Creando partidos Grupo A…\n')

  let creados = 0
  let existentes = 0

  for (const match of GRUPO_A) {
    const label   = `${match.local} vs ${match.visita}`
    const poolPda = partidoPda(match.id)
    const vaultAcc = vaultPda(match.id)

    // Check if already exists
    let exists = false
    try {
      await (program.account as any).partidoPool.fetch(poolPda)
      exists = true
    } catch { /* doesn't exist */ }

    if (exists) {
      console.log(`⏭️  Partido ${String(match.id).padStart(2)} — ${label} [ya existe]`)
      existentes++
      continue
    }

    const inicioUnix = new BN(Math.floor(new Date(match.fecha).getTime() / 1000))

    try {
      const tx = await (program.methods as any)
        .crearPartido(new BN(match.id), inicioUnix, label)
        .accounts({
          state:        STATE_PDA,
          partidoPool:  poolPda,
          vault:        vaultAcc,
          usdtMint,
          admin:        admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent:         SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      console.log(`✅ Partido ${String(match.id).padStart(2)} — ${label}`)
      console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`)
      creados++
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      // AlreadyInUse means the account was created in a concurrent run — treat as success
      if (msg.includes('already in use') || msg.includes('AlreadyInUse')) {
        console.log(`⏭️  Partido ${String(match.id).padStart(2)} — ${label} [ya existe]`)
        existentes++
      } else {
        console.error(`❌ Partido ${match.id} — ${label}`)
        console.error('   ', msg)
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Creados:    ${creados}`)
  console.log(`⏭️  Existentes: ${existentes}`)
  console.log(`📦 Total:      ${GRUPO_A.length}`)
  console.log('\n🏁 Done! Los partidos del Grupo A están listos en devnet.')
  console.log('   Podés ver el estado en: https://explorer.solana.com/address/' + STATE_PDA.toBase58() + '?cluster=devnet')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
