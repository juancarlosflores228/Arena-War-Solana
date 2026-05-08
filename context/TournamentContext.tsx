import { createContext, useContext, type ReactNode } from 'react'
import { useTournaments } from '../hooks/useTournaments'
import type { Tournament } from '../data/tournaments'

interface TournamentCtx {
  tournaments:     Tournament[]
  openCount:       number
  totalPrize:      number
  addTournament:   ReturnType<typeof useTournaments>['addTournament']
  joinTournament:  ReturnType<typeof useTournaments>['joinTournament']
}

const TournamentContext = createContext<TournamentCtx | null>(null)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const value = useTournaments()
  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournamentContext must be inside TournamentProvider')
  return ctx
}
