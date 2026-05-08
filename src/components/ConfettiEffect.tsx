import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface Props {
  trigger: boolean
}

export default function ConfettiEffect({ trigger }: Props) {
  useEffect(() => {
    if (!trigger) return

    const colors  = ['#FFD700', '#FFA500', '#E5202E', '#00BFFF']
    const end     = Date.now() + 3000

    const frame = () => {
      confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [trigger])

  return null
}
