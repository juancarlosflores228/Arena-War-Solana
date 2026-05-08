import type { BetEntry } from '../../data/mundial2026'

interface Props {
  bets: Record<number, BetEntry>
  totalApostado: number
  onRemove: (matchId: number) => void
}

const STATUS_STYLE: Record<BetEntry['status'], string> = {
  activa:    'text-[#5ba3f5] border-[#5ba3f5]/30',
  pendiente: 'text-[#f59e0b] border-[#f59e0b]/30',
  'ganó':    'text-[#4caf50] border-[#4caf50]/30',
  'perdió':  'text-[#ef4444] border-[#ef4444]/30',
}

const STATUS_LABEL: Record<BetEntry['status'], string> = {
  activa:    '🔵 Activa',
  pendiente: '⏳ Pendiente',
  'ganó':    '✅ Ganó',
  'perdió':  '❌ Perdió',
}

export default function BetsSummary({ bets, totalApostado, onRemove }: Props) {
  const entries = Object.values(bets)

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">⚽</div>
        <p className="font-display text-sm text-[#8892a4] tracking-wider">
          Aún no tienes apuestas activas
        </p>
        <p className="font-body text-xs text-[#8892a4]/60 mt-2">
          Selecciona un partido en la pestaña de Grupos y realiza tu primera apuesta.
        </p>
      </div>
    )
  }

  const ganadas  = entries.filter(b => b.status === 'ganó').length
  const perdidas = entries.filter(b => b.status === 'perdió').length

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="TOTAL APOSTADO" value={`${totalApostado.toFixed(2)} USDT`} color="#5ba3f5" />
        <StatBox label="APUESTAS"       value={String(entries.length)}              color="#f59e0b" />
        <StatBox label="GANADAS"        value={String(ganadas)}                     color="#4caf50" />
        <StatBox label="PERDIDAS"       value={String(perdidas)}                    color="#ef4444" />
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {entries.map(bet => {
          const date = new Date(bet.fecha).toLocaleDateString('es-MX', {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
          return (
            <div
              key={bet.matchId}
              className="rounded-lg border border-[#1e2535] bg-[#111520] p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display text-xs text-white tracking-wider truncate">
                  {bet.matchLabel}
                </div>
                <div className="text-[11px] text-[#8892a4] mt-0.5">{date}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-display text-xs text-white">{bet.teamLabel}</span>
                  <span className="text-[10px] text-[#8892a4]">·</span>
                  <span className="font-bold text-sm text-white">{bet.amount} USDT</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold border rounded px-2 py-0.5 ${STATUS_STYLE[bet.status]}`}
                >
                  {STATUS_LABEL[bet.status]}
                </span>
                {bet.status === 'activa' && (
                  <button
                    onClick={() => onRemove(bet.matchId)}
                    className="text-[10px] text-[#8892a4] hover:text-[#ef4444] transition-colors"
                  >
                    cancelar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#1e2535] bg-[#111520] p-3 text-center">
      <div className="font-display text-[10px] tracking-widest text-[#8892a4]">{label}</div>
      <div className="font-display text-lg font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  )
}
