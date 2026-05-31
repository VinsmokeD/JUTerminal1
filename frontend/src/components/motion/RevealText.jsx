import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { wordRevealContainer, wordRevealItem, useReducedMotionSafe } from '../../lib/motion'
import useSplitText from '../../hooks/useSplitText'

// Build the correct motion element from the `as` tag
const motionEl = (tag) => motion[tag] ?? motion.div

/**
 * RevealText — line/word clip-path masked entrance, scroll-triggered.
 *
 * Splits `children` (must be a plain string) into words and animates each
 * word in with a clip-path bottom-reveal stagger. Falls back to instant render
 * under reduced-motion / perf=low.
 *
 * Usage:
 *   <RevealText as="h1" className="text-6xl font-bold" stagger={0.08}>
 *     Attack. Defend. Simultaneously.
 *   </RevealText>
 *
 * Props:
 *   as       element tag (default: 'div')
 *   stagger  per-word delay in seconds (default: 0.07)
 *   delay    overall delay before stagger starts (default: 0)
 *   once     trigger only first time in view (default: true)
 */
export default function RevealText({
  children,
  as: Tag = 'div',
  className = '',
  stagger = 0.07,
  delay   = 0,
  once    = true,
}) {
  const reduced = useReducedMotionSafe()
  const ref = useRef(null)
  // amount-based trigger (fraction visible). NOTE: a percentage `margin`
  // rootMargin here silently failed to ever fire → words stuck hidden.
  const isInView = useInView(ref, { once, amount: 0.15 })
  const text = typeof children === 'string' ? children : ''
  const { words } = useSplitText(text)

  // Fallback — instant render for reduced-motion / no text
  if (reduced || !words || !text) {
    return <Tag className={className}>{children}</Tag>
  }

  const container = wordRevealContainer(stagger)
  if (delay) {
    container.visible = {
      ...container.visible,
      transition: { staggerChildren: stagger, delayChildren: delay },
    }
  }

  const MotionTag = motionEl(Tag)

  return (
    <MotionTag
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
      style={{ display: 'block' }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            verticalAlign: 'bottom',
          }}
        >
          <motion.span variants={wordRevealItem} style={{ display: 'inline-block' }}>
            {word}
          </motion.span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </MotionTag>
  )
}
