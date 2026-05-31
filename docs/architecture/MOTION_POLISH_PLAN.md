# MOTION POLISH PLAN — Full Review + Prompt Plan

> Authored 2026-05-31 (Claude Opus 4.8). Review of the Motion-3D redesign (Phases 0–8:
> BootHandshake, CurtainTransition, ReticleCursor, Lenis, HeroScene3D + bloom, RevealText,
> Marquee, magnetic CTAs, Debrief cinematic). Grounded in the actual source, not the plan docs.
> Each phase below is written as a **copy-pastable prompt** for the executing agent. Verify with
> `npm --prefix frontend run verify` + Playwright after each phase, then log to CONTINUOUS_STATE.md.

---

## SEVERITY-RANKED FINDINGS

### CRITICAL / HIGH

| # | File:line | Symptom | Root cause |
|---|-----------|---------|------------|
| H1 | `App.jsx:135-220`, `shell/BootHandshake.jsx:70` | First-visit hero entrance (headline RevealText + container fade, delays 0.5–1.3s) plays & completes **behind the boot curtain** (~2.3s). User never sees the signature reveal. | Boot keeps children `visibility:hidden` (not `display:none`); IntersectionObserver fires anyway → `useInView` reveals run hidden. |
| H2 | `motion/ReticleCursor.jsx:21,43` | Full React re-render on **every** mousemove. | Subscribes to whole store (no selector) + `setPosition()` per move; store `x/y` read nowhere (grep-confirmed). Position already comes from motion values. |
| H3 | `pages/Landing.jsx:71-100`, `pages/Auth.jsx:54-62` | 3 overlapping mouse listeners on the hero (reticle + full-viewport spring spotlight + 3D pointermove); 900px gradient layer repaints per frame. | Spotlight only gated on `reduced`, not on PerfTier; redundant with reticle. |
| H4 | `pages/Auth.jsx:179-185` | Hidden 0-size WebGL particle sim runs on mobile/narrow Auth (`camera.aspect = 0/0 = NaN`). | `<HeroScene3D>` mounts inside `hidden lg:flex` panel; no width guard. |

### MEDIUM

| # | File:line | Symptom | Fix direction |
|---|-----------|---------|---------------|
| M1 | router (no ScrollRestoration) | Navigating from a scrolled page can land mid-page on the next route (Lenis owns scroll). | Add a `ScrollToTop` that resets window + Lenis on `pathname` change. |
| M2 | `index.css:1675`, `canvas/HeroScene3D.jsx:353` | `cursor:grab` drag affordance invisible under `cursor:none !important`. | Show grab state via reticle label ("DRAG") or allow native cursor on the canvas. |
| M3 | `canvas/HeroScene3D.jsx:324` | Repeated Landing↔Auth nav leaks WebGL contexts (≈16 cap). | `renderer.forceContextLoss()` before `dispose()`. |
| M4 | `pages/Debrief.jsx:506-512` | Score breakdown reconstructs penalties client-side; can mislabel; `baseScore` prop unused. | Return a structured breakdown from the backend report; render it verbatim. |
| M5 | `lib/motion.js` switchboard | Spotlight/magnetic gate on `reduced`; 3D gates on `tier`. Inconsistent — a tier-1 weak machine still runs spotlight. | Add `useMotionEnabled()`/tier gate to spotlight + magnetic. |

### LOW / POLISH

- L1 First load shows `LoadingSpinner` then BootHandshake — two different loaders. Unify.
- L2 `Landing.jsx:78` `token ? '/dashboard'` branch is dead (RouteGuard `allowOnlyUnauth` already redirects authed users).
- L3 Pin-and-stack (`StackCard`) too subtle with 3 short cards — increase scroll travel or scale delta.
- L4 `ShareModal` "Print Dossier" prints the whole page (`Debrief.jsx:163`); scope to a print stylesheet.
- L5 No SPA meta/OG tags for the marketing Landing (SSR out of scope; static `<head>` tags are cheap).
- L6 `HeroScene3D` connect-lines loop is O(N·40)/frame at tier 3 (1400 pts) + bloom — verify it holds 60fps on a real mid-tier GPU, not just a 16-core headless box.
- L7 Hero `aria-hidden` canvas is correct, but the live-demo terminal/SIEM mock has no `aria-label`/`role` — screen readers read raw fake log lines as content.

---

## PHASE A — First-paint correctness (H1, H4, L1)

