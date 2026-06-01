import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
} from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePerfTier } from '../components/ui/PerfTier'
import { useReducedMotionSafe } from '../lib/motion'

/* ─────────────────── palette ─────────────────── */

const C = {
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

const display = "'Orbitron', sans-serif"
const body = "'Inter', sans-serif"
const mono = "'JetBrains Mono', ui-monospace, monospace"

const RED = '#FF6B7A'
const BLUE = '#4CC2FF'
const VIOLET = '#9B7DFF'
const NAVY = '#0A0E17'
const WHITE = '#F0F4FF'

/* ─────────────────── count-up hook ─────────────────── */

function useCountUp(target, duration = 1.6, inView) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const n = parseFloat(target)
    if (isNaN(n)) return
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min((t - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(n * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, duration])
  return isNaN(parseFloat(target)) ? target : val + (target.includes('%') ? '%' : '')
}

/* ─────────────────── logo atoms (inline SVG — tone aware) ─────────────────── */

function ParallaxMark({ size = 96, tone = 'color' }) {
  const sq = 60
  const offset = 24
  const x1 = 8
  const y1 = 8
  const x2 = x1 + offset
  const y2 = y1 + offset

  const redFill = tone === 'color' ? RED : tone === 'mono-light' ? WHITE : NAVY
  const blueFill = tone === 'color' ? BLUE : tone === 'mono-light' ? WHITE : NAVY
  const overlapFill = tone === 'color' ? VIOLET : tone === 'mono-light' ? WHITE : NAVY

  const overlapX = x2
  const overlapY = y2
  const overlapW = x1 + sq - x2
  const overlapH = y1 + sq - y2

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowBlue" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={x1}
        y={y1}
        width={sq}
        height={sq}
        fill={redFill}
        opacity={tone === 'color' ? 0.95 : 1}
        filter={tone === 'color' ? 'url(#glowRed)' : undefined}
      />
      <rect
        x={x2}
        y={y2}
        width={sq}
        height={sq}
        fill={blueFill}
        opacity={tone === 'color' ? 0.95 : 1}
        filter={tone === 'color' ? 'url(#glowBlue)' : undefined}
      />
      {tone === 'color' && (
        <rect x={overlapX} y={overlapY} width={overlapW} height={overlapH} fill={overlapFill} />
      )}
    </svg>
  )
}

function ParallaxWordmark({ size = 32, tone = 'color', bg = 'dark' }) {
  const baseColor =
    tone === 'color'
      ? bg === 'dark'
        ? WHITE
        : NAVY
      : tone === 'mono-light'
      ? WHITE
      : NAVY

  const firstA = tone === 'color' ? RED : baseColor
  const secondA = tone === 'color' ? BLUE : baseColor

  const letterStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 800,
    fontSize: size,
    letterSpacing: '0.15em',
    lineHeight: 1,
    color: baseColor,
    display: 'inline-flex',
  }

  return (
    <span style={letterStyle}>
      <span>P</span>
      <span style={{ color: firstA }}>A</span>
      <span>R</span>
      <span>A</span>
      <span>LL</span>
      <span style={{ color: secondA }}>A</span>
      <span>X</span>
    </span>
  )
}

/* ─────────────────── university lockup ─────────────────── */

