// Reveal — lightweight in-view fade/translate wrapper for non-pinned sections.
// Uses framer-motion useInView + the shared lib/motion presets. Respects
// reduced-motion automatically (presets collapse to near-instant under the
// global [data-animations="reduced"] CSS + useReducedMotionSafe-driven variants).

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { sectionReveal, useReducedMotionSafe } from '../../lib/motion'

export default function Reveal({
  as = 'div',
  variants = sectionReveal,
  once = true,
  margin = '-100px',
  className,
  style,
  children,
  ...rest
}) {
  const ref = useRef(null)
  const reduced = useReducedMotionSafe()
  const inView = useInView(ref, { once, margin })
  const M = motion[as] || motion.div

  if (reduced) {
    const Static = as
    return (
      <Static ref={ref} className={className} style={style}>
        {children}
      </Static>
    )
  }

  return (
    <M
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </M>
  )
}
