import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

/**
 * Performance tier classifier — used by every 3D surface to auto-degrade.
 *
 *   tier 0 → static SVG fallback (reduced-motion or very weak device / perf=low)
 *   tier 1 → 30fps cap, no postFX, low particle count
 *   tier 2 → 60fps target, no postFX
 *   tier 3 → 60fps + postFX (bloom etc.)
 *
 * User override (settingsStore.perfMode):
 *   'low'  → always tier 0 (disables 3D, blur, looping animations via data-perf attr)
 *   'high' → always tier 3 (no auto-downgrade)
 *   'auto' → auto-detect + FPS downgrade loop (original behaviour)
 *
 * The data-perf="low" HTML attribute is managed by settingsStore and drives CSS overrides.
 */

const Ctx = createContext(3)

function classifyAuto() {
  if (typeof window === 'undefined') return 3
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0
  const cores = navigator.hardwareConcurrency ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const dpr = window.devicePixelRatio ?? 1
  if (coarse) return 1
  if (cores < 4) return 1
  if (dpr > 2.5) return 2
  return 3
}

export function PerfTier({ children }) {
  const perfMode = useSettingsStore((s) => s.perfMode)

  // Resolved initial tier from user override or auto-detect
  const initial = useMemo(() => {
    if (perfMode === 'low') return 0
    if (perfMode === 'high') return 3
    return classifyAuto()
  }, [perfMode])

  const [tier, setTier] = useState(initial)

  // Sync when user changes perfMode in Settings
  useEffect(() => {
    if (perfMode === 'low') { setTier(0); return }
    if (perfMode === 'high') { setTier(3); return }
    setTier(classifyAuto())
  }, [perfMode])

  // FPS downgrade loop — only active in 'auto' mode
  useEffect(() => {
    if (perfMode !== 'auto') return
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
  }, [perfMode])

  return <Ctx.Provider value={tier}>{children}</Ctx.Provider>
}

export function usePerfTier() {
  return useContext(Ctx)
}

export default PerfTier
