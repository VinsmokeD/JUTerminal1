/**
 * Parallax motion presets â€” single source of truth for framer-motion variants.
 * Mirror the CSS tokens from v3-design.css :root so JS and CSS stay in sync.
 *
 * Curve vocabulary (four curves, nothing else):
 *   enter  â€” ease-out spring: dramatic deceleration (panels, cards)
 *   pop    â€” spring overshoot: badge/toast entry
 *   glide  â€” material ease: large panels, drawers
 *   exit   â€” ease-in: all exits (always faster than enter ~65%)
 *
 * Duration band: 150â€“300ms UI / 40ms stagger / exit â‰ˆ 65% of enter
 *
 * Extended with:
 *   - Scroll/reveal/curtain/marquee variants (Phase 1+)
 *   - MOTION runtime constants (lenis lerp, magnetic, marquee, parallax)
 *   - useReducedMotionSafe() â€” composes framer's useReducedMotion + perfMode store
 *   - useMotionEnabled()     â€” all-in-one gate: reduced + perfMode + tier
 */

import { useReducedMotion } from 'framer-motion'
import { useSettingsStore } from '../store/settingsStore'
import { usePerfTier } from '../components/ui/PerfTier'

// â”€â”€ Token mirrors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DUR = {
  enter:    0.28,
  pop:      0.18,
  glide:    0.32,
  exit:     0.18,    // â‰ˆ65 % of enter
  exitFast: 0.12,
  // Theatrical scroll/reveal durations
  reveal:   0.72,
  curtain:  0.85,
}

export const EASE = {
  enter:   [0.16, 1, 0.3, 1],
  pop:     [0.34, 1.56, 0.64, 1],
  glide:   [0.4, 0, 0.2, 1],
  exit:    [0.4, 0, 1, 1],
  reveal:  [0.25, 1, 0.5, 1],
  curtain: [0.76, 0, 0.24, 1],
}

/** Runtime constants for Lenis, magnetic, parallax, marquee */
export const MOTION = {
  lenis: { tier3: 0.08, tier2: 0.10, tier1: 0.12 },
  magnetic: { strength: 0.38, radius: 120 },
  marquee: { speed: 55 },
  parallax: { hero: 0.15, section: 0.08 },
}

// â”€â”€ Base presets (unchanged from V5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Fade + 16px rise â€” default card / list-item entrance */
export const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: DUR.enter,   ease: EASE.enter } },
  exit:    { opacity: 0, y: 8,  transition: { duration: DUR.exit,    ease: EASE.exit  } },
}

/** Fade + subtle slide from left â€” sidebars, drawers, nav items */
export const slideIn = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0,   transition: { duration: DUR.enter,   ease: EASE.enter } },
  exit:    { opacity: 0, x: -8,  transition: { duration: DUR.exit,    ease: EASE.exit  } },
}

/** Fade + scale â€” badges, toasts, chips */
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1,    transition: { duration: DUR.pop,      ease: EASE.pop   } },
  exit:    { opacity: 0, scale: 0.94, transition: { duration: DUR.exitFast, ease: EASE.exit  } },
}

/** Slide up from below â€” modals, popovers, panels */
export const modalSlideUp = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: DUR.glide, ease: EASE.enter } },
  exit:    { opacity: 0, y: 12, scale: 0.98, transition: { duration: DUR.exit,  ease: EASE.exit  } },
}

/** Stagger container â€” wrap a list; children use staggerItem or fadeUp */
export const staggerContainer = (stagger = 0.04) => ({
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: stagger } },
})

/** Stagger item â€” pair with staggerContainer */
export const staggerItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,  transition: { duration: DUR.enter, ease: EASE.enter } },
}

/** Utility: build custom transition inline (use sparingly â€” prefer presets) */
export const t = {
  enter:    { duration: DUR.enter,    ease: EASE.enter },
  pop:      { duration: DUR.pop,      ease: EASE.pop   },
  glide:    { duration: DUR.glide,    ease: EASE.glide },
  exit:     { duration: DUR.exit,     ease: EASE.exit  },
  exitFast: { duration: DUR.exitFast, ease: EASE.exit  },
}

// â”€â”€ Extended: scroll / reveal / curtain variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Word-level clip-path reveal container (stagger children) */
export const wordRevealContainer = (stagger = 0.07) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: stagger } },
})

/** Individual word reveal â€” clip-path from bottom of clip */
export const wordRevealItem = {
  hidden: {
    clipPath: 'inset(0 0 100% 0)',
    y: '60%',
    opacity: 0,
  },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    y: '0%',
    opacity: 1,
    transition: { duration: DUR.reveal, ease: EASE.reveal },
  },
}

/** Section heading fade-up on scroll */
export const sectionReveal = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0,  transition: { duration: DUR.reveal, ease: EASE.reveal } },
}

/** Curtain panel open â€” slides in from off-screen, waits, slides back out */
export const curtainPanelLeft = {
  initial: { x: '-101%' },
  enter:   { x: '0%',    transition: { duration: DUR.curtain * 0.65, ease: EASE.curtain } },
  exit:    { x: '-101%', transition: { duration: DUR.curtain * 0.65, ease: EASE.curtain, delay: 0.25 } },
}

export const curtainPanelRight = {
  initial: { x: '101%' },
  enter:   { x: '0%',   transition: { duration: DUR.curtain * 0.65, ease: EASE.curtain } },
  exit:    { x: '101%', transition: { duration: DUR.curtain * 0.65, ease: EASE.curtain, delay: 0.25 } },
}

// â”€â”€ Extended: hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SSR-safe reduced-motion hook.
 * Returns true when prefers-reduced-motion: reduce OR perfMode === 'low'.
 */
export function useReducedMotionSafe() {
  const prefersReduced = useReducedMotion() ?? false
  const perfMode = useSettingsStore((s) => s.perfMode)
  return prefersReduced || perfMode === 'low'
}

/**
 * Composes reduced-motion + perfMode + PerfTier into a single boolean.
 * Returns true when full motion effects should run (tier â‰¥ 1, not reduced).
 */
export function useMotionEnabled() {
  const reduced = useReducedMotionSafe()
  const tier = usePerfTier()
  return !reduced && tier >= 1
}
