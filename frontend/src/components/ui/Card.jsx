import { useRef, useCallback } from 'react'

/**
 * Card — surface container.
 *
 * Props:
 *   interactive  — adds pointer cursor + hover lift
 *   tilt         — enables 2.5D mouse-tilt parallax (use sparingly; CSS-only, free)
 *   spotlight    — radial cursor-following highlight on hover
 *   accent       — 'red' | 'blue' | 'amber' | 'green' adds a 2px bottom accent strip
 *   className    — extra classes
 */
export default function Card({
  interactive = false,
  tilt = false,
  spotlight = false,
  accent,
  className = '',
  children,
  onClick,
  ...rest
}) {
  const ref = useRef(null)

  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    if (spotlight) {
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    }
    if (tilt) {
      const ry = (px - 0.5) * 8     // ±4deg
      const rx = -(py - 0.5) * 8
      el.style.setProperty('--rx', `${rx}deg`)
      el.style.setProperty('--ry', `${ry}deg`)
    }
  }, [tilt, spotlight])

  const onLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (tilt) {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
  }, [tilt])

  const cls = [
    'card-v3',
    interactive && 'card-v3-interactive',
    spotlight && 'card-v3-spotlight',
    tilt && 'tilt-target',
    className,
  ].filter(Boolean).join(' ')

  const accentBar = accent && (
    <span
      aria-hidden
      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-cs-lg"
      style={{
        background: {
          red:   'linear-gradient(90deg, #ff3b3b, #ffaa00)',
          blue:  'linear-gradient(90deg, #3b8bff, #00ff88)',
          amber: 'linear-gradient(90deg, #ffaa00, #ff3b3b)',
          green: 'linear-gradient(90deg, #00ff88, #3b8bff)',
        }[accent],
      }}
    />
  )

  return (
    <div
      ref={ref}
      className={cls}
      onMouseMove={(tilt || spotlight) ? onMove : undefined}
      onMouseLeave={(tilt || spotlight) ? onLeave : undefined}
      onClick={onClick}
      {...rest}
    >
      {children}
      {accentBar}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>
}
export function CardBody({ children, className = '' }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>
}
export function CardFooter({ children, className = '' }) {
  return <div className={`px-5 py-4 border-t border-cs-border ${className}`}>{children}</div>
}
