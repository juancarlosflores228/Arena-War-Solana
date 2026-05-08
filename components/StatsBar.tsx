import { motion } from 'framer-motion'

interface Stat { label: string; value: string; accent?: string }

export default function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="inline-flex items-center divide-x divide-arena-border bg-arena-card border border-arena-border rounded overflow-hidden"
    >
      {stats.map(({ label, value, accent }) => (
        <div key={label} className="px-6 py-4 text-center">
          <span className="block font-body text-xs text-arena-muted tracking-widest mb-1">{label}</span>
          <span className={`block font-display font-bold text-xl ${accent ?? 'text-arena-gold'}`}>{value}</span>
        </div>
      ))}
    </motion.div>
  )
}
