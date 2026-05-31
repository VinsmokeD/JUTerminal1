import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotionSafe } from '../../lib/motion'

const BOOT_KEY = 'px.boot.done'

const STEPS = [
  { label: 'Establishing secure channel',     ms: 550 },
  { label: 'Verifying credentials',           ms: 480 },
  { label: 'Allocating scenario namespace',   ms: 620 },
  { label: 'Synchronizing SIEM telemetry',    ms: 400 },
  { label: 'Systems online',                  ms: 250 },
]

const TOTAL_MS = STEPS.reduce((a, s) => a + s.ms, 0)

/**
 * BootHandshake â€” connection-establish 0 â†’ 100 % + dual red/blue curtain reveal.
 * Runs once per browser session via sessionStorage key `cs.boot.done`.
 * Under reduced-motion the children are rendered immediately (no animation).
 *
 * Wrap the entire app shell:
 *   <BootHandshake><YourApp /></BootHandshake>
 */
export default function BootHandshake({ children }) {
  const reduced = useReducedMotionSafe()

  const [done, setDone] = useState(() => {
    if (typeof sessionStorage === 'undefined') return true
    return reduced || sessionStorage.getItem(BOOT_KEY) === '1'
  })
  const [phase, setPhase] = useState('booting') // 'booting' | 'revealing' | 'done'
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (done) return

    let elapsed = 0
    const id = setInterval(() => {
      elapsed += 40
      const pct = Math.min(100, Math.round((elapsed / TOTAL_MS) * 100))
      setProgress(pct)

      let cum = 0
      for (let i = 0; i < STEPS.length; i++) {
        cum += STEPS[i].ms
        if (elapsed <= cum) { setStepIdx(i); break }
      }

      if (elapsed >= TOTAL_MS) {
        clearInterval(id)
        setProgress(100)
        setStepIdx(STEPS.length - 1)
        // Short hold at 100%, then curtain splits open
        setTimeout(() => setPhase('revealing'), 320)
        setTimeout(() => {
          sessionStorage.setItem(BOOT_KEY, '1')
          setDone(true)
        }, 320 + 900)
      }
    }, 40)

    return () => clearInterval(id)
  }, [done])

  return (
    <>
      {/* display:none until boot completes â€” prevents IntersectionObserver from
          firing on hidden content and playing hero reveals behind the curtain */}
      <div style={done ? undefined : { display: 'none' }}>
        {children}
      </div>

      <AnimatePresence>
        {!done && (
          <motion.div
            key="boot"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          >
            {/* Left curtain (red-tinted) */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-1/2"
              initial={{ x: 0 }}
              animate={phase === 'revealing' ? { x: '-101%' } : { x: 0 }}
              transition={{ duration: 0.78, ease: [0.76, 0, 0.24, 1] }}
              style={{
                background: 'linear-gradient(90deg, #070408, #0d060b)',
                borderRight: '1px solid rgba(255,59,59,0.18)',
              }}
            />
            {/* Right curtain (blue-tinted) */}
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-1/2"
              initial={{ x: 0 }}
              animate={phase === 'revealing' ? { x: '101%' } : { x: 0 }}
              transition={{ duration: 0.78, ease: [0.76, 0, 0.24, 1] }}
              style={{
                background: 'linear-gradient(270deg, #040710, #060b16)',
                borderLeft: '1px solid rgba(76,194,255,0.18)',
              }}
            />

            {/* Boot UI â€” centered */}
            <div className="relative z-10 text-center space-y-8 px-8 max-w-xs w-full select-none">
              {/* Logo mark */}
              <div className="flex items-center justify-center gap-3">
                <img src="/brand/parallax-icon.svg" alt="" aria-hidden="true" className="w-10 h-10 flex-shrink-0" />
                <span className="font-display font-bold text-txt-primary tracking-[0.15em] text-sm">
                  PARALLAX
                </span>
              </div>

              {/* Progress number */}
              <div className="font-mono text-6xl font-bold tabular-nums text-txt-primary">
                {String(progress).padStart(3, '0')}
                <span className="text-2xl text-txt-dim font-normal">%</span>
              </div>

              {/* Progress bar â€” dual-color gradient */}
              <div className="relative h-[2px] w-full bg-surface-3 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.04, ease: 'linear' }}
                  style={{
                    background: `linear-gradient(90deg, #ff3b3b, #9B7DFF ${progress / 2}%, #4CC2FF)`,
                  }}
                />
              </div>

              {/* Step label */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={stepIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="font-mono text-[11px] text-txt-dim tracking-widest"
                >
                  {'> '}{STEPS[stepIdx]?.label ?? ''}
                  <span className="animate-pulse">_</span>
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
