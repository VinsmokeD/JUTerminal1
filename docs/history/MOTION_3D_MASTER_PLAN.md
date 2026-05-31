# MOTION_3D_MASTER_PLAN â€” "Operations Center: Kinetic"

> **Status:** Plan / not yet executed Â· **Owner:** redesign agent Â· **Created:** 2026-05-31
> **Supersedes:** the prior ad-hoc `implementation_plan.md` (V7 spring-motion pass).
> **Goal:** Rebuild Parallax's public + shell surfaces into a premium, award-tier
> motion-3D experience in the spirit of `brightedge.framer.website` (kinetic SaaS) and
> `rzv.studio` (creative-studio cinematic), **without** breaking the SOC/range identity,
> the dual-perspective Red/Blue language, the perf-tier contract, or the workspace tooling.

---

## 0. Reference DNA â†’ Parallax translation

The two references are JS-rendered (Framer / custom WebGL); static scraping yields no motion
spec, so **Phase 0 includes an empirical re-capture pass** (browser-use + screen recording)
before any timing is locked. The known signature techniques and their on-brand mapping:

| Reference technique (source) | Parallax translation (keeps identity) |
|---|---|
| Momentum smooth scroll, Lenis (rzv + brightedge) | Site-wide smooth scroll on **public/shell pages only** â€” never inside Red/Blue workspaces (terminal/SIEM need native scroll) |
| Custom cursor: dot+ring lag, grows on hover, "VIEW" label (rzv) | **Reticle/crosshair cursor** â€” tints `cs-red` over attacker affordances, `cs-blue` over defender, labels: `ENGAGE` / `INSPECT` / `LAUNCH` |
| Preloader 0â†’100 then curtain reveal (rzv) | **"Connection handshake" boot** â€” link-establish 0â†’100, then a **dual red/blue curtain split** reveal |
| Split-text line/word reveals, clip-path masks (both) | Hero `Attack. Defend. Simultaneously.` masked line+word reveal; section headings mask-up on scroll |
| Sticky stacking cards that pin & overlap (rzv) | "How it works" 3 steps **pin-and-stack**; Debrief kill-chain stages stack |
| WebGL hover displacement on thumbnails (rzv) | Scenario cards: shader/refraction hover + magnetic + `ENGAGE` cursor label (extends existing `useTilt`) |
| Scroll-velocity skew, parallax images (brightedge) | Section parallax + velocity-skew on hero glyphs and SIEM rows |
| Marquee strips (both) | Frameworks row (MITRE/PTES/NIST/OWASP/CVSS) as infinite marquee |
| Full-screen panel page-transition wipe (rzv) | Upgrade the thin scanner to a **dual-panel curtain** (red enters left, blue enters right, meet center) |
| Gradient mesh / bloom glow (brightedge) | three.js **UnrealBloom** postprocessing at tier 3; scroll-coupled camera dolly on `HeroScene3D` |

**Design contract:** every new effect degrades through the existing `PerfTier` (0â€“3) and is
killed by `prefers-reduced-motion` and `data-perf="low"`. Nothing new may regress the projector/
defense "Low" mode shipped in V5 Phase 1.

---

## 1. Current-state inventory (verified, do not re-discover)

- **Stack:** React 18.3, Vite 5, framer-motion **12.40**, three **0.169** (vanilla, not R3F),
  Tailwind 3.4, Zustand 4.5, react-router 6.
- **Existing motion assets to extend (not replace):**
  - `frontend/src/lib/motion.js` â€” 4-curve variant vocabulary (`enter/pop/glide/exit`). **Keep as the source of truth; extend, don't fork.**
  - `frontend/src/components/canvas/HeroScene3D.jsx` â€” vanilla-three Red/Blue particle network w/ drag-rotate, parallax, attack traces, per-tier profiles.
  - `frontend/src/components/canvas/ParticleCanvas.jsx` â€” 2D fallback.
  - `frontend/src/hooks/useTilt.js` â€” CSS-var 2.5D tilt + spotlight (`--rx/--ry/--mx/--my`).
  - `frontend/src/components/ui/PerfTier.jsx` â€” tier 0â€“3 + FPS downgrade loop; honors `settingsStore.perfMode`.
  - `frontend/src/store/settingsStore.js` â€” `perfMode: auto|high|low`, persisted, drives `data-perf`.
  - `frontend/src/App.jsx` â€” `AnimatePresence mode="wait"`, `RoutePage` (scale+blur), `RouteScannerWipe` (thin gradient sweep).
  - `frontend/src/pages/Landing.jsx` â€” spring spotlight, `whileInView` reveals, hover-tilt cards.
  - `frontend/src/styles/v3-design.css` â€” motion-verb CSS vars, reduced-motion kill-switch, `[data-perf="low"]` block, focus rings.
