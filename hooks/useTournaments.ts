import { useState, useCallback } from 'react'
import { TOURNAMENTS, type Tournament } from '../data/tournaments'

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>(TOURNAMENTS)

  const addTournament = useCallback((t: Omit<Tournament, 'id' | 'playerCount' | 'prizePool' | 'createdAt'>) => {
    const newT: Tournament = {
      ...t,
      id:          `arena-${Date.now()}`,
      playerCount: 0,
      prizePool:   0,
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

  const openCount  = tournaments.filter(t => t.status === 'open').length
  const totalPrize = tournaments.reduce((s, t) => s + t.prizePool, 0)

  return { tournaments, addTournament, joinTournament, openCount, totalPrize }
}
