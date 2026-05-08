import fs from 'fs'
import os from 'os'

const { Connection, PublicKey, clusterApiUrl, Keypair } = await import('@solana/web3.js')
const { AnchorProvider, Program, Wallet } = await import('@coral-xyz/anchor')

const PROGRAM_ID = new PublicKey('BTCHmkRouySY6PffGNxbzVuMqGm22JfLRDBS5GHLdMvD')
const IDL = {
  version: '0.1.0',
  name: 'arena_war',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'arenaState', isMut: true, isSigner: false },
        { name: 'payer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'authority', type: 'publicKey' },
        { name: 'feeBps', type: 'u16' }
      ]
    }
  ]
}

async function main() {
  const keypairPath = `${os.homedir()}/.config/solana/id.json`
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey))

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const wallet = new Wallet(keypair)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program = new Program(IDL, PROGRAM_ID, provider)

  const [arenaStatePDA] = await PublicKey.findProgramAddress(
    [Buffer.from('arena_state')],
    PROGRAM_ID
  )

  console.log('Arena State PDA:', arenaStatePDA.toBase58())
  console.log('Authority (tu wallet):', keypair.publicKey.toBase58())

  try {
    const tx = await program.methods
      .initialize(keypair.publicKey, 500)
      .accounts({
        arenaState: arenaStatePDA,
        payer: keypair.publicKey,
        systemProgram: new PublicKey('11111111111111111111111111111111')
      })
      .rpc()

    console.log('✅ Initialize exitoso!')
    console.log('TX:', tx)
    console.log('Explorar en: https://explorer.solana.com/tx/' + tx + '?cluster=devnet')
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
