import { motion } from 'framer-motion'
import { Link }   from 'react-router-dom'

export default function MundialTab() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-bg pt-24 pb-20 px-4">
      <div className="text-center max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-arena-card border border-arena-border rounded-lg p-8 md:p-12"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold text-arena-gold mb-4">
            🚧
          </h1>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6 tracking-wider">
            EN DESARROLLO
          </h2>
          <p className="text-arena-text text-lg md:text-xl mb-8 leading-relaxed">
            Próximamente apuestas del <span className="text-arena-gold font-bold">Mundial 2026</span> con crypto
          </p>
          <div className="space-y-4 text-left bg-arena-surface border border-arena-border/50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-arena-green text-xl">✓</span>
              <p className="text-arena-muted">Sistema parimutuel justo y transparente</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-arena-green text-xl">✓</span>
              <p className="text-arena-muted">Apuestas en USDT con odds en tiempo real</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-arena-green text-xl">✓</span>
              <p className="text-arena-muted">104 partidos del Mundial disponibles</p>
            </div>
          </div>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-block px-8 py-4 bg-arena-red hover:bg-arena-red/80 text-white font-display font-bold tracking-widest text-sm rounded transition-all duration-200 hover:shadow-red-glow"
            >
              ← VOLVER AL INICIO
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