- **Guardrail already in place:** reduced-motion + low-perf both disable `.perf-3d` and pause looping animations. **All new work plugs into this same switchboard.**

---

## 2. New dependencies (lean, justified)

| Package | Why | Guard |
|---|---|---|
| `lenis` (~3 KB) | Momentum smooth scroll feeding framer `useScroll` | Mounted only on public/shell routes; **disabled** under reduced-motion / low-perf; never in workspaces |
| `three/examples/jsm/postprocessing/*` (no new dep â€” ships with `three`) | UnrealBloom + EffectComposer for tier-3 hero | Tier 3 only; falls back to current raw render at tier â‰¤2 |
| *(no `split-type`)* | Hand-roll a ~30-line `useSplitText` to avoid a dep and keep SSR-safe span splitting | â€” |
| *(decision: no `@react-three/fiber`)* | Keep vanilla three to protect the existing `HeroScene3D` investment; R3F only if Phase 4 spike proves net-positive | Documented decision in `MOTION_SYSTEM.md` |

> Net new runtime weight target: **< 8 KB gzipped** beyond today. Enforced by Phase 8 budget gate.

---

## 3. Agent orchestration model (how the work gets done)

This plan is written to be executed by an **orchestrator agent** that fans work out to
**subagents in isolated git worktrees**, drives **skills** for design/build/review, uses
**MCP** for continuity + component search, and is fenced by **hooks** that enforce
verification. The user has authorized subagent/skill/MCP/hook use for this effort.

### 3.1 Hooks to install first (Phase 0) â€” `.claude/settings.json`

