import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useCursorStore } from '../../store/cursorStore'
import { useReducedMotionSafe } from '../../lib/motion'

const COLOR = { red: '#ff3b3b', blue: '#4CC2FF', neutral: '#9B7DFF' }

/**
 * ReticleCursor — global crosshair cursor with red/blue tinting and contextual labels.
 *
 * Disabled inside /session/** (workspace routes need native cursor precision).
 * Disabled under reduced-motion / perf=low.
 *
 * Mount once at app shell level inside <BrowserRouter> so useLocation is available.
 * Adds/removes `data-cursor-hidden` on <html> to hide the native pointer via CSS.
 */
export default function ReticleCursor() {
  const { pathname } = useLocation()
  const reduced = useReducedMotionSafe()
  // Selector subscriptions — component re-renders only on intent/label/mode
  // changes, never on position (position lives in motion values, not the store).
  const intent = useCursorStore((s) => s.intent)
  const label  = useCursorStore((s) => s.label)
  const mode   = useCursorStore((s) => s.mode)
  const resetCursor = useCursorStore((s) => s.resetCursor)

  const px = useMotionValue(-200)
  const py = useMotionValue(-200)
  const ringX = useSpring(px, { damping: 26, stiffness: 190 })
  const ringY = useSpring(py, { damping: 26, stiffness: 190 })

  const isWorkspace = pathname.startsWith('/session/')
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const disabled = reduced || isWorkspace || isTouch

  // Single document-level mousemove — position drives motion values only,
  // no store writes, no React re-renders per frame.
  useEffect(() => {
    const html = document.documentElement
    if (disabled) {
      html.removeAttribute('data-cursor-hidden')
      return
    }
    html.setAttribute('data-cursor-hidden', '')
    const move = (e) => {
      px.set(e.clientX)
      py.set(e.clientY)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => {
      window.removeEventListener('mousemove', move)
      html.removeAttribute('data-cursor-hidden')
    }
  }, [disabled, px, py])

  // Reset intent on route change so a hovered card/button label never sticks
  // across pages when navigation fires before onMouseLeave.
  useEffect(() => { resetCursor() }, [pathname, resetCursor])

  if (disabled) return null

  const color = COLOR[mode] ?? COLOR.neutral
  const engaged = intent !== 'default'
  const ringSize = engaged ? 42 : 26

  return (
    <>
      {/* Inner dot — no lag */}
      <motion.div
        className="fixed pointer-events-none z-[99999] mix-blend-difference"
        style={{
          x: px,
          y: py,
          translateX: '-50%',
          translateY: '-50%',
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />

      {/* Outer ring — spring-lagged */}
      <motion.div
        className="fixed pointer-events-none z-[99998]"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
      >
        <motion.div
          animate={{
            width: ringSize,
            height: ringSize,
            borderColor: color,
            opacity: engaged ? 0.85 : 0.45,
          }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            borderRadius: '50%',
            border: '1px solid',
            borderColor: color,
          }}
        >
          {/* Crosshair ticks */}
          {[
            { top: 0,    left: '50%', width: 1, height: '35%', translateX: '-50%' },
            { bottom: 0, left: '50%', width: 1, height: '35%', translateX: '-50%' },
            { left: 0,   top: '50%',  height: 1, width: '35%', translateY: '-50%' },
            { right: 0,  top: '50%',  height: 1, width: '35%', translateY: '-50%' },
          ].map((s, i) => (
            <span key={i} style={{ position: 'absolute', backgroundColor: color, opacity: 0.55, ...s }} />
          ))}
        </motion.div>

        {/* Contextual label */}
        <AnimatePresence>
          {label && (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '110%',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 8,
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
