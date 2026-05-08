import { useState, type FormEvent }   from 'react'
import { motion }                     from 'framer-motion'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useArenaToast }              from '../hooks/useToast'
import { getProgram, getArenaPDA }    from '../lib/anchor'
import { useTournamentContext }        from '../context/TournamentContext'
import { useLang }                    from '../context/LangContext'
import { BN }                         from '@coral-xyz/anchor'

const GAME_MODES = ['FPS Combat', 'Battle Royale', 'MOBA', 'Fighting', 'Strategy', 'Racing', 'Other']

interface FormState { title: string; entryFee: string; maxPlayers: string; game: string }

export default function CreateTournament() {
  const { connected, publicKey } = useWallet()
  const anchorWallet             = useAnchorWallet()
  const toast                    = useArenaToast()
  const { addTournament }        = useTournamentContext()
  const { t }                    = useLang()

  const [form, setForm]       = useState<FormState>({ title: '', entryFee: '', maxPlayers: '', game: 'FPS Combat' })
  const [loading, setLoading] = useState(false)

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const prizePool = form.entryFee && form.maxPlayers
    ? (parseFloat(form.entryFee) * parseInt(form.maxPlayers) * 0.9).toFixed(2)
    : '—'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) { toast.error(t.toast.connectFirst); return }
    if (!anchorWallet)            { toast.error(t.toast.walletReady);  return }

    const { title, entryFee, maxPlayers } = form
    if (!title || !entryFee || !maxPlayers) { toast.error(t.toast.fillFields);   return }
    const fee = parseFloat(entryFee)
    const max = parseInt(maxPlayers)
    if (isNaN(fee) || fee <= 0) { toast.error(t.toast.feeError);     return }
    if (isNaN(max) || max < 2)  { toast.error(t.toast.playersError); return }

    setLoading(true)
    const tid = toast.loading(t.toast.creating)
    try {
      const program          = getProgram(anchorWallet)
      const [arenaPDA]       = await getArenaPDA(publicKey, title)
      const entryFeeLamports = new BN(fee * 1e9)

      // ── Real Anchor call (uncomment when program ID is set) ──────────
      // await program.methods
      //   .initialize(title, entryFeeLamports, max)
      //   .accounts({ arenaState: arenaPDA, organizer: publicKey, systemProgram: SystemProgram.programId })
      //   .rpc()
      // ─────────────────────────────────────────────────────────────────

      await new Promise(r => setTimeout(r, 1800))
      console.log('[Arena War] Create:', { title, lamports: entryFeeLamports.toString(), max, pda: arenaPDA.toBase58() })

      addTournament({
        title,
        entryFee:   fee,
        maxPlayers: max,
        organizer:  publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4),
        status:     'open',
        game:       form.game,
      })

      toast.dismiss(tid)
      toast.success(`${t.toast.created}: "${title}"`)
      setForm({ title: '', entryFee: '', maxPlayers: '', game: 'FPS Combat' })
    } catch (err: unknown) {
      toast.dismiss(tid)
      toast.error(err instanceof Error ? err.message : t.toast.txFailed)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-arena-bg pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="font-body text-xs text-arena-red tracking-[0.3em] block mb-2">{t.create.badge}</span>
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">{t.create.title}</h1>
          <p className="font-body text-arena-muted text-sm mt-2">{t.create.subtitle}</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={handleSubmit} className="space-y-5"
        >
          <Field label={t.create.labelTitle} required>
            <input type="text" value={form.title} onChange={update('title')}
              placeholder={t.create.placeholder} maxLength={32}
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-display text-white text-sm tracking-wider placeholder:text-arena-muted/40 outline-none transition-colors"
            />
          </Field>

          <Field label={t.create.labelGame} required>
            <select value={form.game} onChange={update('game')}
              className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-arena-text text-sm outline-none transition-colors appearance-none cursor-pointer"
            >
              {GAME_MODES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t.create.labelFee} required>
              <input type="number" value={form.entryFee} onChange={update('entryFee')}
                placeholder="0.5" step="0.01" min="0.01"
                className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-white text-sm placeholder:text-arena-muted/40 outline-none transition-colors"
              />
            </Field>
            <Field label={t.create.labelPlayers} required>
              <input type="number" value={form.maxPlayers} onChange={update('maxPlayers')}
                placeholder="8" min="2" max="64"
                className="w-full bg-arena-surface border border-arena-border focus:border-arena-red rounded px-4 py-3 font-body text-white text-sm placeholder:text-arena-muted/40 outline-none transition-colors"
              />
            </Field>
          </div>

          <motion.div
            animate={{ opacity: prizePool !== '—' ? 1 : 0.4 }}
            className="bg-arena-card border border-arena-gold/20 rounded p-4 flex items-center justify-between"
          >
            <div>
              <span className="font-body text-xs text-arena-muted tracking-widest block">{t.create.prizeLabel}</span>
              <span className="font-display font-bold text-2xl text-arena-gold mt-0.5 block">{prizePool} SOL</span>
            </div>
            <svg className="w-10 h-10 text-arena-gold opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </motion.div>

          {!connected && (
            <div className="flex items-center gap-2 bg-arena-red/10 border border-arena-red/30 rounded p-3">
              <span className="text-arena-red text-sm">⚠</span>
              <span className="font-body text-xs text-arena-red">{t.create.walletWarn}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }} type="submit" disabled={loading || !connected}
            className={`w-full py-4 font-display font-bold tracking-widest text-sm rounded transition-all duration-200 ${
              !connected ? 'bg-arena-border text-arena-muted cursor-not-allowed'
              : loading  ? 'bg-arena-red/60 text-white cursor-wait'
              : 'bg-arena-red hover:bg-arena-red/80 text-white hover:shadow-red-glow'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> {t.create.submitting}
              </span>
            ) : t.create.submit}
          </motion.button>
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
