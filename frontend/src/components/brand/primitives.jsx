// Shared design primitives for the Parallax premium look — palette, fonts, and
// the small building blocks (Label, SectionHead, glows, glass card) used across
// the redesigned pages. Single source of truth lifted from the Landing port.

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export const C = {
  bg: '#06090F',
  bg2: '#0A0E17',
  surface: 'rgba(16,24,43,0.55)',
  surfaceHi: 'rgba(20,28,48,0.85)',
  line: 'rgba(255,255,255,0.07)',
  lineStrong: 'rgba(255,255,255,0.14)',
  red: '#FF6B7A',
  blue: '#4CC2FF',
  violet: '#9B7DFF',
  green: '#3DD68C',
  amber: '#F4B740',
  text: '#F0F4FF',
  text2: '#A9B4C7',
  dim: '#5B6679',
}

export const display = "'Orbitron', sans-serif"
export const body = "'Inter', sans-serif"
export const mono = "'JetBrains Mono', ui-monospace, monospace"

export function Label({ children, color = C.text2, size = 11, style }) {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: size,
        color,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function GhostGrid() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        pointerEvents: 'none',
      }}
    />
  )
}

export function AmbientGlows() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 900,
          height: 900,
          background: `radial-gradient(circle, ${C.red}1a, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -300,
          right: -200,
          width: 1000,
          height: 1000,
          background: `radial-gradient(circle, ${C.blue}1a, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

export function SectionHead({ index, kicker, title, body: bodyText, align = 'center' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 880,
        margin: align === 'center' ? '0 auto' : 0,
        textAlign: align,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{
          display: 'flex',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {index && (
          <Label color={C.violet} size={11}>
            {index}
          </Label>
        )}
        {index && <span style={{ width: 32, height: 1, background: C.lineStrong }} />}
        <Label color={C.text2} size={11}>
          {kicker}
        </Label>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.1 }}
        style={{
          fontFamily: body,
          fontWeight: 700,
          fontSize: 'clamp(40px, 5vw, 64px)',
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
          margin: 0,
          color: C.text,
        }}
      >
        {title}
      </motion.h2>
      {bodyText && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ fontFamily: body, fontSize: 18, color: C.text2, lineHeight: 1.6, margin: 0 }}
        >
          {bodyText}
        </motion.p>
      )}
    </div>
  )
}

export function GlassCard({ children, accent, className, style }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: accent
          ? `linear-gradient(180deg, ${accent}10, transparent), ${C.surface}`
          : C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
