# MOTION_SYSTEM.md — CyberSim motion vocabulary & contract

> **Status:** Living reference · **Created:** 2026-05-31 (backfills the Phase 0/9 spec the
> Phases 0–3 implementation skipped) · **Scope:** everything under `frontend/src` that animates.
> **Companion:** `MOTION_3D_MASTER_PLAN.md` (the roadmap). This file documents what *exists and is
> verified in code today* — keep it accurate; if you change a primitive, update its entry here.

---

## 1. Philosophy

Motion in CyberSim is **diegetic to a security operations center**: it should read as an
instrument that reacts to the operator, never as decoration. Two non-negotiables:

1. **Duality** — red = attacker, blue = defender, violet/neutral = system. Color carries meaning.
2. **It must always be killable.** Every effect degrades to nothing through one switchboard
   (see §2). The graduation/projector "Low" mode and `prefers-reduced-motion` are first-class
   states, not afterthoughts.

---

## 2. The gating switchboard (read this before adding any motion)

There is exactly **one** way to decide "should this animate?". Do not invent a second.

| Source | Where | Meaning |
|---|---|---|
| `prefers-reduced-motion: reduce` | OS / framer `useReducedMotion()` | user opted out of motion |
| `settingsStore.perfMode === 'low'` | `store/settingsStore.js`, persisted, sets `data-perf="low"` on `<html>` | projector / defense / weak HW |
| `usePerfTier()` → 0–3 | `components/ui/PerfTier.jsx` | live FPS-derived capability tier |

Composed into two hooks in **`lib/motion.js`** — use these, not the raw sources:

```js
useReducedMotionSafe()  // true  ⇒ render the static/instant fallback
                        // (prefers-reduced-motion OR perfMode==='low')
useMotionEnabled()      // true  ⇒ full effects allowed
                        // (!reduced  AND  PerfTier >= 1)
```

