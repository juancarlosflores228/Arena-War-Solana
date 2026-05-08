import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import fs from 'fs'

async function main() {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const idl = JSON.parse(fs.readFileSync('./target/idl/arena_war.json', 'utf8'))
  const programId = new PublicKey(idl.address)
  const program = new anchor.Program(idl as any, provider)

  console.log('Program ID:', programId.toString())
  console.log('Authority:', provider.wallet.publicKey.toString())

  const [arenaStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('arena_state')],
    programId
  )

  console.log('ArenaState PDA:', arenaStatePDA.toString())

  try {
    const existing = await program.account['arenaState'].fetch(arenaStatePDA)
    console.log('✅ Ya inicializado!')
    console.log('   Authority:', existing.authority.toString())
    console.log('   Fee BPS:', existing.feeBps)
    return
  } catch {
    console.log('Inicializando...')
  }

  const tx = await program.methods
    .initialize(
      provider.wallet.publicKey,
      500
    )
    .accounts({ payer: provider.wallet.publicKey })
    .rpc()

  console.log('✅ Inicializado!')
  console.log('TX:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`)

  const state = await program.account['arenaState'].fetch(arenaStatePDA)
  console.log('Authority:', state.authority.toString())
  console.log('Fee BPS:', state.feeBps)
}

main().catch(console.error)