| Event / matcher | Action | Purpose |
|---|---|---|
| `PreToolUse` â†’ `Bash(git push *\|git reset --hard *\|git clean *\|git branch -D *)` | block + warn | git guardrails (use `git-guardrails-claude-code` skill to generate) |
| `PostToolUse` â†’ `Edit\|Write` on `frontend/src/**/*.{jsx,js,css}` | run `npm --prefix frontend run lint -- --max-warnings=0` on the file; surface errors as feedback | no broken lint slips between phases |
| `Stop` | run `npm --prefix frontend run build && npm --prefix frontend test` ; block stop on failure | enforce CLAUDE.md "empirical verification / no hallucinated completion" |
| `PostToolUse` â†’ `Edit\|Write` | append a one-line nudge reminding the agent to log `CONTINUOUS_STATE.md` | satisfies mandatory state-tracking |
| `SessionStart` | echo the pre-flight read list (`PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `MASTER_BLUEPRINT.md`, `CONTINUOUS_STATE.md`, this plan) | mandatory context load |

Use the `update-config` skill to write these into `settings.json` (not `.local`, so they're shared).

### 3.2 Skills (when to invoke which)

- **Design / exploration:** `brainstorming` â†’ `design-an-interface` (spawns parallel design variants) â†’ `ui-ux-pro-max` (styles + animation guidelines + shadcn MCP) â†’ `color-palette`, `typography-guide`, `theme-factory` for the motion-token layer.
- **Build:** `frontend-design`, `react-component`, `react-best-practices`.
- **Verify:** `verify` + `run` (launch app), `browser-use` (drive browser, capture reference motion + screenshot our build), `web-design-guidelines` (a11y/reduced-motion audit), `perf-optimizer` (budget), `/code-review` (correctness gate each phase).
- **Test-first for primitives:** `tdd` / `test-driven-development` for `useLenis`, `useSplitText`, cursor store, `useMagnetic`.
- **Docs:** `technical-writer` / `docs-generator` for `MOTION_SYSTEM.md`.

### 3.3 MCP usage

- **`memory` MCP** â€” persist locked motion decisions (easings, durations, tier matrix) as entities so parallel/again-started agents stay consistent (complements `CONTINUOUS_STATE.md`).
- **shadcn/ui MCP** (via `ui-ux-pro-max`) â€” search proven interaction patterns before hand-rolling.
- **`fetch` MCP / `WebFetch`** â€” re-pull reference pages; pair with `browser-use` for the actual motion capture (JS sites).
- **`obsidian-brain`** *(optional)* â€” archive the motion research notes.

### 3.4 Subagent fan-out (worktree-isolated, parallel-safe)

Phase 1 primitives are **independent** â†’ run up to 4 `general-purpose` subagents each in its own
`isolation: "worktree"`, then the orchestrator integrates and resolves the shared barrel exports.
Phases 3/5/6/7 (page surfaces) are also largely independent and parallelizable **after** Phase 1+2
land on `master`. Each subagent finishes with a `/code-review`; the orchestrator runs the `Stop`
build+test gate before merging each worktree back.

---

## 4. Phased execution

Every phase ends at a **gate**: `npm run build` green, `npm test` green, `/code-review` clean,
reduced-motion + `data-perf="low"` manually confirmed, and a `CONTINUOUS_STATE.md` entry appended.

### Phase 0 â€” Foundations, capture & orchestration setup
**Objective:** lock the contract and tooling before touching surfaces.
- Install hooks (Â§3.1) via `update-config`; install git guardrails.
- **Empirically capture reference motion** with `browser-use`: record scroll choreography, cursor behavior, transition timings, easings from both sites; store findings in `MOTION_SYSTEM.md` + `memory` MCP.
- Run `brainstorming` + `design-an-interface` to produce 3 motion-direction variants; pick one with `AskUserQuestion` (cursor color model + curtain style are the only genuine user choices).
- Add deps (Â§2). Establish the **Motion Token layer**: extend `lib/motion.js` with scroll/reveal/marquee/curtain variants + a `MOTION` constants module mirroring CSS vars; add `useReducedMotionSafe()` and `useMotionEnabled()` (composes reduced-motion + perfMode + tier).
- **Gate:** deps install, build green, tokens exported, decision doc written.

### Phase 1 â€” Motion core primitives (TDD, parallel worktrees)
Build reusable, tested, perf-gated primitives â€” the vocabulary every page will consume:
1. `hooks/useLenis.js` + `components/motion/SmoothScrollProvider.jsx` â€” wraps public/shell tree; syncs to framer `useScroll`; auto-off under reduced-motion/low-perf/workspace routes.
2. `hooks/useSplitText.js` + `components/motion/RevealText.jsx` â€” line/word mask reveal (clip-path), scroll-triggered, staggered.
3. `store/cursorStore.js` + `components/motion/ReticleCursor.jsx` + `hooks/useCursorIntent.js` â€” global reticle, red/blue tint, contextual labels; `data-cursor="engage|inspect|launch|red|blue"` API on any element.
4. `hooks/useMagnetic.js` â€” magnetic pull for buttons/cards (extends `useTilt` math).
5. `components/motion/Marquee.jsx` â€” velocity-aware infinite marquee.
6. `hooks/useScrollScene.js` â€” generic scroll-progress â†’ value mapper (parallax, dolly, scrub).
**Subagents:** 4 worktrees (scroll+reveal / cursor / magnetic+marquee / scroll-scene). Each TDD'd with vitest. **Gate:** unit tests for each primitive + Storybook-less demo route `/__motion` (dev-only) verified via `browser-use` screenshots.

### Phase 2 â€” Cinematic shell (global chrome)
- **Preloader** `components/shell/BootHandshake.jsx` â€” connection-establish 0â†’100 + dual red/blue curtain reveal; runs once per session (sessionStorage), skipped under reduced-motion (instant).
- **Page transition** `components/motion/CurtainTransition.jsx` â€” replace `RouteScannerWipe`; dual-panel red-left/blue-right meeting center, route swaps under cover. Wire into `App.jsx` `AnimatePresence`.
- Mount `SmoothScrollProvider` + `ReticleCursor` + a scroll-progress rail at the app shell, scoped to non-workspace routes.
- **Gate:** all routes still navigate; transition respects reduced-motion (cross-fade fallback); workspaces unaffected.

### Phase 3 â€” Landing page redesign (flagship)
Rebuild `pages/Landing.jsx` section-by-section on the new primitives:
- **Hero:** `RevealText` on `Attack./Defend./Simultaneously.`; scroll-coupled camera dolly into `HeroScene3D`; velocity-skew; magnetic CTAs; badge counter.
- **Live demo:** parallax + scroll-scrubbed "replay" of terminalâ†’SIEM causality (commands type, alerts cascade as you scroll).
- **How it works:** convert to **pin-and-stack** sticky cards.
- **Scenarios:** WebGL/refraction hover + magnetic + `ENGAGE` reticle label; staggered reveal.
- **Frameworks:** infinite `Marquee`.
- **Stats / CTA:** scroll-linked count-up; curtain-accented CTA.
- **Subagents:** 2â€“3 worktrees by section group. **Gate:** Lighthouse perf â‰¥ prior, CLS ~0, visual screenshots reviewed.

### Phase 4 â€” 3D elevation
- Add `EffectComposer` + `UnrealBloomPass` to `HeroScene3D` (tier 3 only; graceful fallback).
- Scroll-coupled camera path + route-reactive accent (red-weighted near attacker CTAs, blue near defender).
- Spike: evaluate isolating one new scene in R3F; **default = stay vanilla** unless spike clearly wins (record decision).
- **Gate:** tier 3 â‰¥50fps on dev machine; tiers â‰¤2 unchanged; reduced-motion = static fallback.

### Phase 5 â€” Auth Â· Dashboard Â· Onboarding
Carry the language inward (restrained vs Landing):
- `Auth.jsx` â€” reticle + spring spotlight (keep), masked heading reveal, magnetic submit, curtain on success â†’ dashboard.
- `Dashboard.jsx` / `ScenarioCard.jsx` â€” staggered grid reveal, magnetic cards, reticle labels, resume-state motion.
- `Onboarding.jsx` â€” sequenced step reveals.
- **Gate:** no smooth-scroll jank with existing modals/command palette; focus-trap intact.

### Phase 6 â€” Workspace-safe motion (Red/Blue) â€” **performance-critical**
Hard rule: **no smooth-scroll hijack, no global cursor takeover, no looping GPU FX** inside `/session/**`. Allowed:
- `MissionReadinessOverlay` â†’ cinematic boot-in (red/blue themed).
- `SiemFeed` new-event entrance polish (already started) â€” keep cheap, respect `data-perf`.
- Terminal: subtle focus/glow only; never animate per-keystroke.
- Reticle disabled (native cursor for precise terminal work).
- **Gate:** workspace bundle size unchanged (Lenis/three excluded via route-split); 60fps under active terminal stream; projector "Low" mode verified.

### Phase 7 â€” Debrief cinematic
- `pages/Debrief.jsx` â€” scroll-scrubbed **kill-chain timeline** (stages stack/reveal as you scroll), score-ring count-up synced to scroll, red/blue split summary, shareable curtain outro.
- **Gate:** PDF export (`jspdf`) still works; reduced-motion = static report.

### Phase 8 â€” Perf, a11y & QA hardening
- `perf-optimizer`: enforce **<8 KB** net add; route-split audit (three/lenis absent from workspace chunks).
- `web-design-guidelines` + manual: `prefers-reduced-motion` full pass, keyboard nav, focus-visible, `data-cursor` doesn't trap focus, marquee pause on hover/focus.
- `browser-use` Playwright visual regression on every public surface at tiers 3/1/low.
- Lighthouse: Perf/Best-Practices/A11y â‰¥ 90 on Landing.
- **Gate:** all green; `/code-review` at `high` clean.

### Phase 9 â€” Docs & continuity
- Author `docs/architecture/MOTION_SYSTEM.md` (token vocabulary, primitive API, tier matrix, do/don't, R3F decision).
- Persist locked decisions to `memory` MCP.
- Final `CONTINUOUS_STATE.md` + `MASTER_BLUEPRINT.md` reconciliation.

---

## 5. Perf-tier Ã— effect matrix (the contract)

| Effect | Tier 3 | Tier 2 | Tier 1 | Low / reduced-motion |
|---|---|---|---|---|
| Lenis smooth scroll | âœ… | âœ… | âœ… (lower lerp) | âŒ native |
| Reticle cursor | âœ… full | âœ… | âœ… dot-only | âŒ native |
| Split-text reveal | âœ… | âœ… | âœ… (fade only) | âŒ instant |
| Sticky pin-stack | âœ… | âœ… | âœ… | âš ï¸ static stack |
| Marquee | âœ… | âœ… | âœ… | âŒ static row |
| WebGL card hover | âœ… shader | âœ… tilt+glow | tilt only | âŒ |
| Hero bloom (postFX) | âœ… | âŒ | âŒ | âŒ |
| Camera scroll-dolly | âœ… | âœ… | âŒ | âŒ |
| Curtain transition | âœ… | âœ… | âœ… | âŒ cross-fade |

---

## 6. Risks & mitigations
- **Scroll-hijack hurting workspaces/terminal** â†’ Lenis route-scoped; hard-excluded from `/session/**`.
- **Bundle bloat** â†’ vanilla three retained, postFX tier-3-only, route-split, <8 KB gate.
- **Projector/defense regression** â†’ every effect wired to existing `data-perf="low"`; Phase 6/8 explicit projector check.
- **A11y / motion sickness** â†’ `prefers-reduced-motion` is a first-class fallback, not an afterthought.
- **Parallel worktree collisions** â†’ primitives land first; shared barrels integrated by orchestrator only.
- **Reference timing guesswork** â†’ Phase 0 empirical capture before locking easings.

## 7. Kickoff checklist (orchestrator, in order)
1. Read pre-flight files (CLAUDE.md mandate) + this plan.
2. Install hooks + guardrails (Â§3.1).
3. Capture reference motion (`browser-use`), write `MOTION_SYSTEM.md` draft, persist to `memory`.
4. Run design exploration; confirm cursor-color + curtain choices via `AskUserQuestion`.
5. Add deps; build Phase-1 primitives in worktrees (TDD).
6. Land shell (Phase 2) â†’ flagship Landing (Phase 3) â†’ 3D (4) â†’ inner pages (5â€“7).
7. Harden (8) â†’ document (9). Log `CONTINUOUS_STATE.md` after **every** phase gate.