**Rule:** any new animated component calls `useReducedMotionSafe()` and returns a static branch
when it's true. The CSS `@media (prefers-reduced-motion)` kill-switch in `v3-design.css` stops
**CSS** animations only — it does **not** stop framer-motion JS animations. (This is exactly how
the `CurtainTransition` U+2212 + un-gated bug shipped past green CI. Don't repeat it.)

---

## 3. Token layer — `lib/motion.js`

Single source of truth, mirrors the CSS vars in `v3-design.css :root`. **Extend, never fork.**

- `DUR` — `enter .28 / pop .18 / glide .32 / exit .18 / exitFast .12 / reveal .72 / curtain .85`
- `EASE` — `enter / pop / glide / exit` (UI) + `reveal [.25,1,.5,1]` + `curtain [.76,0,.24,1]`
- `MOTION` — runtime constants: `lenis.{tier3:.08,tier2:.10,tier1:.12}`, `magnetic.{strength:.38,radius:120}`, `marquee.speed`, `parallax.{hero:.15,section:.08}`
- **Variants:** `fadeUp · slideIn · scaleIn · modalSlideUp · staggerContainer() · staggerItem` (base, unchanged) + `wordRevealContainer() · wordRevealItem · sectionReveal · curtainPanelLeft/Right` (scroll/reveal/curtain)
- **Hooks:** `useReducedMotionSafe()`, `useMotionEnabled()`

---

## 4. Primitive API reference (verified against source)

### Hooks
| Hook | Returns | Gating | Notes |
|---|---|---|---|
| `useLenis({ disabled })` | `lenisRef` | off if `disabled` ‖ reduced ‖ low | per-tier lerp; rAF loop; destroys on unmount |
| `useSplitText(text)` | `{ words }` | — (SSR-safe, splits after mount) | `null` → `[]`; splits on `/\s+/` |
| `useMagnetic({ strength, radius })` | `{ ref, x, y, bind }` | early-returns when reduced | `x/y` are springy MotionValues for `style={{x,y}}` |
| `useScrollScene({ input, output, offset })` | `{ ref, value, scrollYProgress }` | — (caller gates) | thin `useScroll`→`useTransform` mapper |
| `useCursorIntent({ intent, label, mode })` | `{ bind }` | — (cursor itself is gated) | sets `cursorStore` on hover, resets on leave |

### Components
| Component | Purpose | Gating | Key behavior |
|---|---|---|---|
| `SmoothScrollProvider` | wraps shell tree with Lenis | **hard-excludes `/session/**`** + reduced/low | exposes `useLenisContext()` |
| `ReticleCursor` | global crosshair cursor | excludes `/session/**` + reduced + coarse-pointer/touch | red/blue/neutral tint via `cursorStore.mode`; sets `data-cursor-hidden` on `<html>` |
| `RevealText` | word clip-path reveal | static `<Tag>` fallback when reduced | `as` tag, `stagger`, `delay`, `once`; string children only; no aria-label (spans carry text) |
| `Marquee` | infinite strip | static flex row when reduced | doubles children; pause on hover/focus; CSS `cs-marquee-scroll` |
| `CurtainTransition` | dual-panel red/blue page wipe | **opacity cross-fade when reduced** | mounted in `RoutePage`; ASCII `-101%`/`101%` keyframes (never U+2212) |
| `BootHandshake` | 0→100 preloader + curtain reveal | instant children when reduced | once per session via `sessionStorage['cs.boot.done']` |

### State
- `store/cursorStore.js` — `{ intent, label, mode, x, y }` + `setCursor/resetCursor/setPosition/...`
  - `intent`: `default|engage|inspect|launch` · `mode`: `red|blue|neutral`

---

## 5. Perf-tier × effect matrix (the contract)

| Effect | Tier 3 | Tier 2 | Tier 1 | Low / reduced |
|---|---|---|---|---|
| Lenis smooth scroll | ✅ | ✅ | ✅ lower lerp | ❌ native |
| Reticle cursor | ✅ | ✅ | ✅ dot-only | ❌ native |
| Split-text reveal | ✅ | ✅ | ✅ fade | ❌ instant |
| Sticky pin-stack | ✅ | ✅ | ✅ | ⚠️ static |
| Marquee | ✅ | ✅ | ✅ | ❌ static row |
| WebGL card hover | ✅ shader | ✅ tilt+glow | tilt | ❌ |
| Hero bloom (postFX) *(Phase 4)* | ✅ | ❌ | ❌ | ❌ |
| Camera scroll-dolly *(Phase 4)* | ✅ | ✅ | ❌ | ❌ |
| Curtain transition | ✅ | ✅ | ✅ | ❌ cross-fade |

---

## 6. Hard rules
- **Never** mount Lenis, `ReticleCursor`, or looping GPU FX inside `/session/**`. The terminal/SIEM
  need native scroll and a precise native cursor. Both providers already enforce this by pathname.
- **Never** rely on the CSS reduced-motion media query to stop a framer-motion JS animation — gate in JS.
- **Never** add a motion dependency without a perf budget entry. Net runtime add target stays **< 8 KB**.
- Keep `lib/motion.js` the only source of curves/durations.

## 7. Do / Don't
- ✅ `const reduced = useReducedMotionSafe(); if (reduced) return <Static/>`
- ✅ Apply `useMagnetic`/`useTilt` via CSS vars or MotionValues (no React re-render per mousemove).
- ❌ Don't animate per-keystroke or per-scroll-pixel through React state.
- ❌ Don't hardcode easings/durations inline — import from `motion.js`.

## 8. Decisions on record
- **Vanilla three.js, not R3F.** Protects the existing `HeroScene3D` investment; Phase 4 may spike
  R3F for *one isolated* new scene only if it clearly wins. Default = stay vanilla.
- **`lenis` ships in the eager main bundle** (SmoothScrollProvider mounts in `App.jsx`). It is
  runtime-disabled on workspace routes but the ~3 KB code still downloads there. Accepted for now;
  revisit route-splitting in Phase 8.
- **Stop hook runs `npm run verify` (build+test) on every turn-end** — intentional empirical gate
  per CLAUDE.md; lighten to test-only if it proves too heavy.

## 9. Testing motion (jsdom gotchas)
- framer's `useReducedMotion()` caches its `matchMedia` subscription → **can't be flipped mid-test**.
  To exercise a reduced-motion fallback deterministically, set `useSettingsStore.setState({ perfMode: 'low' })`
  (which `useReducedMotionSafe` also honors) and reset to `'auto'` after.
- `test-setup.js` provides the `matchMedia` mock. Marquee/RevealText assert via `container.textContent`
  because they set `aria-hidden`/duplicate content.
- Current suite: `src/__tests__/motion-primitives.test.jsx` (+20 tests). Total **47/47**.

## 10. Outstanding (from the plan, not yet done)
- [ ] Empirical `browser-use` capture of the reference sites' real easings/choreography.
- [ ] Visual regression (Playwright screenshots) of Landing at tiers 3/1/low — **no motion code has
      been visually verified yet**; CI green ≠ visually correct (see the curtain bug).
- [ ] Primitive tests were written after the fact, not TDD-first (Phase 1 deviation).
- [ ] `memory`-MCP persistence of locked motion decisions.
- [ ] Phases 4–9 (3D bloom, inner pages, workspace-safe motion, Debrief, perf/a11y hardening).
