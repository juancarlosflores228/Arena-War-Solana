export type TournamentStatus = 'open' | 'active' | 'finished'

export interface OrgReputation {
  created:   number   // tournaments_created on-chain
  completed: number   // tournaments_completed on-chain
  paid:      number   // reputation_score / 10 (distributed tournaments)
  score:     number   // 0-100 percentage
  badge:     '🏆' | '🥈' | '🥉' | '⚠️'
  label:     'TRUSTED' | 'RELIABLE' | 'FAIR' | 'RISKY' | 'NEW'
}

export interface Tournament {
  id:               string
  title:            string
  entryFee:         number   // in SOL
  maxPlayers:       number
  playerCount:      number
  prizePool:        number   // in SOL
  organizer:        string   // truncated pubkey for display
  organizerPubkey?: string   // full pubkey for PDAs (undefined on mock data)
  proposedWinner?:  string   // pubkey of declared winner, if any
  status:           TournamentStatus
  game:             string
  createdAt:        string
  likes:            number
  dislikes:         number
  streamUrl?:            string
  players?:              string[]       // full pubkeys from on-chain PlayerList
  organizerReputation?:  OrgReputation  // on-chain OrgReputation account
  registrationClosed?:   boolean        // true when organizer called start_tournament_early
}

