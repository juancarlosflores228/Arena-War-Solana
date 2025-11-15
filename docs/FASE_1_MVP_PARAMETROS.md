# 🟩 FASE 1 — Parámetros Oficiales del MVP  
## Arena War Solana — Plataforma de Torneos Descentralizados

---

## 🎯 1. Moneda Oficial del MVP  
Para simplificar el desarrollo y evitar oráculos:

### ✔ Moneda seleccionada: **SOL**

**Razones:**
- No requiere price feeds.
- Comisiones muy bajas.
- Compatible con Phantom, OKX, Backpack, etc.
- Facilita un MVP rápido y estable.

*(En fases futuras se integrará USDC como opción secundaria.)*

---

## 👥 2. Límite de Jugadores por Torneo

### ✔ Máximo inicial: **20 jugadores**  
Perfecto para torneos rápidos transmitidos en TikTok Live.

---

## 💵 3. Precio de Entrada

- **Entrada mínima:** `0.05 SOL`  
  (alineado con el mínimo de compra en Bitso)
- **Entrada por defecto (recomendada):** `0.05 SOL`
- **Rango permitido:** `0.05 SOL` → `0.20 SOL`

Esto evita torneos con entradas demasiado pequeñas o abusivas.

---

## 🧾 4. Fee del Organizador

El organizador recibe un buen incentivo por armar el torneo:

- **Fee fijo del organizador:** `10%` de cada entrada.

Este 10% se toma de cada pago de entrada y va directo al organizador.

---

## 🏛️ 5. Fee de la Plataforma (tu ganancia)

- **Fee fijo de la plataforma:** `1%` de cada entrada.

Este 1% se toma de cada pago de entrada y va directo a la cuenta/treasury de la plataforma.

---

## 🧮 6. Distribución del Dinero por Entrada

Por cada entrada pagada:

- **1%** → plataforma  
- **10%** → organizador  
- **89%** → `prize_pool` (fondo de premios)

Cuando termina el torneo, ese `prize_pool` se reparte entre los ganadores.

---

## 🏆 7. Distribución de Premios (sobre el prize_pool)

El contrato pagará los premios **on-chain** así:

- 1er lugar → **50% del prize_pool**  
- 2do lugar → **30% del prize_pool**  
- 3er lugar → **20% del prize_pool**

---

## 🔄 8. Estados del Torneo

El smart contract manejará estos estados:

- `Open` – aceptando jugadores  
- `Ongoing` – en curso  
- `Finished` – ganadores definidos  
- `Cancelled` – no se completó  
- `PrizesPaid` – premios pagados correctamente

---

## 💬 9. Comentarios del Torneo

Cualquier jugador puede comentar.

- Máximo **140 caracteres** por comentario  
- Máximo **10 comentarios** por torneo  

Campos:
