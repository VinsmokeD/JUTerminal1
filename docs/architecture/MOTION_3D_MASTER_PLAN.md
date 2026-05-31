# MOTION_3D_MASTER_PLAN — "Operations Center: Kinetic"

> **Status:** Plan / not yet executed · **Owner:** redesign agent · **Created:** 2026-05-31
> **Supersedes:** the prior ad-hoc `implementation_plan.md` (V7 spring-motion pass).
> **Goal:** Rebuild CyberSim's public + shell surfaces into a premium, award-tier
> motion-3D experience in the spirit of `brightedge.framer.website` (kinetic SaaS) and
> `rzv.studio` (creative-studio cinematic), **without** breaking the SOC/range identity,
> the dual-perspective Red/Blue language, the perf-tier contract, or the workspace tooling.

---

## 0. Reference DNA → CyberSim translation

The two references are JS-rendered (Framer / custom WebGL); static scraping yields no motion
spec, so **Phase 0 includes an empirical re-capture pass** (browser-use + screen recording)
before any timing is locked. The known signature techniques and their on-brand mapping:

| Reference technique (source) | CyberSim translation (keeps identity) |
|---|---|
| Momentum smooth scroll, Lenis (rzv + brightedge) | Site-wide smooth scroll on **public/shell pages only** — never inside Red/Blue workspaces (terminal/SIEM need native scroll) |
| Custom cursor: dot+ring lag, grows on hover, "VIEW" label (rzv) | **Reticle/crosshair cursor** — tints `cs-red` over attacker affordances, `cs-blue` over defender, labels: `ENGAGE` / `INSPECT` / `LAUNCH` |
| Preloader 0→100 then curtain reveal (rzv) | **"Connection handshake" boot** — link-establish 0→100, then a **dual red/blue curtain split** reveal |
| Split-text line/word reveals, clip-path masks (both) | Hero `Attack. Defend. Simultaneously.` masked line+word reveal; section headings mask-up on scroll |
| Sticky stacking cards that pin & overlap (rzv) | "How it works" 3 steps **pin-and-stack**; Debrief kill-chain stages stack |
| WebGL hover displacement on thumbnails (rzv) | Scenario cards: shader/refraction hover + magnetic + `ENGAGE` cursor label (extends existing `useTilt`) |
| Scroll-velocity skew, parallax images (brightedge) | Section parallax + velocity-skew on hero glyphs and SIEM rows |
| Marquee strips (both) | Frameworks row (MITRE/PTES/NIST/OWASP/CVSS) as infinite marquee |
| Full-screen panel page-transition wipe (rzv) | Upgrade the thin scanner to a **dual-panel curtain** (red enters left, blue enters right, meet center) |
| Gradient mesh / bloom glow (brightedge) | three.js **UnrealBloom** postprocessing at tier 3; scroll-coupled camera dolly on `HeroScene3D` |

**Design contract:** every new effect degrades through the existing `PerfTier` (0–3) and is
killed by `prefers-reduced-motion` and `data-perf="low"`. Nothing new may regress the projector/
defense "Low" mode shipped in V5 Phase 1.

---

## 1. Current-state inventory (verified, do not re-discover)

- **Stack:** React 18.3, Vite 5, framer-motion **12.40**, three **0.169** (vanilla, not R3F),
  Tailwind 3.4, Zustand 4.5, react-router 6.
- **Existing motion assets to extend (not replace):**
  - `frontend/src/lib/motion.js` — 4-curve variant vocabulary (`enter/pop/glide/exit`). **Keep as the source of truth; extend, don't fork.**
  - `frontend/src/components/canvas/HeroScene3D.jsx` — vanilla-three Red/Blue particle network w/ drag-rotate, parallax, attack traces, per-tier profiles.
  - `frontend/src/components/canvas/ParticleCanvas.jsx` — 2D fallback.
  - `frontend/src/hooks/useTilt.js` — CSS-var 2.5D tilt + spotlight (`--rx/--ry/--mx/--my`).
  - `frontend/src/components/ui/PerfTier.jsx` — tier 0–3 + FPS downgrade loop; honors `settingsStore.perfMode`.
  - `frontend/src/store/settingsStore.js` — `perfMode: auto|high|low`, persisted, drives `data-perf`.
  - `frontend/src/App.jsx` — `AnimatePresence mode="wait"`, `RoutePage` (scale+blur), `RouteScannerWipe` (thin gradient sweep).
  - `frontend/src/pages/Landing.jsx` — spring spotlight, `whileInView` reveals, hover-tilt cards.
  - `frontend/src/styles/v3-design.css` — motion-verb CSS vars, reduced-motion kill-switch, `[data-perf="low"]` block, focus rings.
