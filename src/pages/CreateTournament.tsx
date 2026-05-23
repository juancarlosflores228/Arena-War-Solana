import { useState, type FormEvent }  from 'react'
import { motion }                    from 'framer-motion'
import { useWallet }                 from '@solana/wallet-adapter-react'
import { useTournamentContext }       from '../context/TournamentContext'
import { useSolPrice }               from '../hooks/useSolPrice'

interface FormState {
  title:      string
  entryFee:   string
  maxPlayers: string
  game:       string
  streamUrl:  string
}

const GAME_MODES = ['FPS Combat', 'Battle Royale', 'MOBA', 'Fighting', 'Strategy', 'Racing', 'Other']

export default function CreateTournament() {
  const { connected }                        = useWallet()
  const { createTournament, submitting }     = useTournamentContext()
  const { price: solPrice }                  = useSolPrice()

  const [form, setForm] = useState<FormState>({
    title: '', entryFee: '', maxPlayers: '', game: 'FPS Combat', streamUrl: '',
  })
  const [maxPlayersError, setMaxPlayersError] = useState('')

  const handleMaxPlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm(f => ({ ...f, maxPlayers: val }))
    const n = parseInt(val)
    if (val && !isNaN(n)) {
      if (n < 2)        setMaxPlayersError('Mínimo 2 jugadores')
      else if (n > 64)  setMaxPlayersError('Máximo 64 jugadores (límite del smart contract)')
      else              setMaxPlayersError('')
    } else {
      setMaxPlayersError('')
    }
  }

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const prizePool = form.entryFee && form.maxPlayers
    ? (parseFloat(form.entryFee) * parseInt(form.maxPlayers) * 0.9).toFixed(2)
    : '—'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!connected) return

    const { title, entryFee, maxPlayers, game, streamUrl } = form
    if (!title.trim() || !entryFee || !maxPlayers) return

    const fee = parseFloat(entryFee)
    const max = parseInt(maxPlayers)
    if (isNaN(fee) || fee <= 0 || isNaN(max) || max < 2 || max > 64) return

    const ok = await createTournament({
      title: title.trim(),
      entryFee: fee,
      maxPlayers: max,
      game,
      streamUrl: streamUrl || undefined,
    })

    if (ok) {
      setForm({ title: '', entryFee: '', maxPlayers: '', game: 'FPS Combat', streamUrl: '' })
    }
  }

  return (
    <div className="min-h-screen bg-arena-bg pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <span className="font-body text-xs text-arena-red tracking-[0.3em] block mb-2">
            ▶ TOURNAMENT CREATION
          </span>
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">
            FORGE YOUR ARENA
          </h1>
          <p className="font-body text-arena-muted text-sm mt-2">
            Deploy a new tournament on Solana Devnet. 10% protocol fee applies.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Title */}
          <Field label="ARENA TITLE" required>
            <input
              type="text"
              value={form.title}
              onChange={update('title')}
              placeholder="DEATH MATCH ALPHA"
              maxLength={32}
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-display text-white text-sm tracking-wider placeholder:text-arena-muted/40 outline-none transition-colors"
            />
          </Field>

          {/* Game mode */}
          <Field label="GAME MODE" required>
            <select
              value={form.game}
              onChange={update('game')}
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-arena-text text-sm outline-none transition-colors appearance-none cursor-pointer"
            >
              {GAME_MODES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>

          {/* Streaming link */}
          <Field label="LINK DE TRANSMISIÓN">
            <input
              type="url"
              value={form.streamUrl}
              onChange={update('streamUrl')}
              placeholder="https://tiktok.com/live/... o Discord, YouTube, Twitch"
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-white text-sm placeholder:text-arena-muted/40 outline-none transition-colors"
            />
          </Field>

          {/* Entry fee + players */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="ENTRY FEE (SOL)" required>
              <input
                type="number"
                value={form.entryFee}
                onChange={update('entryFee')}
                placeholder="0.5"
                step="0.01"
                min="0.01"
                className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-white text-sm placeholder:text-arena-muted/40 outline-none transition-colors"
              />
            </Field>
            <Field label="MAX PLAYERS (2–64)" required>
              <input
                type="number"
                value={form.maxPlayers}
                onChange={handleMaxPlayersChange}
                placeholder="8"
                min="2"
                max="64"
                className={`w-full bg-arena-surface border rounded px-4 py-3 font-body text-white text-sm placeholder:text-arena-muted/40 outline-none transition-colors ${
                  maxPlayersError ? 'border-arena-red focus:border-arena-red' : 'border-arena-border focus:border-arena-red'
                }`}
              />
              {maxPlayersError && (
                <span className="block font-body text-[11px] text-arena-red mt-1.5">
                  ⚠ {maxPlayersError}
                </span>
              )}
            </Field>
          </div>

          {/* Prize preview */}
          <motion.div
            animate={{ opacity: prizePool !== '—' ? 1 : 0.4 }}
            className="bg-arena-card border border-arena-gold/20 rounded p-4 flex items-center justify-between"
          >
            <div>
              <span className="font-body text-xs text-arena-muted tracking-widest block">ESTIMATED PRIZE POOL</span>
              <span className="font-display font-bold text-2xl text-arena-gold mt-0.5 block">{prizePool} SOL</span>
            </div>
            <svg className="w-10 h-10 text-arena-gold opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </motion.div>

          {/* Wallet warning */}
          {!connected && (
            <div className="flex items-center gap-2 bg-arena-red/10 border border-arena-red/30 rounded p-3">
              <span className="text-arena-red text-sm">⚠</span>
              <span className="font-body text-xs text-arena-red">Connect your Phantom wallet to create a tournament</span>
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={submitting || !connected}
            className={`w-full py-4 font-display font-bold tracking-widest text-sm rounded transition-all duration-200 ${
              !connected
                ? 'bg-arena-border text-arena-muted cursor-not-allowed'
                : submitting
                  ? 'bg-arena-red/60 text-white cursor-wait'
                  : 'bg-arena-red hover:bg-arena-red/80 text-white hover:shadow-red-glow'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> DEPLOYING TO SOLANA…
              </span>
            ) : 'CREATE ARENA ◆'}
          </motion.button>

          {/* Creation fee notice */}
          <p className="text-center font-body text-[11px] text-arena-muted/60 pt-1">
            Creation fee: <span className="text-arena-muted">0.009 SOL</span> ≈ <span className="text-arena-muted">${(0.009 * solPrice).toFixed(2)} USD</span> · one-time anti-spam charge
          </p>
        </motion.form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-body text-xs text-arena-muted tracking-widest mb-2">
        {label}{required && <span className="text-arena-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}