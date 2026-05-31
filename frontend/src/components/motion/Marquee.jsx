import { useReducedMotionSafe } from '../../lib/motion'

/**
 * Marquee — CSS-animated infinite scroll strip.
 *
 * Uses a CSS @keyframes animation (cs-marquee-scroll, defined in index.css).
 * Pauses on hover/focus for accessibility.
 * Falls back to a static flex row under reduced-motion / perf=low.
 *
 * Props:
 *   duration     total loop duration in seconds (default 32)
 *   gap          gap between items (CSS value, default '3rem')
 *   direction    'left' | 'right' (default 'left')
 *   pauseOnHover pause animation on mouse hover + focus (default true)
 *   className    extra classes on the outer overflow:hidden wrapper
 */
export default function Marquee({
  children,
  duration     = 32,
  gap          = '3rem',
  direction    = 'left',
  pauseOnHover = true,
  className    = '',
}) {
  const reduced = useReducedMotionSafe()

  if (reduced) {
    return (
      <div className={`flex flex-wrap justify-center items-center ${className}`} style={{ gap }}>
        {children}
      </div>
    )
  }

  const trackStyle = {
    display: 'flex',
    width: 'max-content',
    gap,
    animation: `cs-marquee-scroll ${duration}s linear infinite`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
    willChange: 'transform',
  }

  const hoverClass = pauseOnHover
    ? 'hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]'
    : ''

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div style={trackStyle} className={hoverClass}>
        {children}
        {children}
      </div>
    </div>
  )
}
