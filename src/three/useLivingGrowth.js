import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const GROW_DURATION = 1.1
const GUST_FREQ = 0.18
const GUST_AMP = 0.05

export function easeOutBack(x) {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

// Shared "comes to life" behavior for anything planted in the bouquet: pops
// in with an overshoot ease (staggered by `delay`) instead of appearing at
// full size instantly, then sways forever afterward - a shared slow gust
// every instance feels together, plus its own per-instance flutter so
// nothing moves in perfect unison.
export function useLivingGrowth(delay, rng) {
  const groupRef = useRef()
  const draw = rng ?? Math.random
  const wind = useMemo(
    () => ({
      phase: draw() * Math.PI * 2,
      freq: 0.55 + draw() * 0.6,
      amp: 0.022 + draw() * 0.03,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    if (!group.userData.done) {
      group.userData.elapsed = (group.userData.elapsed ?? 0) + delta
      const localT = (group.userData.elapsed - delay) / GROW_DURATION
      if (localT > 0) {
        const clamped = Math.min(1, localT)
        group.scale.setScalar(Math.max(0.001, easeOutBack(clamped)))
        if (clamped >= 1) group.userData.done = true
      }
    }

    const t = state.clock.elapsedTime
    const { phase, freq, amp } = wind
    const gust = Math.sin(t * GUST_FREQ)
    group.rotation.x = gust * GUST_AMP + amp * Math.sin(t * freq + phase)
    group.rotation.z = gust * GUST_AMP * 0.6 + amp * 0.8 * Math.cos(t * freq * 1.4 + phase * 1.3)
  })

  return groupRef
}