- **Guardrail already in place:** reduced-motion + low-perf both disable `.perf-3d` and pause looping animations. **All new work plugs into this same switchboard.**

---

## 2. New dependencies (lean, justified)

| Package | Why | Guard |
|---|---|---|
| `lenis` (~3 KB) | Momentum smooth scroll feeding framer `useScroll` | Mounted only on public/shell routes; **disabled** under reduced-motion / low-perf; never in workspaces |
| `three/examples/jsm/postprocessing/*` (no new dep — ships with `three`) | UnrealBloom + EffectComposer for tier-3 hero | Tier 3 only; falls back to current raw render at tier ≤2 |
| *(no `split-type`)* | Hand-roll a ~30-line `useSplitText` to avoid a dep and keep SSR-safe span splitting | — |
| *(decision: no `@react-three/fiber`)* | Keep vanilla three to protect the existing `HeroScene3D` investment; R3F only if Phase 4 spike proves net-positive | Documented decision in `MOTION_SYSTEM.md` |

> Net new runtime weight target: **< 8 KB gzipped** beyond today. Enforced by Phase 8 budget gate.

---

## 3. Agent orchestration model (how the work gets done)

This plan is written to be executed by an **orchestrator agent** that fans work out to
**subagents in isolated git worktrees**, drives **skills** for design/build/review, uses
**MCP** for continuity + component search, and is fenced by **hooks** that enforce
verification. The user has authorized subagent/skill/MCP/hook use for this effort.

### 3.1 Hooks to install first (Phase 0) — `.claude/settings.json`

