import { useMemo }           from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program }        from '@coral-xyz/anchor'
import { IDL, PROGRAM_ID }               from '../lib/anchor'

export function useAnchorProgram() {
  const { connection }  = useConnection()
  const anchorWallet    = useAnchorWallet()

  const program = useMemo(() => {
    if (!anchorWallet) return null
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment:           'confirmed',
      preflightCommitment:  'confirmed',
    })
    return new Program(IDL, PROGRAM_ID, provider)
  }, [connection, anchorWallet])

  return { program, connected: !!anchorWallet }
}
