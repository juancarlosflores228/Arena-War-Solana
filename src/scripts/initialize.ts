import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { IDL, PROGRAM_ID } from '../lib/anchor'
import fs from 'fs'
import os from 'os'

async function main() {
  // Carga tu keypair local
  const keypairPath = `${os.homedir()}/.config/solana/id.json`
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey))

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const wallet = new Wallet(keypair)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program = new Program(IDL, PROGRAM_ID, provider)

  // PDA de ArenaState
  const [arenaStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('arena_state')],
    PROGRAM_ID
  )

  console.log('Arena State PDA:', arenaStatePDA.toBase58())
  console.log('Authority (tu wallet):', keypair.publicKey.toBase58())

  try {
    const tx = await program.methods
      .initialize(keypair.publicKey, 500) // 500 bps = 5%
      .accounts({
        arenaState: arenaStatePDA,
        payer: keypair.publicKey,
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .rpc()

    console.log('✅ Initialize exitoso!')
    console.log('TX:', tx)
    console.log('Explorar en: https://explorer.solana.com/tx/' + tx + '?cluster=mainnet')
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
