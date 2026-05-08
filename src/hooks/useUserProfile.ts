import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const STORAGE_KEY = 'arena_war_user_profile'

export interface UserProfile {
  publicKey: string
  joinedAt: string
  username: string
}

export function useUserProfile() {
  const { publicKey, connected } = useWallet()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    if (!connected || !publicKey) {
      setProfile(null)
      setIsNewUser(false)
      return
    }

    const pk = publicKey.toBase58()
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    let currentProfile: UserProfile | null = null

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile
        if (parsed.publicKey === pk) {
          currentProfile = parsed
        }
      } catch {
        currentProfile = null
      }
    }

    if (currentProfile) {
      setProfile(currentProfile)
      setIsNewUser(false)
      return
    }

    const newProfile: UserProfile = {
      publicKey: pk,
      joinedAt: new Date().toISOString(),
      username: `Warrior_${pk.slice(-4)}`,
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile))
    }

    setProfile(newProfile)
    setIsNewUser(true)
  }, [connected, publicKey])

  return { profile, isNewUser }
}