| Event / matcher | Action | Purpose |
|---|---|---|
| `PreToolUse` → `Bash(git push *\|git reset --hard *\|git clean *\|git branch -D *)` | block + warn | git guardrails (use `git-guardrails-claude-code` skill to generate) |
| `PostToolUse` → `Edit\|Write` on `frontend/src/**/*.{jsx,js,css}` | run `npm --prefix frontend run lint -- --max-warnings=0` on the file; surface errors as feedback | no broken lint slips between phases |
| `Stop` | run `npm --prefix frontend run build && npm --prefix frontend test` ; block stop on failure | enforce CLAUDE.md "empirical verification / no hallucinated completion" |
| `PostToolUse` → `Edit\|Write` | append a one-line nudge reminding the agent to log `CONTINUOUS_STATE.md` | satisfies mandatory state-tracking |
| `SessionStart` | echo the pre-flight read list (`PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `MASTER_BLUEPRINT.md`, `CONTINUOUS_STATE.md`, this plan) | mandatory context load |

Use the `update-config` skill to write these into `settings.json` (not `.local`, so they're shared).

### 3.2 Skills (when to invoke which)

- **Design / exploration:** `brainstorming` → `design-an-interface` (spawns parallel design variants) → `ui-ux-pro-max` (styles + animation guidelines + shadcn MCP) → `color-palette`, `typography-guide`, `theme-factory` for the motion-token layer.
- **Build:** `frontend-design`, `react-component`, `react-best-practices`.
- **Verify:** `verify` + `run` (launch app), `browser-use` (drive browser, capture reference motion + screenshot our build), `web-design-guidelines` (a11y/reduced-motion audit), `perf-optimizer` (budget), `/code-review` (correctness gate each phase).
- **Test-first for primitives:** `tdd` / `test-driven-development` for `useLenis`, `useSplitText`, cursor store, `useMagnetic`.
- **Docs:** `technical-writer` / `docs-generator` for `MOTION_SYSTEM.md`.

### 3.3 MCP usage

- **`memory` MCP** — persist locked motion decisions (easings, durations, tier matrix) as entities so parallel/again-started agents stay consistent (complements `CONTINUOUS_STATE.md`).
- **shadcn/ui MCP** (via `ui-ux-pro-max`) — search proven interaction patterns before hand-rolling.
- **`fetch` MCP / `WebFetch`** — re-pull reference pages; pair with `browser-use` for the actual motion capture (JS sites).
- **`obsidian-brain`** *(optional)* — archive the motion research notes.

### 3.4 Subagent fan-out (worktree-isolated, parallel-safe)

Phase 1 primitives are **independent** → run up to 4 `general-purpose` subagents each in its own
`isolation: "worktree"`, then the orchestrator integrates and resolves the shared barrel exports.
Phases 3/5/6/7 (page surfaces) are also largely independent and parallelizable **after** Phase 1+2
land on `master`. Each subagent finishes with a `/code-review`; the orchestrator runs the `Stop`
build+test gate before merging each worktree back.

---

## 4. Phased execution

Every phase ends at a **gate**: `npm run build` green, `npm test` green, `/code-review` clean,
reduced-motion + `data-perf="low"` manually confirmed, and a `CONTINUOUS_STATE.md` entry appended.

### Phase 0 — Foundations, capture & orchestration setup
**Objective:** lock the contract and tooling before touching surfaces.
- Install hooks (§3.1) via `update-config`; install git guardrails.
- **Empirically capture reference motion** with `browser-use`: record scroll choreography, cursor behavior, transition timings, easings from both sites; store findings in `MOTION_SYSTEM.md` + `memory` MCP.
- Run `brainstorming` + `design-an-interface` to produce 3 motion-direction variants; pick one with `AskUserQuestion` (cursor color model + curtain style are the only genuine user choices).
- Add deps (§2). Establish the **Motion Token layer**: extend `lib/motion.js` with scroll/reveal/marquee/curtain variants + a `MOTION` constants module mirroring CSS vars; add `useReducedMotionSafe()` and `useMotionEnabled()` (composes reduced-motion + perfMode + tier).
- **Gate:** deps install, build green, tokens exported, decision doc written.

### Phase 1 — Motion core primitives (TDD, parallel worktrees)
Build reusable, tested, perf-gated primitives — the vocabulary every page will consume:
1. `hooks/useLenis.js` + `components/motion/SmoothScrollProvider.jsx` — wraps public/shell tree; syncs to framer `useScroll`; auto-off under reduced-motion/low-perf/workspace routes.
2. `hooks/useSplitText.js` + `components/motion/RevealText.jsx` — line/word mask reveal (clip-path), scroll-triggered, staggered.
3. `store/cursorStore.js` + `components/motion/ReticleCursor.jsx` + `hooks/useCursorIntent.js` — global reticle, red/blue tint, contextual labels; `data-cursor="engage|inspect|launch|red|blue"` API on any element.
4. `hooks/useMagnetic.js` — magnetic pull for buttons/cards (extends `useTilt` math).
5. `components/motion/Marquee.jsx` — velocity-aware infinite marquee.
6. `hooks/useScrollScene.js` — generic scroll-progress → value mapper (parallax, dolly, scrub).
**Subagents:** 4 worktrees (scroll+reveal / cursor / magnetic+marquee / scroll-scene). Each TDD'd with vitest. **Gate:** unit tests for each primitive + Storybook-less demo route `/__motion` (dev-only) verified via `browser-use` screenshots.

### Phase 2 — Cinematic shell (global chrome)
- **Preloader** `components/shell/BootHandshake.jsx` — connection-establish 0→100 + dual red/blue curtain reveal; runs once per session (sessionStorage), skipped under reduced-motion (instant).
- **Page transition** `components/motion/CurtainTransition.jsx` — replace `RouteScannerWipe`; dual-panel red-left/blue-right meeting center, route swaps under cover. Wire into `App.jsx` `AnimatePresence`.
- Mount `SmoothScrollProvider` + `ReticleCursor` + a scroll-progress rail at the app shell, scoped to non-workspace routes.
- **Gate:** all routes still navigate; transition respects reduced-motion (cross-fade fallback); workspaces unaffected.

### Phase 3 — Landing page redesign (flagship)
Rebuild `pages/Landing.jsx` section-by-section on the new primitives:
- **Hero:** `RevealText` on `Attack./Defend./Simultaneously.`; scroll-coupled camera dolly into `HeroScene3D`; velocity-skew; magnetic CTAs; badge counter.
- **Live demo:** parallax + scroll-scrubbed "replay" of terminal→SIEM causality (commands type, alerts cascade as you scroll).
- **How it works:** convert to **pin-and-stack** sticky cards.
- **Scenarios:** WebGL/refraction hover + magnetic + `ENGAGE` reticle label; staggered reveal.
- **Frameworks:** infinite `Marquee`.
- **Stats / CTA:** scroll-linked count-up; curtain-accented CTA.
- **Subagents:** 2–3 worktrees by section group. **Gate:** Lighthouse perf ≥ prior, CLS ~0, visual screenshots reviewed.

### Phase 4 — 3D elevation
- Add `EffectComposer` + `UnrealBloomPass` to `HeroScene3D` (tier 3 only; graceful fallback).
- Scroll-coupled camera path + route-reactive accent (red-weighted near attacker CTAs, blue near defender).
- Spike: evaluate isolating one new scene in R3F; **default = stay vanilla** unless spike clearly wins (record decision).
- **Gate:** tier 3 ≥50fps on dev machine; tiers ≤2 unchanged; reduced-motion = static fallback.

### Phase 5 — Auth · Dashboard · Onboarding
Carry the language inward (restrained vs Landing):
- `Auth.jsx` — reticle + spring spotlight (keep), masked heading reveal, magnetic submit, curtain on success → dashboard.
- `Dashboard.jsx` / `ScenarioCard.jsx` — staggered grid reveal, magnetic cards, reticle labels, resume-state motion.
- `Onboarding.jsx` — sequenced step reveals.
- **Gate:** no smooth-scroll jank with existing modals/command palette; focus-trap intact.

### Phase 6 — Workspace-safe motion (Red/Blue) — **performance-critical**
Hard rule: **no smooth-scroll hijack, no global cursor takeover, no looping GPU FX** inside `/session/**`. Allowed:
- `MissionReadinessOverlay` → cinematic boot-in (red/blue themed).
- `SiemFeed` new-event entrance polish (already started) — keep cheap, respect `data-perf`.
- Terminal: subtle focus/glow only; never animate per-keystroke.
- Reticle disabled (native cursor for precise terminal work).
- **Gate:** workspace bundle size unchanged (Lenis/three excluded via route-split); 60fps under active terminal stream; projector "Low" mode verified.

### Phase 7 — Debrief cinematic
- `pages/Debrief.jsx` — scroll-scrubbed **kill-chain timeline** (stages stack/reveal as you scroll), score-ring count-up synced to scroll, red/blue split summary, shareable curtain outro.
- **Gate:** PDF export (`jspdf`) still works; reduced-motion = static report.

### Phase 8 — Perf, a11y & QA hardening
- `perf-optimizer`: enforce **<8 KB** net add; route-split audit (three/lenis absent from workspace chunks).
- `web-design-guidelines` + manual: `prefers-reduced-motion` full pass, keyboard nav, focus-visible, `data-cursor` doesn't trap focus, marquee pause on hover/focus.
- `browser-use` Playwright visual regression on every public surface at tiers 3/1/low.
- Lighthouse: Perf/Best-Practices/A11y ≥ 90 on Landing.
- **Gate:** all green; `/code-review` at `high` clean.

### Phase 9 — Docs & continuity
- Author `docs/architecture/MOTION_SYSTEM.md` (token vocabulary, primitive API, tier matrix, do/don't, R3F decision).
- Persist locked decisions to `memory` MCP.
- Final `CONTINUOUS_STATE.md` + `MASTER_BLUEPRINT.md` reconciliation.

---

## 5. Perf-tier × effect matrix (the contract)

| Effect | Tier 3 | Tier 2 | Tier 1 | Low / reduced-motion |
|---|---|---|---|---|
| Lenis smooth scroll | ✅ | ✅ | ✅ (lower lerp) | ❌ native |
| Reticle cursor | ✅ full | ✅ | ✅ dot-only | ❌ native |
| Split-text reveal | ✅ | ✅ | ✅ (fade only) | ❌ instant |
| Sticky pin-stack | ✅ | ✅ | ✅ | ⚠️ static stack |
| Marquee | ✅ | ✅ | ✅ | ❌ static row |
| WebGL card hover | ✅ shader | ✅ tilt+glow | tilt only | ❌ |
| Hero bloom (postFX) | ✅ | ❌ | ❌ | ❌ |
| Camera scroll-dolly | ✅ | ✅ | ❌ | ❌ |
| Curtain transition | ✅ | ✅ | ✅ | ❌ cross-fade |

---

## 6. Risks & mitigations
- **Scroll-hijack hurting workspaces/terminal** → Lenis route-scoped; hard-excluded from `/session/**`.
- **Bundle bloat** → vanilla three retained, postFX tier-3-only, route-split, <8 KB gate.
- **Projector/defense regression** → every effect wired to existing `data-perf="low"`; Phase 6/8 explicit projector check.
- **A11y / motion sickness** → `prefers-reduced-motion` is a first-class fallback, not an afterthought.
- **Parallel worktree collisions** → primitives land first; shared barrels integrated by orchestrator only.
- **Reference timing guesswork** → Phase 0 empirical capture before locking easings.

## 7. Kickoff checklist (orchestrator, in order)
1. Read pre-flight files (CLAUDE.md mandate) + this plan.
2. Install hooks + guardrails (§3.1).
3. Capture reference motion (`browser-use`), write `MOTION_SYSTEM.md` draft, persist to `memory`.
4. Run design exploration; confirm cursor-color + curtain choices via `AskUserQuestion`.
5. Add deps; build Phase-1 primitives in worktrees (TDD).
6. Land shell (Phase 2) → flagship Landing (Phase 3) → 3D (4) → inner pages (5–7).
7. Harden (8) → document (9). Log `CONTINUOUS_STATE.md` after **every** phase gate.
