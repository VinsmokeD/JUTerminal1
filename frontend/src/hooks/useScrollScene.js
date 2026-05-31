import { useRef } from 'react'
import { useScroll, useTransform } from 'framer-motion'

/**
 * useScrollScene — generic scroll-progress → value mapper.
 *
 * Tracks the scroll progress of a ref element and maps it to an output range.
 * Useful for parallax, camera dolly, scrub-linked animations.
 *
 * Usage:
 *   const { ref, value } = useScrollScene({ output: [0, -80] })
 *   <motion.div ref={ref} style={{ y: value }}>…</motion.div>
 *
 * @param {number[]} input   progress range (default [0, 1])
 * @param {number[]} output  output value range (default [0, 0])
 * @param {string[]} offset  scroll offset relative to viewport (framer convention)
 */
export default function useScrollScene({
  input  = [0, 1],
  output = [0, 0],
  offset = ['start end', 'end start'],
} = {}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset })
  const value = useTransform(scrollYProgress, input, output)

  return { ref, value, scrollYProgress }
}
