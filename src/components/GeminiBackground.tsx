import { useEffect, useRef } from 'react'

export default function GeminiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    // ── Particle config ──────────────────────────────────────────────────
    const COLORS = [
      'rgba(168, 85,  247,',   // purple-500
      'rgba(147, 51,  234,',   // purple-600
      'rgba(192, 132, 252,',   // purple-400
      'rgba(109, 40,  217,',   // purple-700
      'rgba(99,  102, 241,',   // indigo-500
      'rgba(124, 58,  237,',   // violet-600
      'rgba(79,  70,  229,',   // indigo-600
      'rgba(216, 180, 254,',   // purple-300 (bright stars)
    ]

    interface Dot {
      x: number; y: number
      r: number; baseOpacity: number
      speed: number; phase: number
      color: string
    }

    const dots: Dot[] = Array.from({ length: 2000 }, () => {
      // Cluster mostly in upper 65% — sparse toward bottom (like Gemini)
      const yBias = Math.pow(Math.random(), 1.6)
      return {
        x:           Math.random() * W,
        y:           yBias * H * 0.70,
        r:           Math.random() * 1.2 + 0.2,
        baseOpacity: Math.random() * 0.55 + 0.15,
        speed:       Math.random() * 1.5  + 0.4,
        phase:       Math.random() * Math.PI * 2,
        color:       COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    let t = 0

    function frame() {
      ctx.clearRect(0, 0, W, H)

      // ── Base gradient: deep purple top → midnight blue → arena-bg ──────
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0,    '#0a0018')  // deep dark purple
      bg.addColorStop(0.25, '#0e0525')  // dark violet
      bg.addColorStop(0.55, '#060d1e')  // midnight blue
      bg.addColorStop(1,    '#080B10')  // matches body
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // ── Top-center radial bloom (main Gemini glow) ───────────────────
      const bloom = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.75)
      bloom.addColorStop(0,   'rgba(130, 40, 220, 0.28)')
      bloom.addColorStop(0.35,'rgba(80,  20, 160, 0.14)')
      bloom.addColorStop(0.7, 'rgba(30,  10,  80, 0.06)')
      bloom.addColorStop(1,   'rgba(0,    0,   0, 0)')
      ctx.fillStyle = bloom
      ctx.fillRect(0, 0, W, H)

      // ── Left blue accent glow ────────────────────────────────────────
      const leftG = ctx.createRadialGradient(0, H * 0.25, 0, 0, H * 0.25, W * 0.45)
      leftG.addColorStop(0,  'rgba(50, 30, 140, 0.18)')
      leftG.addColorStop(1,  'rgba(0,   0,   0, 0)')
      ctx.fillStyle = leftG
      ctx.fillRect(0, 0, W, H)

      // ── Right purple accent glow ─────────────────────────────────────
      const rightG = ctx.createRadialGradient(W, H * 0.15, 0, W, H * 0.15, W * 0.4)
      rightG.addColorStop(0,  'rgba(100, 20, 180, 0.14)')
      rightG.addColorStop(1,  'rgba(0,    0,   0, 0)')
      ctx.fillStyle = rightG
      ctx.fillRect(0, 0, W, H)

      // ── Dots / particles ─────────────────────────────────────────────
      t += 0.012
      for (const d of dots) {
        const pulse     = Math.sin(t * d.speed + d.phase) * 0.35 + 0.65
        const fadeY     = Math.max(0, 1 - d.y / (H * 0.72))
        const alpha     = d.baseOpacity * pulse * fadeY

        // Dot core
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = d.color + alpha + ')'
        ctx.fill()

        // Soft halo around larger dots
        if (d.r > 1.0 && alpha > 0.25) {
          const halo = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4)
          halo.addColorStop(0,  d.color + (alpha * 0.35) + ')')
          halo.addColorStop(1,  d.color + '0)')
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2)
          ctx.fillStyle = halo
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(frame)
    }

    frame()

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
