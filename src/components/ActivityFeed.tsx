import { useEffect, useState, useRef } from 'react'
import { useConnection }               from '@solana/wallet-adapter-react'
import { PROGRAM_ID }                  from '../lib/anchor'
import {
  fetchActivity,
  getTimeAgo,
  truncateAddress,
  type ActivityItem,
  type ActivityType,
} from '../lib/activity-helpers'

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_MS = 15_000

const TYPE_META: Record<ActivityType, { icon: string; label: string; color: string }> = {
  create:     { icon: '🎮', label: 'Arena creada',         color: 'text-arena-red'   },
  join:       { icon: '👤', label: 'Jugador se unió',      color: 'text-arena-cyan'  },
  declare:    { icon: '🏆', label: 'Ganador declarado',    color: 'text-arena-gold'  },
  distribute: { icon: '💰', label: 'Premios distribuidos', color: 'text-arena-green' },
  unknown:    { icon: '⚡', label: 'Actividad',            color: 'text-arena-muted' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityFeed() {
  const { connection }                  = useConnection()
  const [items, setItems]               = useState<ActivityItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [lastUpdated, setLastUpdated]   = useState(0)
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try {
      const data = await fetchActivity(connection, PROGRAM_ID, 12)
      setItems(data)
      setLastUpdated(Date.now())
    } catch (err) {
      console.error('[ActivityFeed] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, POLL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col bg-arena-card border-l border-arena-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-arena-border flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-arena-red animate-pulse flex-shrink-0" />
        <span className="font-display text-xs text-white tracking-widest">ACTIVIDAD EN VIVO</span>
        {!loading && lastUpdated > 0 && (
          <span className="ml-auto font-body text-[10px] text-arena-muted/60">
            {getTimeAgo(Math.floor(lastUpdated / 1000))}
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-2.5 w-20 bg-arena-border/60 rounded" />
                <div className="h-3 w-36 bg-arena-border/40 rounded" />
                <div className="h-2.5 w-24 bg-arena-border/30 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center">
            <p className="font-body text-xs text-arena-muted">Sin actividad reciente</p>
          </div>
        ) : (
          <ul className="divide-y divide-arena-border/30">
            {items.map((item, i) => {
              const meta   = TYPE_META[item.type]
              const href   = `https://explorer.solana.com/tx/${item.signature}?cluster=mainnet`
              return (
                <li key={item.signature} className={`px-4 py-3 hover:bg-arena-surface/50 transition-colors ${i === 0 ? 'bg-arena-surface/30' : ''}`}>
                  <p className="font-body text-[10px] text-arena-muted/60 mb-1">
                    {getTimeAgo(item.blockTime)}
                  </p>
                  <p className={`font-display text-xs font-bold ${meta.color} tracking-wide`}>
                    {meta.icon} {meta.label}
                  </p>
                  {item.signer && (
                    <p className="font-mono text-[10px] text-arena-muted mt-0.5">
                      {truncateAddress(item.signer, 5)}
                    </p>
                  )}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-[10px] text-arena-muted/50 hover:text-arena-cyan transition-colors mt-0.5 block"
                  >
                    {item.signature.slice(0, 8)}… ↗
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
