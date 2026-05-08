# ⚔️ Arena War — Solana Tournament Platform

Decentralized gaming tournament platform built on Solana. Organizers create arenas, players pay entry fees, winners receive prizes — all on-chain.

## Stack

| Layer      | Tech                                    |
|------------|-----------------------------------------|
| Blockchain | Solana Devnet · Anchor 0.30             |
| Frontend   | React 18 · Vite · TypeScript            |
| Styling    | TailwindCSS · Framer Motion             |
| Wallet     | Phantom via @solana/wallet-adapter      |

---

## Features

- Create tournaments with custom entry fee and player cap
- Anti-spam creation fee: **0.009 SOL** paid to platform on creation
- Join tournaments — entry fee held in PDA escrow
- Declare winner and distribute prizes automatically:
  - 80% → winner · 15% → organizer · 5% → platform
- Organizer reputation system (on-chain score)
- Search arenas by name or organizer wallet
- Status filters: All · Open · Live · Finished

---

## Deployed Addresses (Devnet)

| Account            | Address                                          |
|--------------------|--------------------------------------------------|
| Program ID         | `At428xvcEnhjVXxensriSeXm7hQo6Kzx7KEgTcPW9o3y` |
| Platform Authority | `7hUtdo1NNWLZ5Kb78H4nVDgKhFBdaey4w6k5atvtCKFL` |

Both are public keys — safe to include in source.

---

## Local Development

```bash
# Install frontend dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173

# Build Solana program (requires Anchor + Rust toolchain)
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

Get free devnet SOL: https://faucet.solana.com

---

## Project Structure

```
├── programs/arena_war/src/lib.rs   # Anchor smart contract
├── src/
│   ├── context/TournamentContext.tsx  # All on-chain TX logic
│   ├── lib/anchor.ts               # Connection + program factory
│   ├── lib/arena_war.json          # Program IDL
│   ├── pages/
│   │   ├── Home.tsx                # Arena list + search
│   │   ├── CreateTournament.tsx    # Create arena form
│   │   └── Dashboard.tsx           # User dashboard
│   └── components/TournamentCard.tsx
├── Anchor.toml
└── .env.example
```

---

## Security

- No private keys in this repository
- `Anchor.toml` references `~/.config/solana/id.json` (your local filesystem only)
- All transactions are signed client-side via wallet adapter
- Program IDs and platform authority are public keys (intentionally visible)

---

## License

Private — not for redistribution
