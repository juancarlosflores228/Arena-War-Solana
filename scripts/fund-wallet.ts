import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotent,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import * as fs   from 'fs'
import * as os   from 'os'
import * as path from 'path'

const USDT_MINT    = new PublicKey('AoYQJCNabnRjWZ8WfubPuvYQ3vWp7qKXeAYE6aevCiBR')
const TARGET       = new PublicKey('CRvUFx68rB5JgYoDeqG33W817aCL6Fk9fE5RDDjYZyqc')
const DECIMALS     = 6
const AMOUNT_USDT  = 100
const MINT_AMOUNT  = AMOUNT_USDT * 10 ** DECIMALS

async function main() {
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))))
  console.log('👤 Admin (mint authority):', admin.publicKey.toBase58())
  console.log('🎯 Target wallet:         ', TARGET.toBase58())
  console.log('💵 USDT Mint:             ', USDT_MINT.toBase58())

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  // 1. Create ATA if it doesn't exist
  const ata = getAssociatedTokenAddressSync(USDT_MINT, TARGET)
  console.log('\n⏳ Creando ATA si no existe…')
  await createAssociatedTokenAccountIdempotent(
    connection,
    admin,
    USDT_MINT,
    TARGET,
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID,
  )
  console.log('🏦 ATA:', ata.toBase58())

  // 2. Mint 100 USDT
  console.log(`\n⏳ Minteando ${AMOUNT_USDT} USDT…`)
  const sig = await mintTo(
    connection,
    admin,
    USDT_MINT,
    ata,
    admin.publicKey,
    MINT_AMOUNT,
    [],
    { commitment: 'confirmed' },
  )
  console.log('✅ TX:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  // 3. Confirm final balance
  const acct = await getAccount(connection, ata)
  const balance = Number(acct.amount) / 10 ** DECIMALS
  console.log(`\n📋 Balance final: ${balance.toLocaleString()} USDT`)
  console.log('🏁 Listo!')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
