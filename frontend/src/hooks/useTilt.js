import { useCallback, useRef } from 'react'

/**
 * useTilt — 2.5D mouse-tilt parallax for any element.
 *
 * Spreads three handlers onto a target via `bind`:
 *   - onMouseMove: writes --rx, --ry, --mx, --my CSS vars
 *   - onMouseLeave: resets
 *   - ref: attached to the target
 *
 * Apply CSS:
 *   .your-card { transform-style: preserve-3d; will-change: transform; }
 *   .your-card { transform: perspective(1000px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); }
 *
 * Performance: ~3 vars + 1 paint per mousemove. No render. ~free.
 */
export default function useTilt({ maxTilt = 6, spotlight = true } = {}) {
  const ref = useRef(null)

  const onMouseMove = useCallback((e) => {
    const isLowPerf = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'low'
    if (isLowPerf) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const ry = (px - 0.5) * (maxTilt * 2)
    const rx = -(py - 0.5) * (maxTilt * 2)
    el.style.setProperty('--rx', `${rx}deg`)
    el.style.setProperty('--ry', `${ry}deg`)
    if (spotlight) {
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    }
  }, [maxTilt, spotlight])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])

  return { ref, bind: { ref, onMouseMove, onMouseLeave } }
}
