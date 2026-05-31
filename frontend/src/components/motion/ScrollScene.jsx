// ScrollScene — reusable pinned, scroll-driven "scene" generalizing the Landing
// Hero/Loop pattern: a tall outer wrapper + an inner sticky stage. The section
// holds (pins) while you scroll and its animation advances with scroll progress,
// then releases when complete.
//
// Usage (render-prop receives a `progress` MotionValue in [0,1]):
//   <ScrollScene pin={2}>
//     {({ progress }) => {
//       const y = useTransform(progress, [0, 1], [0, -200])
//       return <motion.div style={{ y }}>…</motion.div>
//     }}
//   </ScrollScene>
//
// Reduced-motion / perf-tier 0 → collapses to a normal static section and feeds
// `progress` fixed at 1 so children render their completed state.

import { useRef } from 'react'
import { useScroll, useMotionValue } from 'framer-motion'
import { useReducedMotionSafe } from '../../lib/motion'
import { usePerfTier } from '../ui/PerfTier'

export default function ScrollScene({
  pin = 2,
  offset = ['start start', 'end end'],
  className,
  style,
  stageStyle,
  children,
}) {
  const ref = useRef(null)
  const reduced = useReducedMotionSafe()
  const tier = usePerfTier()
  const flat = reduced || tier === 0

  const { scrollYProgress } = useScroll({ target: ref, offset })
  const flatProgress = useMotionValue(1)
  const progress = flat ? flatProgress : scrollYProgress

  const render = (p) => (typeof children === 'function' ? children({ progress: p, flat }) : children)

  if (flat) {
    return (
      <section ref={ref} className={className} style={style}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            ...stageStyle,
          }}
        >
          {render(progress)}
        </div>
      </section>
    )
  }

  return (
    <section
      ref={ref}
      className={className}
      style={{ position: 'relative', height: `${(1 + pin) * 100}vh`, ...style }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          ...stageStyle,
        }}
      >
        {render(progress)}
      </div>
    </section>
  )
}
