export type TournamentStatus = 'open' | 'active' | 'finished'

export interface Tournament {
  id:          string
  title:       string
  entryFee:    number   // in SOL
  maxPlayers:  number
  playerCount: number
  prizePool:   number   // in SOL
  organizer:   string   // truncated pubkey
  status:      TournamentStatus
  game:        string
  createdAt:   string
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
    status:      'open',
    game:        'FPS Combat',
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
    status:      'active',
    game:        'Battle Royale',
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
    createdAt:   '2025-04-11',
  },
]
