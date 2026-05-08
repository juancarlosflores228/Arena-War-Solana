import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program, Idl, setProvider } from '@coral-xyz/anchor'
import type { AnchorWallet } from '@solana/wallet-adapter-react'

// ─── Network ────────────────────────────────────────────────────────────────
export const NETWORK = clusterApiUrl('devnet')
export const CONNECTION = new Connection(NETWORK, 'confirmed')

// ─── Program ID — replace with your deployed program address ────────────────
export const PROGRAM_ID = new PublicKey(
  'ArenaWarXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // ← Replace with your actual program ID
)

// ─── Mock IDL (replace with your real IDL from target/idl/arena_war.json) ──
export const IDL: Idl = {
  version: '0.1.0',
  name:    'arena_war',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'arenaState', isMut: true,  isSigner: false },
        { name: 'organizer',  isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'title',       type: 'string' },
        { name: 'entryFee',    type: 'u64'    },
        { name: 'maxPlayers',  type: 'u8'     },
      ],
    },
    {
      name: 'joinTournament',
      accounts: [
        { name: 'arenaState', isMut: true,  isSigner: false },
        { name: 'player',     isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'distributeRewards',
      accounts: [
        { name: 'arenaState', isMut: true,  isSigner: false },
        { name: 'organizer',  isMut: true,  isSigner: true  },
        { name: 'winner',     isMut: true,  isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'ArenaState',
      type: {
        kind: 'struct',
        fields: [
          { name: 'organizer',   type: 'publicKey' },
          { name: 'title',       type: 'string'    },
          { name: 'entryFee',    type: 'u64'       },
          { name: 'maxPlayers',  type: 'u8'        },
          { name: 'playerCount', type: 'u8'        },
          { name: 'isActive',    type: 'bool'      },
          { name: 'prizePool',   type: 'u64'       },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'TournamentFull',   msg: 'Tournament is already full'   },
    { code: 6001, name: 'TournamentClosed', msg: 'Tournament is no longer open' },
    { code: 6002, name: 'Unauthorized',     msg: 'Unauthorized action'          },
  ],
}

// ─── Provider factory ────────────────────────────────────────────────────────
export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const provider = new AnchorProvider(CONNECTION, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  setProvider(provider)
  return provider
}

// ─── Program factory ─────────────────────────────────────────────────────────
export function getProgram(wallet: AnchorWallet): Program {
  const provider = getProvider(wallet)
  return new Program(IDL, PROGRAM_ID, provider)
}

// ─── PDA helper ──────────────────────────────────────────────────────────────
export async function getArenaPDA(
  organizer: PublicKey,
  title: string
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('arena_state'),
      organizer.toBuffer(),
      Buffer.from(title),
    ],
    PROGRAM_ID
  )
}
