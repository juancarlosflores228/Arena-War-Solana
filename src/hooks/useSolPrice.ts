import { useEffect, useState } from 'react'

export function useSolPrice() {
  const [price, setPrice]     = useState<number>(150) // fallback mientras carga
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        )
        const data = await response.json()
        setPrice(data.solana.usd)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching SOL price:', error)
        setLoading(false)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 120_000) // cada 2 min
    return () => clearInterval(interval)
  }, [])

  return { price, loading }
}
