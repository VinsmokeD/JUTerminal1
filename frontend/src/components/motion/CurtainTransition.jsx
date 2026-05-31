import { motion } from 'framer-motion'
import { useReducedMotionSafe } from '../../lib/motion'

/**
 * CurtainTransition — dual-panel red-left / blue-right page wipe.
 * Replaces RouteScannerWipe inside App.jsx RoutePage.
 *
 * Red and blue panels sweep from both sides, meet at center, then retreat —
 * all within the ~0.72s page-transition window of AnimatePresence mode="wait".
 *
 * Under reduced-motion / perf=low → cross-fade fallback (single opacity flash).
 */
export default function CurtainTransition() {
  const reduced = useReducedMotionSafe()

  if (reduced) {
    return (
      <motion.div
        className="fixed inset-0 z-[9998] pointer-events-none bg-void"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        aria-hidden="true"
      />
    )
  }

  const panelTransition = {
    duration: 0.72,
    times: [0, 0.38, 0.62, 1],
    ease: [0.76, 0, 0.24, 1],
  }

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none flex overflow-hidden" aria-hidden="true">
      {/* Red — left panel. NOTE: uses ASCII hyphen-minus, not U+2212 */}
      <motion.div
        className="w-1/2 h-full flex-shrink-0"
        initial={{ x: '-101%' }}
        animate={{ x: ['-101%', '0%', '0%', '-101%'] }}
        transition={panelTransition}
        style={{
          background: 'linear-gradient(90deg, #070408, #0f060c)',
          borderRight: '1px solid rgba(255,59,59,0.22)',
        }}
      />
      {/* Blue — right panel */}
      <motion.div
        className="w-1/2 h-full flex-shrink-0"
        initial={{ x: '101%' }}
        animate={{ x: ['101%', '0%', '0%', '101%'] }}
        transition={panelTransition}
        style={{
          background: 'linear-gradient(270deg, #040810, #060c18)',
          borderLeft: '1px solid rgba(76,194,255,0.22)',
        }}
      />
    </div>
  )
}
