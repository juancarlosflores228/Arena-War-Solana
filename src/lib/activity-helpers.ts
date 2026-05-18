import type { Connection, PublicKey } from '@solana/web3.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'create' | 'join' | 'declare' | 'distribute' | 'unknown'

export interface ActivityItem {
  signature: string
  type:      ActivityType
  signer:    string
  blockTime: number
}

// ─── Discriminators (from TournamentContext.tsx) ──────────────────────────────

const DISC_CREATE     = [158, 137, 233, 231, 73,  132, 191, 68]
const DISC_JOIN       = [77,  21,  212, 206, 77,  82,  124, 31]
const DISC_DECLARE    = [140, 135, 197, 50,  9,   23,  4,   80]
const DISC_DISTRIBUTE = [154, 99,  201, 93,  82,  104, 73,  232]

function matchDisc(data: Uint8Array, disc: number[]): boolean {
  return data.length >= 8 && disc.every((b, i) => data[i] === b)
}

export function identifyType(data: Uint8Array): ActivityType {
  if (matchDisc(data, DISC_CREATE))     return 'create'
  if (matchDisc(data, DISC_JOIN))       return 'join'
  if (matchDisc(data, DISC_DECLARE))    return 'declare'
  if (matchDisc(data, DISC_DISTRIBUTE)) return 'distribute'
  return 'unknown'
}

// ─── Base58 decoder (no external dep) ────────────────────────────────────────

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function decodeBase58(str: string): Uint8Array {
  const bytes = [0]
  for (const char of str) {
    const c = B58.indexOf(char)
    if (c < 0) throw new Error('Invalid base58')
    let carry = c
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  for (const char of str) {
    if (char !== '1') break
    bytes.push(0)
  }
  return new Uint8Array(bytes.reverse())
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getTimeAgo(unixTimestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixTimestamp
  if (diff <  60)    return 'hace un momento'
  if (diff <  3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff <  86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} días`
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchActivity(
  connection: Connection,
  programId:  PublicKey,
  limit = 12,
): Promise<ActivityItem[]> {
  const sigs = await connection.getSignaturesForAddress(programId, { limit })
  const valid = sigs.filter(s => s.blockTime && !s.err)

  const txs = await Promise.all(
    valid.map(s =>
      connection
        .getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
        .catch(() => null),
    ),
  )

  return valid.map((sig, idx) => {
    const tx   = txs[idx] as any
    let type:   ActivityType = 'unknown'
    let signer = ''

    if (tx) {
      const msg   = tx.transaction.message
      const keys: any[] = msg.accountKeys ?? msg.staticAccountKeys ?? []
      signer = keys[0]?.toBase58?.() ?? String(keys[0] ?? '')

      const progStr = programId.toBase58()
      const progIdx = keys.findIndex(
        (k: any) => (k.toBase58?.() ?? String(k)) === progStr,
      )
      const ixs: any[] = msg.instructions ?? msg.compiledInstructions ?? []
      const ix = ixs.find((i: any) => i.programIdIndex === progIdx)

      if (ix) {
        try {
          const raw: Uint8Array =
            ix.data instanceof Uint8Array ? ix.data : decodeBase58(ix.data as string)
          type = identifyType(raw)
        } catch { /* ignore parse errors */ }
      }
    }

    return { signature: sig.signature, type, signer, blockTime: sig.blockTime! }
  })
}
