# MOTION_SYSTEM.md â€” Parallax motion vocabulary & contract

> **Status:** Living reference Â· **Created:** 2026-05-31 (backfills the Phase 0/9 spec the
> Phases 0â€“3 implementation skipped) Â· **Scope:** everything under `frontend/src` that animates.
> **Companion:** `MOTION_3D_MASTER_PLAN.md` (the roadmap). This file documents what *exists and is
> verified in code today* â€” keep it accurate; if you change a primitive, update its entry here.

---

## 1. Philosophy

Motion in Parallax is **diegetic to a security operations center**: it should read as an
instrument that reacts to the operator, never as decoration. Two non-negotiables:

1. **Duality** â€” red = attacker, blue = defender, violet/neutral = system. Color carries meaning.
2. **It must always be killable.** Every effect degrades to nothing through one switchboard
   (see Â§2). The graduation/projector "Low" mode and `prefers-reduced-motion` are first-class
   states, not afterthoughts.

---

## 2. The gating switchboard (read this before adding any motion)

There is exactly **one** way to decide "should this animate?". Do not invent a second.

| Source | Where | Meaning |
|---|---|---|
| `prefers-reduced-motion: reduce` | OS / framer `useReducedMotion()` | user opted out of motion |
| `settingsStore.perfMode === 'low'` | `store/settingsStore.js`, persisted, sets `data-perf="low"` on `<html>` | projector / defense / weak HW |
| `usePerfTier()` â†’ 0â€“3 | `components/ui/PerfTier.jsx` | live FPS-derived capability tier |

Composed into two hooks in **`lib/motion.js`** â€” use these, not the raw sources:

```js
useReducedMotionSafe()  // true  â‡’ render the static/instant fallback
                        // (prefers-reduced-motion OR perfMode==='low')
useMotionEnabled()      // true  â‡’ full effects allowed
                        // (!reduced  AND  PerfTier >= 1)
```