function LogoChip({ src, alt, height }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: Math.round(height * 0.18),
        padding: `${Math.round(height * 0.16)}px ${Math.round(height * 0.22)}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
      />
    </div>
  )
}

function UniLogos({ height = 56, gap = 16 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <LogoChip src="/brand/uj-logo.png" alt="University of Jordan" height={height} />
      <LogoChip
        src="/brand/kasit-logo.png"
        alt="King Abdullah II School of Information Technology"
        height={height}
      />
    </div>
  )
}

/* ─────────────────── shared atoms ─────────────────── */

function Label({ children, color = C.text2, size = 11 }) {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: size,
        color,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}

function GhostGrid() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        pointerEvents: 'none',
      }}
    />
  )
}

function AmbientGlows() {
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

/* ─────────────────── NAV ─────────────────── */

function Nav({ go }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    ['Platform', '#platform'],
    ['Loop', '#loop'],
    ['Scenarios', '#scenarios'],
    ['Mentor', '#mentor'],
    ['Evidence', '#evidence'],
  ]

  return (
    <>
      <style>{`
        .lp-nav-links { display: flex; gap: 2px; overflow: hidden; }
        @media (max-width: 1100px) { .lp-nav-links { display: none; } .lp-nav-sep { display: none !important; } }
        .lp-hamburger { display: none; }
        @media (max-width: 1100px) { .lp-hamburger { display: flex; } }
      `}</style>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          padding: scrolled ? '10px 18px' : '10px 20px',
          background: scrolled ? 'rgba(10,14,23,0.78)' : 'rgba(10,14,23,0.4)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          border: `1px solid ${C.line}`,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transition: 'padding 0.3s ease, background 0.3s ease',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
          maxWidth: 'calc(100vw - 32px)',
          width: 'max-content',
          flexWrap: 'nowrap',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ParallaxMark size={22} />
          <span
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: 13,
              color: C.text,
              letterSpacing: '0.2em',
              whiteSpace: 'nowrap',
            }}
          >
            PARALLAX
          </span>
        </div>

        <span className="lp-nav-sep" style={{ width: 1, height: 16, background: C.line, flexShrink: 0 }} />

        <div className="lp-nav-links">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                fontFamily: body,
                fontSize: 12,
                color: C.text2,
                textDecoration: 'none',
                padding: '5px 10px',
                borderRadius: 999,
                transition: 'color 0.2s, background 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.text
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.text2
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Hamburger button — visible at <1100px */}
        <button
          className="lp-hamburger"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: 'none',
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ display: 'block', width: 18, height: 1.5, background: C.text2, borderRadius: 2 }}
            />
          ))}
        </button>

        <span className="lp-nav-sep" style={{ width: 1, height: 16, background: C.line, flexShrink: 0 }} />

        <button
          onClick={go}
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: C.bg,
            background: C.text,
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 600,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
          }}
        >
          Launch
        </button>
      </motion.nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 49,
            background: 'rgba(10,14,23,0.96)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 200,
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: body,
                fontSize: 14,
                color: C.text2,
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.text
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.text2
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {label}
            </a>
          ))}
        </motion.div>
      )}
    </>
  )
}

/* ─────────────────── HERO with scroll-zoom ─────────────────── */

function FloatingMark({ size, x, y, delay = 0, opacity = 1 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity, scale: 1 }}
      transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <ParallaxMark size={size} />
    </motion.div>
  )
}

function Hero({ go, reduced, tier }) {
  const ref = useRef(null)
  const { scrollYProgress: rawProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // Smooth out the raw scroll progress to avoid jank
  const scrollYProgress = useSpring(rawProgress, { stiffness: 100, damping: 30, mass: 0.5 })

  const scale = useTransform(scrollYProgress, [0, 1], [1, 6])
  // Headline stays readable until ~85% through the zoom
  const opacity = useTransform(scrollYProgress, [0, 0.5, 0.85], [1, 0.8, 0])
  const blur = useTransform(scrollYProgress, [0, 1], [0, 12])
  const blurFilter = useTransform(blur, (b) => `blur(${b}px)`)
  const yText = useTransform(scrollYProgress, [0, 1], [0, -120])
  // Scroll cue fades out early
  const scrollCueOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const sx = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const sy = useSpring(mouseY, { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (reduced) return
    const onMove = (e) => {
      // Cap at ±20 to avoid sloshy feel on widescreens
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      mouseX.set(x)
      mouseY.set(y)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mouseX, mouseY, reduced])

  const markStyle = reduced
    ? { position: 'absolute', inset: 0, willChange: 'transform' }
    : { position: 'absolute', inset: 0, scale, opacity, filter: blurFilter, x: sx, y: sy, willChange: 'transform' }

  const headlineLayout = {
    position: 'relative',
    zIndex: 2,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 24px',
  }
  const headlineStyle = reduced ? headlineLayout : { ...headlineLayout, y: yText, opacity }

  return (
    <section ref={ref} style={{ position: 'relative', minHeight: '200vh', background: C.bg }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
          // Ensure nothing in hero creates a stacking context above nav's z-index:50
          zIndex: 1,
        }}
      >
        <GhostGrid />
        {tier > 0 && <AmbientGlows />}

        <motion.div style={{ ...markStyle, pointerEvents: 'none', zIndex: 0 }}>
          <FloatingMark size={420} x="50%" y="50%" delay={0} opacity={1} />
          <FloatingMark size={120} x="22%" y="30%" delay={0.15} opacity={0.35} />
          <FloatingMark size={80} x="78%" y="74%" delay={0.25} opacity={0.3} />
          <FloatingMark size={48} x="86%" y="22%" delay={0.35} opacity={0.5} />
          <FloatingMark size={40} x="14%" y="78%" delay={0.4} opacity={0.5} />
        </motion.div>

        <motion.div style={headlineStyle}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ marginBottom: 28 }}
          >
            <Label color={C.dim}>// Cybersecurity training, rewritten</Label>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: display,
              fontWeight: 800,
              // Smaller cap so buttons stay above fold at 1440×900
              fontSize: 'clamp(48px, 7.5vw, 108px)',
              lineHeight: 0.95,
              letterSpacing: '-0.035em',
              margin: 0,
              maxWidth: 1200,
              color: C.text,
            }}
          >
            <span style={{ color: C.red, textShadow: `0 0 60px ${C.red}50` }}>Attack.</span>{' '}
            <span style={{ color: C.blue, textShadow: `0 0 60px ${C.blue}50` }}>Defend.</span>
            <br />
            <span
              style={{
                background: `linear-gradient(180deg, ${C.text} 30%, ${C.text2})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Simultaneously.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            style={{
              fontFamily: body,
              fontSize: 'clamp(15px, 1.3vw, 20px)',
              color: C.text2,
              maxWidth: 620,
              marginTop: 24,
              lineHeight: 1.55,
            }}
          >
            A dual-perspective cybersecurity training platform. Real tools on the red side, real
            telemetry on the blue side, one Socratic AI mentor between them — all inside a sandbox
            that resets in eight seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            style={{ display: 'flex', gap: 14, marginTop: 28 }}
          >
            <button
              onClick={go}
              style={{
                fontFamily: body,
                fontWeight: 600,
                fontSize: 14,
                color: C.bg,
                background: C.text,
                padding: '14px 28px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                position: 'relative',
                zIndex: 2,
              }}
            >
              Launch the demo →
            </button>
            <a
              href="#loop"
              style={{
                fontFamily: body,
                fontWeight: 500,
                fontSize: 14,
                color: C.text,
                background: 'transparent',
                border: `1px solid ${C.lineStrong}`,
                padding: '13px 28px',
                borderRadius: 999,
                textDecoration: 'none',
                position: 'relative',
                zIndex: 2,
              }}
            >
              See how it works
            </a>
          </motion.div>

          {/* Scroll cue — fades out once user starts scrolling */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 32,
              left: '50%',
              x: '-50%',
              opacity: reduced ? 0 : scrollCueOpacity,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={reduced ? {} : { y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <Label color={C.dim} size={9}>
                Scroll
              </Label>
              <div
                style={{
                  width: 1,
                  height: 28,
                  background: `linear-gradient(180deg, ${C.dim}, transparent)`,
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────────────── MARQUEE STRIP ─────────────────── */

function Marquee({ reduced, tier }) {
  const items = [
    'PTES Methodology',
    'MITRE ATT&CK',
    'OWASP Top 10',
    'NIST CSF 2.0',
    'Suricata · Filebeat',
    'Elasticsearch',
    'ModSecurity WAF',
    'Active Directory',
    'Docker · Isolated',
    'Socratic AI',
  ]

  const [hovered, setHovered] = useState(false)

  if (tier === 0) return null

  const duration = hovered ? 80 : 38
  const animate = reduced ? {} : { x: ['0%', '-50%'] }
  const transition = reduced
    ? {}
    : { duration, ease: 'linear', repeat: Infinity }

  return (
    <div
      style={{
        position: 'relative',
        padding: '40px 0',
        borderTop: `1px solid ${C.line}`,
        borderBottom: `1px solid ${C.line}`,
        background: C.bg2,
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={animate}
        transition={transition}
        style={{
          display: 'flex',
          gap: 64,
          whiteSpace: 'nowrap',
          width: 'max-content',
          // Force GPU layer to prevent first-paint gap
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {[...items, ...items, ...items].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 64 }}>
            <span
              style={{
                fontFamily: mono,
                fontSize: 14,
                color: C.text2,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              {t}
            </span>
            <span style={{ color: C.violet, fontFamily: mono, fontSize: 14 }}>✦</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/* ─────────────────── SECTION HEAD ─────────────────── */

function SectionHead({ index, kicker, title, body: bodyText }) {
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
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}
      >
        <Label color={C.violet} size={11}>
          {index}
        </Label>
        <span style={{ width: 32, height: 1, background: C.lineStrong }} />
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

/* ─────────────────── PLATFORM PILLARS ─────────────────── */

function Platform({ reduced, tier }) {
  const pillars = [
    {
      label: 'RED',
      color: C.red,
      title: 'Attacker workspace',
      body: 'Full Kali terminal in the browser via xterm.js. PTES methodology gating prevents skipping recon. Pentest notes auto-save per target.',
      tags: ['xterm.js', 'Kali', 'PTES gating'],
    },
    {
      label: 'BLUE',
      color: C.blue,
      title: 'Defender SIEM',
      body: 'Live event feed driven by Suricata and Filebeat. Severity triage, MITRE ATT&CK tags, forensic markers — under two seconds of latency.',
      tags: ['Elastic', 'Suricata', 'MITRE'],
    },
    {
      label: 'AI',
      color: C.violet,
      title: 'Socratic mentor',
      body: 'Nudges, concepts, worked examples. Context-aware, PII-redacted, capped to 150 tokens. Never generates exploit payloads.',
      tags: ['OpenRouter', 'DeepSeek', 'Guardrailed'],
    },
  ]
  return (
    <section
      id="platform"
      style={{ padding: '180px 24px 120px', position: 'relative', background: C.bg }}
    >
      {tier > 0 && <AmbientGlows />}
      <div style={{ position: 'relative' }}>
        <SectionHead
          index="01"
          kicker="The platform"
          title={
            <>
              Three surfaces. <span style={{ color: C.violet }}>One causal loop.</span>
            </>
          }
          body="Most curricula teach attack and defense in separate rooms. PARALLAX puts them in the same one — and adds a mentor who watches."
        />

        <div
          style={{
            maxWidth: 1280,
            margin: '96px auto 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
          }}
        >
          {pillars.map((p, i) => (
            <PillarCard key={p.label} pillar={p} index={i} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PillarCard({ pillar, index, reduced }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={
        reduced
          ? undefined
          : (e) => {
              const r = cardRef.current.getBoundingClientRect()
              const x = (e.clientX - r.left) / r.width - 0.5
              const y = (e.clientY - r.top) / r.height - 0.5
              // ±10deg for visible 3D feel
              setTilt({ x: x * 10, y: y * -10 })
            }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setTilt({ x: 0, y: 0 })
        setHovered(false)
      }}
      style={{ perspective: 1200 }}
    >
      <motion.div
        ref={cardRef}
        animate={{
          rotateY: tilt.x,
          rotateX: tilt.y,
          z: hovered ? 30 : 0,
          boxShadow: hovered
            ? `0 30px 60px -20px ${pillar.color}40`
            : '0 0 0 0 transparent',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'relative',
          padding: 36,
          background: `linear-gradient(180deg, ${pillar.color}10, transparent), ${C.surface}`,
          border: `1px solid ${C.line}`,
          borderRadius: 18,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          minHeight: 380,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Glow halo — scales up on hover */}
        <motion.div
          animate={{ scale: hovered ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            background: `radial-gradient(circle, ${pillar.color}28, transparent 60%)`,
            pointerEvents: 'none',
            transformOrigin: 'center center',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: pillar.color,
                boxShadow: `0 0 16px ${pillar.color}`,
              }}
            />
            <Label color={pillar.color}>{pillar.label}</Label>
          </div>
          <h3
            style={{
              fontFamily: body,
              fontWeight: 700,
              fontSize: 30,
              color: C.text,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {pillar.title}
          </h3>
          <p
            style={{
              fontFamily: body,
              fontSize: 15,
              color: C.text2,
              lineHeight: 1.6,
              margin: 0,
              flex: 1,
            }}
          >
            {pillar.body}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pillar.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: C.text2,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────── LOOP / SCROLL-DRIVEN STICKY PIN ─────────────────── */

function Loop({ reduced }) {
  const ref = useRef(null)

  // Outer section is 300vh — the sticky inner pins for that full height
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Sequence is compressed into the first ~74% of the pinned scroll; the
  // remaining 0.74 → 1.0 is a HOLD where the fully-drawn loop stays pinned
  // and visible before the page releases and scrolls on.

  // Red attack arc — draws first, fully completes before blue starts
  const redPathLength = useTransform(scrollYProgress, [0.04, 0.26], [0, 1])
  const redOpacity = useTransform(scrollYProgress, [0, 0.08], [0, 1])

  // Blue defend arc — only begins after the red arc has finished drawing
  const bluePathLength = useTransform(scrollYProgress, [0.30, 0.52], [0, 1])
  const blueOpacity = useTransform(scrollYProgress, [0.28, 0.36], [0, 1])

  // Violet AI return arc — reveals last, then holds
  const aiPathLength = useTransform(scrollYProgress, [0.56, 0.74], [0, 1])
  const aiOpacity = useTransform(scrollYProgress, [0.54, 0.64], [0, 0.6])

  // One full revolution that completes as the sequence finishes, then holds
  const markRotate = useTransform(scrollYProgress, [0, 0.74], [0, 360])

  // Node lighting follows each arc as it draws
  const redNodeOpacity = useTransform(scrollYProgress, [0.06, 0.16], [0.12, 1])
  const blueNodeOpacity = useTransform(scrollYProgress, [0.30, 0.40], [0.12, 1])
  const aiNodeOpacity = useTransform(scrollYProgress, [0.56, 0.66], [0.12, 1])

  // Caption reveals — each appears with its phase and stays for the hold
  const cap1Opacity = useTransform(scrollYProgress, [0.08, 0.18], [0, 1])
  const cap1Y = useTransform(scrollYProgress, [0.08, 0.18], [12, 0])
  const cap2Opacity = useTransform(scrollYProgress, [0.32, 0.42], [0, 1])
  const cap2Y = useTransform(scrollYProgress, [0.32, 0.42], [12, 0])
  const cap3Opacity = useTransform(scrollYProgress, [0.56, 0.66], [0, 1])
  const cap3Y = useTransform(scrollYProgress, [0.56, 0.66], [12, 0])

  // For reduced motion, show everything statically
  const s = reduced
    ? {
        redPathLength: 1, redOpacity: 1,
        bluePathLength: 1, blueOpacity: 1,
        aiPathLength: 1, aiOpacity: 1,
        markRotate: 0,
        redNodeOpacity: 1, blueNodeOpacity: 1, aiNodeOpacity: 1,
        cap1Opacity: 1, cap1Y: 0, cap2Opacity: 1, cap2Y: 0, cap3Opacity: 1, cap3Y: 0,
      }
    : {
        redPathLength, redOpacity,
        bluePathLength, blueOpacity,
        aiPathLength, aiOpacity,
        markRotate,
        redNodeOpacity, blueNodeOpacity, aiNodeOpacity,
        cap1Opacity, cap1Y, cap2Opacity, cap2Y, cap3Opacity, cap3Y,
      }

  return (
    <section
      id="loop"
      ref={ref}
      style={{
        position: 'relative',
        // 300vh drives how long the sticky inner stays pinned
        minHeight: reduced ? 'auto' : '300vh',
        background: C.bg,
        scrollMarginTop: '80px',
      }}
    >
      <div
        style={{
          position: reduced ? 'relative' : 'sticky',
          top: 0,
          height: reduced ? 'auto' : '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: reduced ? '140px 0 120px' : '0',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          {/* Title stays full opacity for entire pinned duration */}
          <SectionHead
            index="02"
            kicker="The loop"
            title={
              <>
                <span style={{ color: C.red }}>One keystroke</span> →{' '}
                <span style={{ color: C.blue }}>one alert.</span>
              </>
            }
          />

          <div style={{ marginTop: 'clamp(28px, 5vh, 56px)', position: 'relative', height: 'clamp(260px, 38vh, 340px)' }}>
            <svg viewBox="0 0 1200 340" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
              {/* Red attack arc — draws first */}
              <motion.path
                d="M 120 170 Q 600 -60 1080 170"
                stroke={C.red}
                strokeWidth="1.5"
                fill="none"
                style={{
                  pathLength: s.redPathLength,
                  opacity: s.redOpacity,
                }}
              />
              {/* Blue defend arc — starts after red is done */}
              <motion.path
                d="M 1080 170 Q 600 400 120 170"
                stroke={C.blue}
                strokeWidth="1.5"
                fill="none"
                style={{
                  pathLength: s.bluePathLength,
                  opacity: s.blueOpacity,
                }}
              />
              {/* Violet AI return arc */}
              <motion.path
                d="M 400 290 Q 600 370 800 290"
                stroke={C.violet}
                strokeWidth="1"
                strokeDasharray="4 6"
                fill="none"
                style={{
                  pathLength: s.aiPathLength,
                  opacity: s.aiOpacity,
                }}
              />

              <LoopNodeDot cx={120}  cy={170} color={C.red}    label="KALI"     litOpacity={s.redNodeOpacity} />
              <LoopNodeDot cx={400}  cy={60}  color={C.red}    label="EXPLOIT"  litOpacity={s.redNodeOpacity} />
              <LoopNodeDot cx={800}  cy={60}  color={C.red}    label="PAYLOAD"  litOpacity={s.redNodeOpacity} />
              <LoopNodeDot cx={1080} cy={170} color={C.blue}   label="SURICATA" litOpacity={s.blueNodeOpacity} />
              <LoopNodeDot cx={800}  cy={290} color={C.blue}   label="ELASTIC"  litOpacity={s.blueNodeOpacity} />
              <LoopNodeDot cx={400}  cy={290} color={C.blue}   label="SIEM"     litOpacity={s.blueNodeOpacity} />
            </svg>

            {/* Centre mark — full revolution */}
            <motion.div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                x: '-50%',
                y: '-50%',
                rotate: s.markRotate,
                willChange: 'transform',
              }}
            >
              <ParallaxMark size={76} />
            </motion.div>
          </div>

          {/* Phase captions */}
          <div style={{ marginTop: 'clamp(24px, 4vh, 48px)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            <motion.div
              style={{ opacity: s.cap1Opacity, y: s.cap1Y, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <Label color={C.red}>01 · Attack</Label>
              <div style={{ fontFamily: body, fontWeight: 600, fontSize: 18, color: C.text, lineHeight: 1.35 }}>
                Student executes against an isolated container
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: s.cap2Opacity, y: s.cap2Y, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <Label color={C.blue}>02 · Detect</Label>
              <div style={{ fontFamily: body, fontWeight: 600, fontSize: 18, color: C.text, lineHeight: 1.35 }}>
                Telemetry surfaces as a SIEM signal in {'<'}2s
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: s.cap3Opacity, y: s.cap3Y, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <Label color={C.violet}>03 · Learn</Label>
              <div style={{ fontFamily: body, fontWeight: 600, fontSize: 18, color: C.text, lineHeight: 1.35 }}>
                Socratic AI nudges, never solves
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LoopNodeDot({ cx, cy, color, label, litOpacity }) {
  return (
    <motion.g style={{ opacity: litOpacity }}>
      <circle cx={cx} cy={cy} r="7" fill={color} />
      <circle cx={cx} cy={cy} r="16" fill="none" stroke={color} strokeOpacity="0.35" />
      <text
        x={cx}
        y={cy - 27}
        fill={color}
        fontFamily={mono}
        fontSize="11"
        textAnchor="middle"
        letterSpacing="3"
      >
        {label}
      </text>
    </motion.g>
  )
}

/* ─────────────────── SCENARIOS ─────────────────── */

function Scenarios({ tier }) {
  const data = [
    {
      id: 'SC.01',
      name: 'NovaMed',
      sub: 'Healthcare Portal',
      level: 'Intermediate',
      levelColor: C.amber,
      accent: C.amber,
      red: ['nmap', 'sqlmap', 'gobuster', 'curl'],
      blue: ['ModSecurity', 'Apache logs', 'FIM'],
      mitre: 'T1190 · T1083 · T1059',
      net: '172.20.1.0/24',
    },
    {
      id: 'SC.02',
      name: 'Nexora',
      sub: 'Active Directory',
      level: 'Advanced',
      levelColor: C.red,
      accent: C.red,
      red: ['Impacket', 'Hashcat', 'BloodHound'],
      blue: ['Evt 4768/4769', 'Kerberos anomaly'],
      mitre: 'T1558.003 · T1075 · T1003',
      net: '172.20.2.0/24',
    },
    {
      id: 'SC.03',
      name: 'Orion',
      sub: 'Phishing Campaign',
      level: 'Intermediate',
      levelColor: C.amber,
      accent: C.amber,
      red: ['GoPhish', 'OSINT', 'Payload delivery'],
      blue: ['SPF/DMARC', 'MX alerts', 'EDR'],
      mitre: 'T1566 · T1598 · T1078',
      net: '172.20.3.0/24',
    },
  ]
  return (
    <section
      id="scenarios"
      style={{
        padding: '180px 24px 120px',
        background: C.bg2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {tier > 0 && <AmbientGlows />}
      <div style={{ position: 'relative' }}>
        <SectionHead
          index="03"
          kicker="Scenarios"
          title="Three production environments."
          body="Each scenario is a self-contained Docker network with attack surfaces, defender telemetry, and curated MITRE techniques to discover."
        />
        <div
          style={{
            maxWidth: 1280,
            margin: '96px auto 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          {data.map((s, i) => (
            <ScenarioCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ScenarioCard({ s, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: C.surface,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: hovered ? s.accent + '55' : C.line,
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'border-color 0.3s',
        boxShadow: hovered ? `0 20px 40px -10px ${s.accent}30` : 'none',
      }}
    >
      {/* Sprung lift via framer-motion instead of CSS transform */}
      <motion.div
        animate={{ y: hovered ? -8 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div
          style={{
            padding: '28px 28px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Label color={C.dim}>{s.id}</Label>
          {/* Accent badge — subtle scale on hover */}
          <motion.span
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              fontFamily: mono,
              fontSize: 10,
              color: s.levelColor,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              border: `1px solid ${s.levelColor}55`,
              borderRadius: 999,
              background: `${s.levelColor}10`,
              display: 'inline-block',
            }}
          >
            {s.level}
          </motion.span>
        </div>

        <div style={{ padding: '16px 28px 24px' }}>
          <div
            style={{
              fontFamily: body,
              fontWeight: 700,
              fontSize: 28,
              color: C.text,
              letterSpacing: '-0.01em',
            }}
          >
            {s.name}
          </div>
          <div style={{ fontFamily: body, fontSize: 14, color: C.text2, marginTop: 4 }}>{s.sub}</div>
        </div>

        <div
          style={{
            margin: '0 28px',
            borderTop: `1px solid ${C.line}`,
            paddingTop: 24,
            paddingBottom: 24,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
          }}
        >
          <div>
            <Label color={C.red} size={9}>RED</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              {s.red.map((t) => (
                <span key={t} style={{ fontFamily: mono, fontSize: 11, color: C.text2, letterSpacing: '0.06em' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <Label color={C.blue} size={9}>BLUE</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              {s.blue.map((t) => (
                <span key={t} style={{ fontFamily: mono, fontSize: 11, color: C.text2, letterSpacing: '0.06em' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '20px 28px',
            borderTop: `1px solid ${C.line}`,
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: C.violet, letterSpacing: '0.18em' }}>
              MITRE
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.text, marginTop: 4 }}>
              {s.mitre}
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.dim, letterSpacing: '0.15em' }}>
            {s.net}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────── MENTOR ─────────────────── */

function Mentor({ reduced, tier }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const steps = [
    { label: 'Command Submitted', color: C.text2, ms: '0ms' },
    { label: 'Context Builder', color: C.violet, ms: '+12ms' },
    { label: 'PII Redaction', color: C.amber, ms: '+4ms' },
    { label: 'DeepSeek · OpenRouter', color: C.blue, ms: '+820ms' },
    { label: '≤150 Token Response', color: C.green, ms: '+8ms' },
  ]

  return (
    <section id="mentor" style={{ padding: '180px 24px', background: C.bg, position: 'relative' }}>
      {tier > 0 && <AmbientGlows />}
      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHead
          index="04"
          kicker="Socratic mentor"
          title={
            <>
              Hints. <span style={{ color: C.violet }}>Never answers.</span>
            </>
          }
          body="Every command flows through a context builder, a PII redaction filter, and a token cap before reaching the model. The mentor produces nudges, concepts, or worked examples — never working exploits."
        />

        <div
          ref={ref}
          style={{
            marginTop: 96,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: `${step.color}10`,
                  border: `1px solid ${step.color}33`,
                  borderRadius: 10,
                  position: 'relative',
                }}
              >
                {/* Pulsing indicator dot — staggered wave by row index */}
                <motion.span
                  animate={
                    reduced
                      ? {}
                      : {
                          scale: [1, 1.4, 1],
                          boxShadow: [
                            `0 0 12px ${step.color}`,
                            `0 0 20px ${step.color}`,
                            `0 0 12px ${step.color}`,
                          ],
                        }
                  }
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: step.color,
                    boxShadow: `0 0 12px ${step.color}`,
                    display: 'block',
                    flexShrink: 0,
                    willChange: 'transform',
                  }}
                />
                <span
                  style={{ fontFamily: body, fontWeight: 600, fontSize: 14, color: C.text, flex: 1 }}
                >
                  {step.label}
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: step.color,
                    letterSpacing: '0.15em',
                  }}
                >
                  {step.ms}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Hint card with floating animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div
              animate={reduced ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: C.surface,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 28,
                backdropFilter: 'blur(20px)',
                willChange: 'transform',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <ParallaxMark size={20} />
                <Label color={C.violet} size={10}>
                  Hint · Concept
                </Label>
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 12,
                  color: C.dim,
                  marginBottom: 12,
                  letterSpacing: '0.05em',
                }}
              >
                $ sqlmap --batch -u "http://172.20.1.10/login.php"
              </div>
              <div
                style={{
                  fontFamily: body,
                  fontSize: 16,
                  color: C.text,
                  lineHeight: 1.55,
                  marginBottom: 18,
                }}
              >
                The target appears protected by a Web Application Firewall. Consider what categories of
                payloads typically evade signature-based filters — encoding, comments, or alternate
                vectors like IDOR.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['NUDGE', 'CONCEPT', 'EXAMPLE'].map((t, i) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: i === 1 ? C.violet : C.dim,
                      letterSpacing: '0.2em',
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: `1px solid ${i === 1 ? C.violet : C.line}`,
                      background: i === 1 ? `${C.violet}14` : 'transparent',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── EVIDENCE / STATS ─────────────────── */

function Evidence({ reduced }) {
  const stats = [
    { v: '358', l: 'Pytest cases · passing', c: C.text },
    { v: '<2s', l: 'Attack → SIEM latency', c: C.violet },
    { v: '100%', l: 'Network isolation', c: C.green },
    { v: '3', l: 'Production scenarios', c: C.text },
    { v: '91', l: 'Lighthouse · perf', c: C.text },
    { v: '100', l: 'Lighthouse · a11y', c: C.text },
  ]
  return (
    <section
      id="evidence"
      style={{
        padding: '180px 24px 120px',
        background: C.bg2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
        <SectionHead
          index="05"
          kicker="Evidence"
          title={
            <>
              Verified. <span style={{ color: C.green }}>Not assumed.</span>
            </>
          }
        />
        <div
          style={{
            marginTop: 96,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: '1fr',
            gap: 18,
          }}
        >
          {stats.map((s, i) => (
            <StatTile key={i} s={s} i={i} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatTile({ s, i, reduced }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const countVal = useCountUp(s.v, 1.6, reduced ? true : inView)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: i * 0.08 }}
      style={{
        padding: '40px 32px',
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 200,
      }}
    >
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 88,
          color: s.c,
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          textShadow: s.c !== C.text ? `0 0 40px ${s.c}40` : 'none',
        }}
      >
        {/* Count-up for numeric values; non-numeric (e.g. <2s) shows immediately */}
        {reduced ? s.v : countVal}
      </div>
      <Label color={C.text2}>{s.l}</Label>
    </motion.div>
  )
}

/* ─────────────────── CTA ─────────────────── */

function CTA({ go }) {
  return (
    <section
      id="cta"
      style={{ padding: '200px 24px', background: C.bg, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(8)',
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      >
        <ParallaxMark size={180} />
      </div>
      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 'clamp(48px, 7vw, 96px)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            margin: 0,
            color: C.text,
          }}
        >
          Train both sides.
          <br />
          <span
            style={{
              background: `linear-gradient(90deg, ${C.red}, ${C.violet}, ${C.blue})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            One platform.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          style={{
            fontFamily: body,
            fontSize: 19,
            color: C.text2,
            margin: '32px auto 0',
            maxWidth: 580,
            lineHeight: 1.6,
          }}
        >
          v1.0.0-rc1 is tagged and ready for evaluation. Single-node Docker Compose, no external
          dependencies, eight-second container reset.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 44 }}
        >
          <button
            onClick={go}
            style={{
              fontFamily: body,
              fontWeight: 600,
              fontSize: 15,
              color: C.bg,
              background: C.text,
              padding: '16px 32px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Launch the demo →
          </button>
          <a
            href="#"
            style={{
              fontFamily: body,
              fontWeight: 500,
              fontSize: 15,
              color: C.text,
              border: `1px solid ${C.lineStrong}`,
              padding: '15px 32px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            Read the paper
          </a>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────────────── FOOTER ─────────────────── */

function FooterCol({ title, items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Label color={C.dim} size={10}>
        {title}
      </Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((i) => (
          <a
            key={i}
            href="#"
            style={{ fontFamily: body, fontSize: 13, color: C.text2, textDecoration: 'none' }}
          >
            {i}
          </a>
        ))}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer
      style={{ background: '#04060B', borderTop: `1px solid ${C.line}`, padding: '80px 24px 40px' }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 56,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ParallaxMark size={40} />
            <ParallaxWordmark size={26} tone="color" bg="dark" />
          </div>
          <p
            style={{
              fontFamily: body,
              fontSize: 13,
              color: C.text2,
              maxWidth: 360,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A dual-perspective cybersecurity training platform built at the University of Jordan,
            KASIT — May 2026.
          </p>
          <UniLogos height={36} gap={10} />
        </div>

        <FooterCol
          title="Platform"
          items={['Red Workspace', 'Blue Workspace', 'Scenarios', 'AI Mentor']}
        />
        <FooterCol
          title="Evidence"
          items={['Test Reports', 'Lighthouse', 'Isolation Audit', 'Changelog']}
        />
        <FooterCol
          title="Team"
          items={['Mahmoud Allabadi', 'Rashed Alkurdi', 'Repository', 'Contact']}
        />
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '60px auto 0',
          paddingTop: 28,
          borderTop: `1px solid ${C.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: mono,
          fontSize: 11,
          color: C.dim,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        <span>PARALLAX · v1.0.0-rc1</span>
        <span>© 2026 · University of Jordan · KASIT</span>
      </div>
    </footer>
  )
}

/* ─────────────────── ROOT ─────────────────── */

export default function Landing() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const reduced = useReducedMotionSafe()
  const tier = usePerfTier()

  const go = () => navigate(token ? '/dashboard' : '/auth')

  return (
    // contain: layout paint isolates repaints to this subtree
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', position: 'relative', contain: 'layout paint' }}>
      <Nav go={go} />
      <Hero go={go} reduced={reduced} tier={tier} />
      <Marquee reduced={reduced} tier={tier} />
      <Platform reduced={reduced} tier={tier} />
      <Loop reduced={reduced} />
      <Scenarios tier={tier} />
      <Mentor reduced={reduced} tier={tier} />
      <Evidence reduced={reduced} />
      <CTA go={go} />
      <Footer />
    </div>
  )
}
