import { useCallback, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { useReducedMotionSafe, MOTION } from '../lib/motion'

/**
 * useMagnetic — spring-based magnetic pull for interactive elements.
 *
 * Returns { ref, x, y, bind } where x/y are MotionValues to apply to a
 * motion.div via style={{ x, y }}, and bind spreads the event handlers.
 *
 * Auto-disabled under reduced-motion / perf=low — x/y stay at 0.
 */
export default function useMagnetic({
  strength = MOTION.magnetic.strength,
  radius   = MOTION.magnetic.radius,
} = {}) {
  const reduced = useReducedMotionSafe()
  const ref = useRef(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { damping: 22, stiffness: 220 })
  const y = useSpring(rawY, { damping: 22, stiffness: 220 })

  const onMouseMove = useCallback(
    (e) => {
      if (reduced) return
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radius) {
        const factor = (1 - dist / radius) * strength
        rawX.set(dx * factor)
        rawY.set(dy * factor)
      }
    },
    [reduced, radius, strength, rawX, rawY],
  )

  const onMouseLeave = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  return { ref, x, y, bind: { ref, onMouseMove, onMouseLeave } }
}
