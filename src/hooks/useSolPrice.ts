import { useEffect, useState } from 'react'

async function fetchSolPrice(): Promise<number> {
  // Primary: Jupiter Aggregator
  try {
    const res  = await fetch('https://price.jup.ag/v4/price?ids=SOL')
    const data = await res.json()
    const p = data?.data?.SOL?.price
    if (typeof p === 'number' && p > 0) return p
  } catch { /* fall through */ }

  // Fallback: Binance
  try {
    const res  = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT')
    const data = await res.json()
    const p = parseFloat(data?.price)
    if (!isNaN(p) && p > 0) return p
  } catch { /* fall through */ }

  return 0 // both APIs down; keep existing price
}

export function useSolPrice() {
  const [price, setPrice]     = useState<number>(73) // fallback mientras carga
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refresh = async () => {
      const p = await fetchSolPrice()
      if (p > 0) setPrice(p)
      setLoading(false)
    }

    refresh()
    const interval = setInterval(refresh, 120_000) // cada 2 min
    return () => clearInterval(interval)
  }, [])

  return { price, loading }
}
