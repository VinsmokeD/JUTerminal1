import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Performance tier classifier — used by every 3D surface to auto-degrade.
 *
 *   tier 0 → static SVG fallback (reduced-motion or very weak device)
 *   tier 1 → 30fps cap, no postFX, low particle count
 *   tier 2 → 60fps target, no postFX
 *   tier 3 → 60fps + postFX (bloom etc.)
 *
 * Components read tier via usePerfTier() and adapt themselves.
 * The provider also tracks rolling FPS and downgrades on stalls.
 */

const Ctx = createContext(3)

function classify() {
  if (typeof window === 'undefined') return 3
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0
  const cores = navigator.hardwareConcurrency ?? 4
  const dpr = window.devicePixelRatio ?? 1
  // Coarse pointer = likely mobile/tablet → tier 1 max
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  if (coarse) return 1
  if (cores < 4) return 1
  if (dpr > 2.5) return 2
  return 3
}

export function PerfTier({ children }) {
  const initial = useMemo(classify, [])
  const [tier, setTier] = useState(initial)

  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf
    let stalls = 0

    const tick = (now) => {
      frames++
      const dt = now - last
      if (dt >= 1000) {
        const fps = (frames * 1000) / dt
        frames = 0
        last = now
        if (fps < 38) {
          stalls++
          if (stalls >= 2) {
            setTier((t) => Math.max(0, t - 1))
            stalls = 0
          }
        } else {
          stalls = 0
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <Ctx.Provider value={tier}>{children}</Ctx.Provider>
}

export function usePerfTier() {
  return useContext(Ctx)
}

export default PerfTier
