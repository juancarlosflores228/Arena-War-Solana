/**
 * mint-usdt-devnet.ts
 *
 * Creates a fake USDT SPL token on devnet and mints 1 000 USDT to the admin
 * wallet loaded from ~/.config/solana/id.json.
 *
 * Saves the mint address to scripts/config.json so init-partidos.ts can use it.
 *
 * Run:  npx ts-node --project tsconfig.scripts.json scripts/mint-usdt-devnet.ts
 */

import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js'
import {
  createMint,
  createAssociatedTokenAccountIdempotent,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import * as fs   from 'fs'
import * as os   from 'os'
import * as path from 'path'

const DECIMALS    = 6
const MINT_AMOUNT = 1_000 * 10 ** DECIMALS   // 1 000 USDT

async function main() {
  // ── Load admin keypair ─────────────────────────────────────────────────────
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (!fs.existsSync(keypairPath)) {
    console.error('❌ No se encontró la keypair en', keypairPath)
    console.error('   Generá una con: solana-keygen new --no-bip39-passphrase')
    process.exit(1)
  }
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
  const admin = Keypair.fromSecretKey(Uint8Array.from(secretKey))

  console.log('👤 Admin:', admin.publicKey.toBase58())

  // ── Connect to devnet ──────────────────────────────────────────────────────
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  const lamports = await connection.getBalance(admin.publicKey)
  console.log(`💰 Balance: ${(lamports / 1e9).toFixed(4)} SOL`)

  if (lamports < 0.05 * 1e9) {
    console.log('⏳ Solicitando airdrop de 2 SOL en devnet…')
    const sig = await connection.requestAirdrop(admin.publicKey, 2e9)
    await connection.confirmTransaction(sig, 'confirmed')
    console.log('✅ Airdrop recibido')
  }

  // ── Resolve or create the USDT mint ───────────────────────────────────────
  const configPath = path.join(__dirname, 'config.json')
  let config: Record<string, string> = {}

  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  }

  let usdtMintStr: string

  if (config.usdtMint) {
    usdtMintStr = config.usdtMint
    console.log('ℹ️  Usando mint existente:', usdtMintStr)
  } else {
    console.log('⏳ Creando nuevo SPL mint (USDT falso, 6 decimales)…')
    const mint = await createMint(
      connection,
      admin,              // payer
      admin.publicKey,    // mintAuthority
      null,               // freezeAuthority (none)
      DECIMALS,
      undefined,          // keypair (auto-generate)
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID,
    )
    usdtMintStr = mint.toBase58()
    console.log('✅ USDT Mint creado:', usdtMintStr)

    config.usdtMint = usdtMintStr
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('💾 Mint guardado en scripts/config.json')
  }

  const { PublicKey } = await import('@solana/web3.js')
  const usdtMint = new PublicKey(usdtMintStr)

  // ── Create (or reuse) admin's ATA ─────────────────────────────────────────
  const ata = getAssociatedTokenAddressSync(usdtMint, admin.publicKey)

  // createAssociatedTokenAccountIdempotent doesn't fail if the account exists
  await createAssociatedTokenAccountIdempotent(
    connection,
    admin,
    usdtMint,
    admin.publicKey,
    { commitment: 'confirmed' },
  )
  console.log('🏦 Admin ATA:', ata.toBase58())

  // ── Mint 1 000 USDT ───────────────────────────────────────────────────────
  const sig = await mintTo(
    connection,
    admin,
    usdtMint,
    ata,
    admin.publicKey,
    MINT_AMOUNT,
    [],
    { commitment: 'confirmed' },
  )

  const acct = await getAccount(connection, ata)
  const balanceUsdt = Number(acct.amount) / 10 ** DECIMALS

  console.log(`\n✅ 1 000 USDT minteados!`)
  console.log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`)
  console.log(`\n📋 Resumen`)
  console.log(`   USDT Mint : ${usdtMintStr}`)
  console.log(`   Admin ATA : ${ata.toBase58()}`)
  console.log(`   Balance   : ${balanceUsdt.toLocaleString()} USDT`)
  console.log(`\n¡Listo! Ahora podés correr init-partidos.ts`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
