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

export const TOURNAMENTS: Tournament[] = [
  {
    id:          'arena-001',
    title:       'DEATH MATCH ALPHA',
    entryFee:    0.5,
    maxPlayers:  8,
    playerCount: 5,
    prizePool:   3.5,
    organizer:   '7xKp...9mQr',
    organizerPubkey: '7xKpnYzJ8mQrT2V5cL9sN4bF6gH8jK2mN3pQ4rS5tU6vW7xY8zA9bC',
    status:      'open',
    game:        'FPS Combat',
    likes:       12,
    dislikes:    2,
    streamUrl:   'https://www.tiktok.com/@arena_live/live/1234567890',
    createdAt:   '2025-04-10',
  },
  {
    id:          'arena-002',
    title:       'GLADIATOR ROYALE',
    entryFee:    1.0,
    maxPlayers:  16,
    playerCount: 16,
    prizePool:   14.4,
    organizer:   '3nBv...4kLm',
    organizerPubkey: '3nBvCzD4eF5gH6jK7lM8nO9pQ0rS1tU2vW3xY4zA5bC6dE7fG8hI9jK',
    status:      'active',
    game:        'Battle Royale',
    likes:       34,
    dislikes:    5,
    streamUrl:   'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    createdAt:   '2025-04-09',
  },
  {
    id:          'arena-003',
    title:       'PHANTOM SIEGE',
    entryFee:    0.25,
    maxPlayers:  4,
    playerCount: 2,
    prizePool:   0.9,
    organizer:   '9pRt...2wSz',
    status:      'open',
    game:        'Strategy',
    likes:       8,
    dislikes:    1,
    streamUrl:   'https://discord.com/events/1234567890123456789',
    createdAt:   '2025-04-11',
  },
  {
    id:          'arena-004',
    title:       'WARLORD CUP S1',
    entryFee:    2.0,
    maxPlayers:  32,
    playerCount: 32,
    prizePool:   57.6,
    organizer:   '5yHn...8dFk',
    status:      'finished',
    game:        'MOBA',
    likes:       62,
    dislikes:    14,
    createdAt:   '2025-04-07',
  },
  {
    id:          'arena-005',
    title:       'VOID BREAKERS',
    entryFee:    0.1,
    maxPlayers:  8,
    playerCount: 3,
    prizePool:   0.27,
    organizer:   '2cJx...6vPw',
    status:      'open',
    game:        'Racing',
    likes:       3,
    dislikes:    0,
    createdAt:   '2025-04-12',
  },
  {
    id:          'arena-006',
    title:       'STEEL DOMINION',
    entryFee:    5.0,
    maxPlayers:  4,
    playerCount: 4,
    prizePool:   18.0,
    organizer:   '8mYq...1tNb',
    status:      'active',
    game:        'Fighting',
    likes:       22,
    dislikes:    4,
    streamUrl:   'https://www.twitch.tv/arena_warlord',
    createdAt:   '2025-04-11',
  },
]