**Prompt:**
> Fix the boot-screen hiding the hero entrance. In `BootHandshake.jsx`, expose boot completion via
> context (`BootContext`, value `done`). The boot overlay must fully cover the viewport while active
> (it does). The real fix: gate the **hero entrance + RevealText triggers** so they start only after
> boot is `done`. Two acceptable approaches — pick the simpler:
> (a) Add a `startDelay`/`active` prop to `RevealText` and the hero `motion.div` that defers `animate`
> until `useBootDone()` is true; or
> (b) Keep children `display:none` (not `visibility:hidden`) until `done`, so IntersectionObserver does
> not fire — then reveals run when the page actually appears. Verify the `min-h` layout doesn't jump.
> Prefer (b) if it doesn't cause layout shift; it's the smallest change and fixes the root cause for
> all `useInView` reveals at once.
> Also (H4): in `Auth.jsx`, only mount `<HeroScene3D>` when the left panel is visible — wrap it so it
> renders behind a `lg`-breakpoint check (e.g. a `useMediaQuery('(min-width:1024px)')` gate or move it
> out of the `hidden lg:flex` subtree into a `lg:block hidden` sibling that truly unmounts below `lg`).
> Add a defensive guard in `HeroScene3D` `resize()`: if `clientWidth===0 || clientHeight===0`, skip
> renderer/composer resize and `return` early in the tick (don't run the sim for a 0-size canvas).
> (L1): unify loaders — while `isChecking`, render the BootHandshake visual (or a minimal logo), not a
> separate spinner, so first load is one continuous sequence.
> Verify: Playwright first-visit capture shows the headline animating *after* the curtain opens; mobile
> Auth shows no WebGL context created (check `document.querySelectorAll('canvas').length` on a 390px
> viewport). `npm --prefix frontend run verify` green.

## PHASE B — Pointer/render performance on the hero (H2, H3, M5)

**Prompt:**
> Eliminate per-frame React re-renders and redundant mouse work on Landing/Auth.
> 1. `cursorStore.js`: remove `x/y` state and `setPosition` (nothing reads them — grep to confirm;
>    update the one test in `motion-primitives.test.jsx` that asserts setPosition). If you want to keep
>    them for future use, move x/y to a `useRef`/motion-value, never zustand state.
> 2. `ReticleCursor.jsx`: stop calling `setPosition` in the move handler (position is already driven by
>    `px/py` motion values). Subscribe with selectors (`useCursorStore(s => s.intent)`, etc.) so the
>    component only re-renders on intent/label/mode change, not on movement.
> 3. Gate the full-viewport spotlight (`Landing.jsx`, `Auth.jsx`) behind `useMotionEnabled()` (tier≥2 &&
>    !reduced), not just `reduced`. On weaker tiers the reticle already gives cursor feedback. Consider
>    consolidating the spotlight into `ReticleCursor` as an optional prop so there's a single mousemove
>    listener app-wide instead of one per page.
> 4. Throttle is unnecessary once re-renders are gone, but confirm only ONE `mousemove` listener remains
>    for cursor + spotlight (the 3D keeps its own `pointermove` on its container — that's fine, scoped).
> Verify with Chrome DevTools Performance (or Playwright tracing): moving the mouse over the hero shows
> no React commits and a flat main-thread profile aside from the WebGL rAF. `verify` green; reticle
> still tints/labels on CTA hover.

## PHASE C — Navigation & scroll integrity (M1, M2, M3)

**Prompt:**
> 1. Add `components/motion/ScrollToTop.jsx`: on `useLocation().pathname` change, reset scroll — call the
>    Lenis instance's `scrollTo(0,{immediate:true})` via `useLenisContext()` when present, else
>    `window.scrollTo(0,0)`. Mount it inside `SmoothScrollProvider` (so it sees the Lenis ref) but above
>    `<Routes>`. Skip the reset for in-page hash links (`#how`, `#scenarios`).
> 2. `HeroScene3D` cleanup: call `renderer.forceContextLoss()` immediately before `renderer.dispose()`.
> 3. Hero cursor affordance (M2): when the pointer is over the hero canvas, set a reticle intent
>    (`{intent:'inspect', label:'DRAG', mode:'neutral'}`) on `pointerenter` and reset on `pointerleave`,
>    so the user learns it's draggable without fighting the global `cursor:none`.
> Verify: navigate Landing→Auth→Dashboard→back repeatedly; `canvas` count stays bounded, no
> "too many WebGL contexts" warning; each route starts at scroll 0; hash links still smooth-scroll.

## PHASE D — Debrief hardening (M4, L4, H1-consistency)

**Prompt:**
> 1. Move score-breakdown math to the backend report payload (`/reports/{id}/report`) as a structured
>    `score_breakdown: {starting, hint_penalty, gate_penalty, time_bonus, final}` so the client renders
>    truth instead of reconstructing it (`Debrief.jsx:506-512`). Remove the unused `baseScore` prop.
>    Keep a graceful client fallback if the field is absent (older sessions).
> 2. Print: add a `@media print` stylesheet (or render the dossier into a hidden print container) so
>    "Print Dossier" outputs only the certificate, not the whole debrief page.
> 3. Audit the Debrief radar/ScoreRing animations under reduced-motion: confirm `useCountUp` and the
>    `stroke-dashoffset` transition are skipped (set final value immediately) when `useReducedMotionSafe()`.
> 4. Add `aria-label`/`role="img"` to the SVG competency radar with a text summary for screen readers.
> Verify: a real session report renders the same numbers the backend computed; print preview shows only
> the dossier; reduced-motion shows final score instantly. `pytest` for the new report field; `verify`.

## PHASE E — Accessibility, a11y & polish sweep (M5, L3, L5, L7, M2)

**Prompt:**
> 1. Decorative mock content: add `aria-hidden="true"` to the Landing "live demo" terminal + SIEM mock
>    block (`Landing.jsx` LIVE DEMO section) so screen readers don't read fake log lines as real content.
> 2. Provide a visible "Reduce motion / Performance" affordance reachable from Landing & Auth (not only
>    deep in Settings) — a small footer toggle that sets `settingsStore.perfMode`. Confirm it flips
>    `data-perf` and tier live (it already does via PerfTier effect).
> 3. Pin-and-stack readability (L3): increase per-card scale/offset delta and section min-height so the
>    stack visibly compresses while scrolling, or add a thin progress rail. Keep it gated to tier≥2.
> 4. Static `<head>` meta/OG/twitter tags + `<title>` in `index.html` for the marketing Landing (L5).
> 5. Focus states: every CTA (`btn-v3`) and the auth inputs must have a visible `:focus-visible` ring
>    that survives `cursor:none`. Tab through Landing → Auth → Onboarding and confirm focus is never lost.
> 6. Honor `prefers-reduced-motion` end-to-end: with it on, BootHandshake skips (it does), CurtainTransition
>    cross-fades (it does), hero is static SVG (tier 0), and NO spring spotlight/magnetic runs — verify all
>    four in one Playwright pass with `reducedMotion: 'reduce'`.
> Verify: axe-core / Lighthouse a11y ≥ 95 on Landing & Auth; keyboard-only walkthrough works; `verify` green.

## PHASE F — Empirical 60fps validation (L6) — REQUIRED gate

**Prompt:**
> The prior phases claimed tier-3 bloom is fine but only tested on a 16-core headless box (always
> classifies tier 3). Run a real throttled validation: Playwright with CPU throttling (4×) and a
> mid-tier GPU profile, capture FPS over the hero for 5s at tier 2 and tier 3. If tier 3 drops below
> ~50fps sustained, lower the bloom strength/particle count or push the FPS-downgrade threshold. Record
> the numbers in MOTION_SYSTEM.md's perf matrix. Do NOT mark this phase complete on a "build green" alone.

---

## CROSS-CUTTING NOTES

- **Switchboard consistency:** standardize every new effect on `useMotionEnabled()` (composes reduced +
  perfMode + tier). Today some effects branch on `reduced` only, others on `tier`. One gate = no gaps.
- **Single source of mouse:** aim for exactly one document-level `mousemove` for cursor+spotlight, one
  scoped `pointermove` on the 3D canvas. Anything more is duplicated work on the most-judged page.
- **Order of operations:** A → B first (they fix what users *see* and *feel* on the first 3 seconds),
  then C, then D/E/F in parallel if using worktree-isolated subagents.
- **Verification discipline (CLAUDE.md):** each phase ends with `npm --prefix frontend run verify`
  (build + 47/47 tests) AND a real-browser Playwright capture of the affected surface, plus a
  CONTINUOUS_STATE.md entry. CI green ≠ visually correct — the H1 boot bug is proof.
