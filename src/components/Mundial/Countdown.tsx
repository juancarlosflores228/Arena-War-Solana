import { useState, useEffect, useRef } from 'react'

interface Props {
  fechaPartido: string
  onClose?: () => void
}

type Urgencia = 'normal' | 'pronto' | 'urgente' | 'critico'

interface TiempoFormateado {
  display: string
  urgencia: Urgencia
}

const MINUTOS_ANTES = 10

function getRemaining(fechaPartido: string): number {
  const cierre = new Date(fechaPartido).getTime() - MINUTOS_ANTES * 60 * 1000
  return cierre - Date.now()
}

function formatear(ms: number): TiempoFormateado | null {
  if (ms <= 0) return null

  const totalSegundos = Math.floor(ms / 1000)
  const dias    = Math.floor(totalSegundos / 86400)
  const horas   = Math.floor((totalSegundos % 86400) / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  if (dias > 0) {
    return { display: `${dias}d ${horas}h ${minutos}m`, urgencia: 'normal' }
  }
  if (horas > 0) {
    return {
      display: `${horas}h ${minutos}m ${String(segundos).padStart(2, '0')}s`,
      urgencia: 'pronto',
    }
  }
  if (minutos >= 5) {
    return {
      display: `${minutos}m ${String(segundos).padStart(2, '0')}s`,
      urgencia: 'urgente',
    }
  }
  // < 5 min
  return {
    display: `${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`,
    urgencia: 'critico',
  }
}

export default function Countdown({ fechaPartido, onClose }: Props) {
  const [msRestantes, setMsRestantes] = useState(() => getRemaining(fechaPartido))
  const closedFired = useRef(false)

  useEffect(() => {
    // Partido ya pasó — no montar interval
    if (msRestantes <= 0) {
      if (!closedFired.current) {
        closedFired.current = true
        onClose?.()
      }
      return
    }

    const intervalo = setInterval(() => {
      const diff = getRemaining(fechaPartido)
      setMsRestantes(diff)

      if (diff <= 0) {
        clearInterval(intervalo)
        if (!closedFired.current) {
          closedFired.current = true
          onClose?.()
        }
      }
    }, 1000)

    return () => clearInterval(intervalo)
    // Solo montar una vez; getRemaining() es fresh cada tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (msRestantes <= 0) {
    return <EstadoCerrado />
  }

  const tiempo = formatear(msRestantes)
  if (!tiempo) return <EstadoCerrado />

  return <EstadoAbierto tiempo={tiempo} />
}

function EstadoAbierto({ tiempo }: { tiempo: TiempoFormateado }) {
  const { display, urgencia } = tiempo

  const estilos: Record<Urgencia, { wrapper: string; text: string; icon: string; label: string }> = {
    normal: {
      wrapper: 'border-[#f59e0b]/20 bg-[#f59e0b]/5',
      text:    'text-[#8892a4]',
      icon:    '⏱',
      label:   'Cierra en:',
    },
    pronto: {
      wrapper: 'border-[#f59e0b]/40 bg-[#f59e0b]/8',
      text:    'text-[#f59e0b]',
      icon:    '⏱',
      label:   'Cierra en:',
    },
    urgente: {
      wrapper: 'border-[#f59e0b]/60 bg-[#f59e0b]/10 animate-pulse',
      text:    'text-[#f59e0b] font-bold',
      icon:    '⚠',
      label:   'Cierra en:',
    },
    critico: {
      wrapper: 'border-[#ef4444]/60 bg-[#ef4444]/10 countdown-critico',
      text:    'text-[#ef4444] font-bold',
      icon:    '🚨',
      label:   '¡Cierra en:',
    },
  }

  const e = estilos[urgencia]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] ${e.wrapper}`}
    >
      <span>{e.icon}</span>
      <span className={e.text}>
        {e.label} {urgencia === 'critico' ? `${display}!` : display}
      </span>
    </span>
  )
}

function EstadoCerrado() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#ef4444]/40 bg-[#ef4444]/10 text-[10px] text-[#ef4444] font-bold">
      🔒 Apuestas cerradas
    </span>
  )
}
