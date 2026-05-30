/**
 * CyberSim motion presets — single source of truth for framer-motion variants.
 * Mirror the CSS tokens from v3-design.css :root so JS and CSS stay in sync.
 *
 * Curve vocabulary (four curves, nothing else):
 *   enter  — ease-out spring: dramatic deceleration (panels, cards)
 *   pop    — spring overshoot: badge/toast entry
 *   glide  — material ease: large panels, drawers
 *   exit   — ease-in: all exits (always faster than enter ~65%)
 *
 * Duration band: 150–300ms UI / 40ms stagger / exit ≈ 65% of enter
 * All variants are reduced-motion safe (framer respects prefers-reduced-motion
 * via the global kill-switch in v3-design.css; these add no extra guard).
 */

// ── Token mirrors ────────────────────────────────────────────────────────────
const DUR = {
  enter: 0.28,
  pop:   0.18,
  glide: 0.32,
  exit:  0.18,   // ≈65 % of enter
  exitFast: 0.12,
}

const EASE = {
  enter: [0.16, 1, 0.3, 1],
  pop:   [0.34, 1.56, 0.64, 1],
  glide: [0.4, 0, 0.2, 1],
  exit:  [0.4, 0, 1, 1],
}

// ── Presets ──────────────────────────────────────────────────────────────────

/** Fade + 16px rise — default card / list-item entrance */
export const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: DUR.enter,   ease: EASE.enter } },
  exit:    { opacity: 0, y: 8,  transition: { duration: DUR.exit,    ease: EASE.exit  } },
}

/** Fade + subtle slide from left — sidebars, drawers, nav items */
export const slideIn = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0,   transition: { duration: DUR.enter,   ease: EASE.enter } },
  exit:    { opacity: 0, x: -8,  transition: { duration: DUR.exit,    ease: EASE.exit  } },
}

/** Fade + scale — badges, toasts, chips */
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1,    transition: { duration: DUR.pop,     ease: EASE.pop  } },
  exit:    { opacity: 0, scale: 0.94, transition: { duration: DUR.exitFast, ease: EASE.exit } },
}

/** Slide up from below — modals, popovers, panels */
export const modalSlideUp = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: DUR.glide, ease: EASE.enter } },
  exit:    { opacity: 0, y: 12, scale: 0.98, transition: { duration: DUR.exit,  ease: EASE.exit  } },
}

/** Stagger container — wrap a list; children use staggerItem or fadeUp */
export const staggerContainer = (stagger = 0.04) => ({
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger },
  },
})

/**
 * Stagger item — pair with staggerContainer.
 * Uses the same curve as fadeUp so items feel coherent with other entrances.
 */
export const staggerItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,  transition: { duration: DUR.enter, ease: EASE.enter } },
}

/** Utility: build a custom transition inline (use sparingly — prefer presets) */
export const t = {
  enter:    { duration: DUR.enter,    ease: EASE.enter },
  pop:      { duration: DUR.pop,      ease: EASE.pop   },
  glide:    { duration: DUR.glide,    ease: EASE.glide },
  exit:     { duration: DUR.exit,     ease: EASE.exit  },
  exitFast: { duration: DUR.exitFast, ease: EASE.exit  },
}
