import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet }         from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { motion }            from 'framer-motion'
import { useUserProfile }    from '../hooks/useUserProfile'

const NAV_LINKS = [
  { label: 'Arena',     path: '/'          },
  { label: 'Create',    path: '/create'    },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Admin',     path: '/admin'     },
  { label: '⚽ Mundial', path: '/mundial'  },
]

export default function Navbar() {
  const { publicKey, connected } = useWallet()
  const { profile } = useUserProfile()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const truncate = (pk: string) => `${pk.slice(0, 4)}...${pk.slice(-4)}`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-arena-border/60 bg-arena-bg/80 backdrop-blur-xl">
      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-arena-red/40 to-transparent top-0" />
      </div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="w-8 h-8 relative"
          >
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <polygon points="16,2 30,28 2,28" fill="none" stroke="#E5202E" strokeWidth="2.5" />
              <polygon points="16,8 26,26 6,26" fill="#E5202E" opacity="0.15" />
              <line x1="16" y1="8" x2="16" y2="20" stroke="#E5202E" strokeWidth="2" />
              <circle cx="16" cy="23" r="2" fill="#E5202E" />
            </svg>
          </motion.div>
          <span className="font-display font-bold text-lg tracking-widest text-white group-hover:text-arena-red transition-colors">
            ARENA<span className="text-arena-red">WAR</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, path }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`relative px-4 py-1.5 font-display text-sm tracking-widest transition-colors ${
                  active ? 'text-arena-red' : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 bg-arena-red/10 border border-arena-red/30 rounded"
                  />
                )}
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-arena-green/30 bg-arena-green/5">
            <span className="w-1.5 h-1.5 rounded-full bg-arena-green animate-pulse" />
            <span className="font-body text-xs text-arena-green tracking-wider">DEVNET</span>
          </div>

          {/* Wallet */}
          <WalletMultiButton
            style={{
              background:    '#E5202E',
              height:        '36px',
              borderRadius:  '4px',
              fontSize:      '0.75rem',
              fontFamily:    '"Chakra Petch", monospace',
              fontWeight:    700,
              letterSpacing: '0.1em',
              padding:       '0 14px',
              border:        'none',
            }}
          />

          {connected && publicKey && (
            <div className="hidden sm:block font-body text-xs text-arena-muted border border-arena-border px-2 py-1 rounded">
              {profile?.username ?? truncate(publicKey.toBase58())}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-arena-muted hover:text-white p-1"
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-arena-border bg-arena-surface px-4 py-3 flex flex-col gap-1"
        >
          {NAV_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`font-display text-sm tracking-widest px-3 py-2 rounded ${
                location.pathname === path
                  ? 'text-arena-red bg-arena-red/10'
                  : 'text-arena-muted'
              }`}
            >
              {label}
            </Link>
          ))}
        </motion.div>
      )}
    </header>
  )
}
