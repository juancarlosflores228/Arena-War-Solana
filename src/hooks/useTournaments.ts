import { useState, useCallback, useEffect } from 'react'
import type { Tournament } from '../data/tournaments'

type VoteType = 'like' | 'dislike'
type UserVotes = Record<string, VoteType>

const VOTES_STORAGE_KEY = 'arena_war_tournament_votes'

const loadStoredVotes = (): UserVotes => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(VOTES_STORAGE_KEY) ?? '{}') as UserVotes
  } catch {
    return {}
  }
}

const saveStoredVotes = (votes: UserVotes) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes))
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [userVotes, setUserVotes] = useState<UserVotes>({})

  useEffect(() => {
    setUserVotes(loadStoredVotes())
  }, [])

  const addTournament = useCallback((t: Omit<Tournament, 'id' | 'playerCount' | 'prizePool' | 'createdAt'>) => {
    const newT: Tournament = {
      ...t,
      id:          `arena-${Date.now()}`,
      playerCount: 0,
      prizePool:   0,
      likes:       t.likes ?? 0,
      dislikes:    t.dislikes ?? 0,
      createdAt:   new Date().toISOString().slice(0, 10),
    }
    setTournaments(prev => [newT, ...prev])
    return newT
  }, [])

  const joinTournament = useCallback((id: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== id || t.playerCount >= t.maxPlayers) return t
        const updated = { ...t, playerCount: t.playerCount + 1 }
        updated.prizePool = parseFloat((updated.entryFee * updated.playerCount * 0.9).toFixed(4))
        return updated
      })
    )
  }, [])

  const voteTournament = useCallback((id: string, voteType: VoteType) => {
    setUserVotes(prevVotes => {
      const current = prevVotes[id]
      if (current === voteType) return prevVotes

      const nextVotes = { ...prevVotes, [id]: voteType }
      saveStoredVotes(nextVotes)

      setTournaments(prev =>
        prev.map(t => {
          if (t.id !== id) return t
          return {
            ...t,
            likes:    t.likes + (voteType === 'like' ? 1 : 0) - (current === 'like' ? 1 : 0),
            dislikes: t.dislikes + (voteType === 'dislike' ? 1 : 0) - (current === 'dislike' ? 1 : 0),
          }
        })
      )

      return nextVotes
    })
  }, [])

  const likeTournament = useCallback((id: string) => voteTournament(id, 'like'), [voteTournament])
  const dislikeTournament = useCallback((id: string) => voteTournament(id, 'dislike'), [voteTournament])

  const openCount  = tournaments.filter(t => t.status === 'open').length
  const totalPrize = tournaments.reduce((s, t) => s + t.prizePool, 0)

  return { tournaments, addTournament, joinTournament, likeTournament, dislikeTournament, openCount, totalPrize, userVotes }
}
