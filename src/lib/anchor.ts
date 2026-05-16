import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { Buffer } from 'buffer'
import IDL_JSON from './arena_war.json'

export const NETWORK = 'https://mainnet.helius-rpc.com/?api-key=b82c6ef8-3fda-4dfb-a818-33342fc750c1'
export const CONNECTION = new Connection(NETWORK, 'confirmed')

export const PROGRAM_ID = new PublicKey('FD5HxS53UDzVBgCtsR5ats4ouWEL8VBWzyxzGSPhTyYU')

export const IDL = IDL_JSON as any

export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const provider = new AnchorProvider(CONNECTION, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  setProvider(provider)
  return provider
}

export function getProgram(wallet: AnchorWallet): Program {
  const provider = getProvider(wallet)
  return new Program(IDL, provider)
}

export async function getArenaPDA(): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('arena_state')],
    PROGRAM_ID
  )
}

export async function getTournamentPDA(organizer: PublicKey, title: string): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tournament'), organizer.toBuffer(), Buffer.from(title)],
    PROGRAM_ID
  )
}

export async function getPlayerListPDA(tournament: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player_list'), tournament.toBuffer()],
    PROGRAM_ID
  )
}

export async function getOrgReputationPDA(organizer: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('org_reputation'), organizer.toBuffer()],
    PROGRAM_ID
  )
}