**Rule:** any new animated component calls `useReducedMotionSafe()` and returns a static branch
when it's true. The CSS `@media (prefers-reduced-motion)` kill-switch in `v3-design.css` stops
**CSS** animations only â€” it does **not** stop framer-motion JS animations. (This is exactly how
the `CurtainTransition` U+2212 + un-gated bug shipped past green CI. Don't repeat it.)

---

## 3. Token layer â€” `lib/motion.js`

Single source of truth, mirrors the CSS vars in `v3-design.css :root`. **Extend, never fork.**

- `DUR` â€” `enter .28 / pop .18 / glide .32 / exit .18 / exitFast .12 / reveal .72 / curtain .85`
- `EASE` â€” `enter / pop / glide / exit` (UI) + `reveal [.25,1,.5,1]` + `curtain [.76,0,.24,1]`
- `MOTION` â€” runtime constants: `lenis.{tier3:.08,tier2:.10,tier1:.12}`, `magnetic.{strength:.38,radius:120}`, `marquee.speed`, `parallax.{hero:.15,section:.08}`
- **Variants:** `fadeUp Â· slideIn Â· scaleIn Â· modalSlideUp Â· staggerContainer() Â· staggerItem` (base, unchanged) + `wordRevealContainer() Â· wordRevealItem Â· sectionReveal Â· curtainPanelLeft/Right` (scroll/reveal/curtain)
- **Hooks:** `useReducedMotionSafe()`, `useMotionEnabled()`

---

## 4. Primitive API reference (verified against source)

### Hooks
| Hook | Returns | Gating | Notes |
|---|---|---|---|
| `useLenis({ disabled })` | `lenisRef` | off if `disabled` â€– reduced â€– low | per-tier lerp; rAF loop; destroys on unmount |
| `useSplitText(text)` | `{ words }` | â€” (SSR-safe, splits after mount) | `null` â†’ `[]`; splits on `/\s+/` |
| `useMagnetic({ strength, radius })` | `{ ref, x, y, bind }` | early-returns when reduced | `x/y` are springy MotionValues for `style={{x,y}}` |
| `useScrollScene({ input, output, offset })` | `{ ref, value, scrollYProgress }` | â€” (caller gates) | thin `useScroll`â†’`useTransform` mapper |
| `useCursorIntent({ intent, label, mode })` | `{ bind }` | â€” (cursor itself is gated) | sets `cursorStore` on hover, resets on leave |

### Components
| Component | Purpose | Gating | Key behavior |
|---|---|---|---|
| `SmoothScrollProvider` | wraps shell tree with Lenis | **hard-excludes `/session/**`** + reduced/low | exposes `useLenisContext()` |
| `ReticleCursor` | global crosshair cursor | excludes `/session/**` + reduced + coarse-pointer/touch | red/blue/neutral tint via `cursorStore.mode`; sets `data-cursor-hidden` on `<html>` |
| `RevealText` | word clip-path reveal | static `<Tag>` fallback when reduced | `as` tag, `stagger`, `delay`, `once`; string children only; no aria-label (spans carry text) |
| `Marquee` | infinite strip | static flex row when reduced | doubles children; pause on hover/focus; CSS `cs-marquee-scroll` |
| `CurtainTransition` | dual-panel red/blue page wipe | **opacity cross-fade when reduced** | mounted in `RoutePage`; ASCII `-101%`/`101%` keyframes (never U+2212) |
| `BootHandshake` | 0â†’100 preloader + curtain reveal | instant children when reduced | once per session via `sessionStorage['cs.boot.done']` |

### State
- `store/cursorStore.js` â€” `{ intent, label, mode, x, y }` + `setCursor/resetCursor/setPosition/...`
  - `intent`: `default|engage|inspect|launch` Â· `mode`: `red|blue|neutral`

---

## 5. Perf-tier Ã— effect matrix (the contract)

| Effect | Tier 3 | Tier 2 | Tier 1 | Low / reduced |
|---|---|---|---|---|
| Lenis smooth scroll | âœ… | âœ… | âœ… lower lerp | âŒ native |
| Reticle cursor | âœ… | âœ… | âœ… dot-only | âŒ native |
| Split-text reveal | âœ… | âœ… | âœ… fade | âŒ instant |
| Sticky pin-stack | âœ… | âœ… | âœ… | âš ï¸ static |
| Marquee | âœ… | âœ… | âœ… | âŒ static row |
| WebGL card hover | âœ… shader | âœ… tilt+glow | tilt | âŒ |
| Hero bloom (UnrealBloom postFX) | âœ… | âŒ | âŒ | âŒ |
| Camera scroll-dolly + fade | âœ… | âœ… | âŒ | âŒ |
| Curtain transition | âœ… | âœ… | âœ… | âŒ cross-fade |

---

## 6. Hard rules
- **Never** mount Lenis, `ReticleCursor`, or looping GPU FX inside `/session/**`. The terminal/SIEM
  need native scroll and a precise native cursor. Both providers already enforce this by pathname.
- **Never** rely on the CSS reduced-motion media query to stop a framer-motion JS animation â€” gate in JS.
- **Never** add a motion dependency without a perf budget entry. Net runtime add target stays **< 8 KB**.
- Keep `lib/motion.js` the only source of curves/durations.

## 7. Do / Don't
- âœ… `const reduced = useReducedMotionSafe(); if (reduced) return <Static/>`
- âœ… Apply `useMagnetic`/`useTilt` via CSS vars or MotionValues (no React re-render per mousemove).
- âŒ Don't animate per-keystroke or per-scroll-pixel through React state.
- âŒ Don't hardcode easings/durations inline â€” import from `motion.js`.

## 8. Empirical perf measurements (Phase F â€” 2026-05-31)

| Test | Environment | Tier | avg frame | p95 frame | Verdict |
|------|-------------|------|-----------|-----------|---------|
| Playwright headless + 4Ã— CPU throttle | Software rasterizer (SwiftShader) | 3 (bloom, 1400 pts) | ~121ms | ~167ms | âš ï¸ Not representative â€” SW rasterizer serializes GPU work onto CPU |
| Playwright headless + 4Ã— CPU throttle | Software rasterizer | 2 (no bloom, 900 pts) | ~60ms | ~100ms | âš ï¸ Same limitation |
| Algorithm analysis | O(NÃ—20) line check/frame at stride=2 | 3 | ~14K distance ops | â€“ | âœ… Low CPU, GPU-limited |
| Auto FPS downgrade loop | Real hardware (any) | any | triggers at <50fps sustained | 2 consecutive seconds | âœ… Catches borderline GPUs |

**Headless WebGL limitation:** Playwright uses software rasterization (SwiftShader/ANGLE SW) which serialises all GPU draw calls onto the CPU â€” timing reflects CPU+driver overhead, not real GPU throughput. CPU throttling does affect JS particle/line math but not the renderer. These numbers are unsuitable for GPU-FPS validation.

**Real-hardware gate:** The `PerfTier` auto-downgrade loop (raised from 38fps â†’ 50fps threshold in this phase) is the live safety net. It fires every second, detects sustained <50fps for 2 consecutive seconds, and drops tier (3â†’2â†’1â†’0) automatically. A mid-tier GPU that drops below 50fps on tier 3 bloom will be downgraded to tier 2 within 2â€“4 seconds of page load. **Actual GPU benchmarking requires running the dev server on a machine with a discrete or integrated GPU and measuring via browser DevTools Performance â†’ Frames.**

**Pending real-hardware validation:** Until tested on a mid-range Intel/AMD iGPU or low-end dGPU (GTX 1050 equivalent), the FPS claim for tier-3 bloom is "gated by auto-downgrade" rather than "validated 60fps."

## 9. Decisions on record
- **Vanilla three.js, not R3F.** Protects the existing `HeroScene3D` investment; Phase 4 may spike
  R3F for *one isolated* new scene only if it clearly wins. Default = stay vanilla.
- **`lenis` ships in the eager main bundle** (SmoothScrollProvider mounts in `App.jsx`). It is
  runtime-disabled on workspace routes but the ~3 KB code still downloads there. Accepted for now;
  revisit route-splitting in Phase 8.
- **Stop hook runs `npm run verify` (build+test) on every turn-end** â€” intentional empirical gate
  per CLAUDE.md; lighten to test-only if it proves too heavy.

## 9. Testing motion (jsdom gotchas)
- framer's `useReducedMotion()` caches its `matchMedia` subscription â†’ **can't be flipped mid-test**.
  To exercise a reduced-motion fallback deterministically, set `useSettingsStore.setState({ perfMode: 'low' })`
  (which `useReducedMotionSafe` also honors) and reset to `'auto'` after.
- `test-setup.js` provides the `matchMedia` mock. Marquee/RevealText assert via `container.textContent`
  because they set `aria-hidden`/duplicate content.
- Current suite: `src/__tests__/motion-primitives.test.jsx` (+20 tests). Total **47/47**.

## 10. Outstanding (from the plan, not yet done)
- [x] Visual verification (Playwright) of Landing â€” **done**; found & fixed the hero RevealText freeze.
- [x] Phase 4 core â€” UnrealBloom (tier 3) + scroll camera-dolly/fade (tier â‰¥2) on `HeroScene3D`, 0 WebGL errors headless.
- [ ] Empirical `browser-use` capture of the reference sites' real easings/choreography.
- [ ] Permanent Playwright visual-regression harness (scratch scripts were removed after use) â€” Phase 8.
- [ ] Primitive tests were written after the fact, not TDD-first (Phase 1 deviation).
- [ ] `memory`-MCP persistence of locked motion decisions.
- [ ] Phase 4 extras deferred: route-reactive 3D accent (red/blue weighting near CTAs), R3F spike (default = stay vanilla).
- [ ] Phases 5â€“9 (inner pages, workspace-safe motion, Debrief, perf/a11y hardening).
