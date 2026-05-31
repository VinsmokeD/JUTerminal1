import { useEffect, useRef } from 'react'
import { useReducedMotionSafe, MOTION } from '../lib/motion'
import { usePerfTier } from '../components/ui/PerfTier'

/**
 * Mounts Lenis smooth scroll. Auto-disabled under reduced-motion, perf=low,
 * or when the `disabled` flag is true (e.g. workspace routes).
 * Returns the Lenis instance ref for external use (e.g. framer useScroll sync).
 */
export default function useLenis({ disabled = false } = {}) {
  const lenisRef = useRef(null)
  const motionDisabled = useReducedMotionSafe()
  const tier = usePerfTier()
  const skip = disabled || motionDisabled

  useEffect(() => {
    if (skip) return

    const lerp =
      tier >= 3 ? MOTION.lenis.tier3
      : tier >= 2 ? MOTION.lenis.tier2
      : MOTION.lenis.tier1

    let lenis = null
    let raf = 0
    let cancelled = false

    // Lazy-load Lenis so the library never enters the main / workspace bundle —
    // it only downloads when smooth scroll actually activates (public/shell, capable, non-reduced).
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      lenis = new Lenis({ lerp, smoothWheel: true })
      lenisRef.current = lenis
      const tick = (time) => {
        lenis.raf(time)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      if (lenis) lenis.destroy()
      lenisRef.current = null
    }
  }, [skip, tier])

  return lenisRef
}
