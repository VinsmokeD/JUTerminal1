# CyberSim — Design V5 Enhancement Plan ("Consolidate & Elevate")

> **Status:** Plan ready for execution (do later)
> **Author:** Claude (Opus 4.8) — 2026-05-30
> **Supersedes the intent of:** the ad-hoc "Full Design Enhancement Plan" draft
> **Extends, does not replace:** `DESIGN.md`, `PHASE_V4_PLAN.md`, `HUD_V4_AUDIT.md`
> **Grounded in:** the actual shipped frontend (`frontend/src`), not assumptions
> **Informed by:** motionsites.ai, vibeui.online, trickle.so prompt library, blog.vibecoder.me, vibecodecomponents.com + the `ui-ux-pro-max` design-rule taxonomy

---

## 0. Why this plan is different from the first draft

The earlier draft was written from memory and would have **broken the project**. This version is grounded in the real code. The corrections matter, so they are stated plainly:

| First draft said… | Reality in this repo | Consequence |
|---|---|---|
| Introduce a new palette `cyber-blue #00B4D8`, `cyber-green #00FF88`… | Palette is already `cs-red #ff3b3b`, `cs-blue #3b8bff`, `green-signal #00ff88`, plus HUD `hud-crimson #ff0055` / `hud-cyan #00f3ff` (`tailwind.config.js`, `index.css`, `v3-design.css`) | A new palette would fork a **4th** color system on top of 3 existing ones |
| Use Inter / Geist Sans | Display font is `Orbitron`→`Outfit`; mono is `JetBrains Mono` | Wrong typeface family entirely |
| "Avoid framer-motion if not installed" | `framer-motion ^12.40` **is** installed and used; so are `three`, `react-resizable-panels`, `xterm-addon-webgl` | We were told to avoid a dependency we already ship |
| Build CommandPalette, Badge, EmptyState, LiveIndicator, FlagSubmitWidget, MissionReadinessOverlay, ScoreToast, ResizableSplit, PhaseTrail… | **All already exist** under `frontend/src/components/**` | We'd be rebuilding shipped components |
| Add an animation system, scrollbars, focus rings, reduced-motion | Already present in `index.css` + `v3-design.css` (`*:focus-visible`, `@media (prefers-reduced-motion)`, custom scrollbars, `animate-*` utilities) | Duplicate, conflicting systems |

**The real problem is not "missing design." It is fragmentation.** There are three token sources that disagree, two color identities that fight inside single components, two button systems, dead Tailwind classes, and a shipped HUD that is heavy enough to drop frames on a projector during the defense. So V5 is **Consolidate → Harden → Elevate**, in that order. Net new surface area is deliberately small.

---

## 1. Audit findings (grounded in real files)

These are the issues an execution agent should fix. Each is verifiable in the cited file.

### 1.1 — Triple token drift (one value, three definitions) — **CRITICAL**
The same semantic colors are defined three times with **different** values:

| Token | `index.css :root` | `v3-design.css :root` | `tailwind.config.js` |
|---|---|---|---|
| text-secondary | `#8890a4` | `#9ba3b8` | `#9ba3b8` (`txt-secondary`) |
| text-dim | `#4a5068` | `#5a6178` | `#5a6178` (`txt-dim`) |

`main.jsx` imports `index.css` then `v3-design.css`, so v3 silently overrides index for the CSS-var path — but only *by luck of import order*, and only for vars it happens to redefine. Anyone reading `index.css` sees the wrong value. Tailwind classes (`text-txt-secondary`) and CSS-var classes (`color: var(--text-secondary)`) only agree because of this fragile patch.
**Fix:** one source of truth (Tailwind config tokens) + a single generated `:root` block; delete the duplicate/old `:root` values.

### 1.2 — Dual color identity, unreconciled — **CRITICAL**
"Duality" red/blue (`#ff3b3b` / `#3b8bff`) and "HUD neon" crimson/cyan (`#ff0055` / `#00f3ff`) coexist with no rule for which wins. They collide **inside single components**: `v3-design.css` `.btn-v3-red` uses `rgba(255,0,85,…)` (HUD crimson) for border/glow but `color:#ff3b3b` (Duality red) for text; `.btn-v3-blue` mixes `#00f3ff` border with… etc. The result reads as "two themes blended by accident," not intention.
**Fix:** adopt a documented **two-tier** rule (see §4). Recommendation: Duality = semantic/legible base (text, borders, severity); HUD neon = *glow/accent layer only*.

### 1.3 — Font split-brain — **HIGH**
`tailwind.config.js` `fontFamily.display = ['Orbitron','Outfit',…]`; `index.css --font-display: 'Outfit'`; `DESIGN.md` says display = `Outfit`. So `.font-display` (Tailwind) renders **Orbitron**, while CSS using `var(--font-display)` renders **Outfit**. Orbitron is a geometric *display* face — poor for anything but short glyphs/titles; using it for body-length text hurts legibility (violates `contrast-readability` / `readable-font-size` intent).
**Fix:** Orbitron = hero/wordmark only (a `font-hud` token); Outfit = general display; JetBrains Mono = all technical text. Align all three sources.

### 1.4 — Dead / typo Tailwind classes (silently dropped) — **HIGH**
- `components/hints/AiHintPanel.jsx:30` — `'border-magenta/30 text-magenta bg-magenta/5'`: there is **no `magenta`** color in `tailwind.config.js`. The "Pro Tip" hint renders unstyled. (The inline `style` fallback at line ~368 hardcodes `#a855f7`, proving the token was meant to exist.)
- `AiHintPanel.jsx` HintBubble — `text-text-primary` (error & insight `bubbleBg`) is a **typo** for `text-txt-primary`; Tailwind drops it.
**Fix:** add a `magenta` token (or rename to an existing accent), fix the typo, grep for other dead classes.

### 1.5 — Two button systems — **MEDIUM**
Legacy `.btn` / `.btn-red` / `.btn-blue` / `.btn-ghost` / `.btn-sm` (solid fills, 14px) **and** `.btn-v3-*` (HUD, mono, brackets, clip-path) both live in `index.css`. `ui/Button.jsx` uses v3; legacy classes are still referenced in older pages (Landing/Auth/Debrief — verify with grep).
**Fix:** make `Button.jsx` the only entry point; migrate stragglers; keep legacy `.btn` only if a deliberate "solid CTA" variant is wanted, otherwise delete.

### 1.6 — Defense/projector performance risk — **HIGH (graduation-specific)**
`HUD_V4_AUDIT.md §4b` already flags it: `HudEnvironment` (three.js) + full-screen `body::before` scanline + `body::after` radial + **per-card** `card-v3::after` 8s scanline + `glitch-text` + pervasive `backdrop-filter: blur()` = heavy compositing. `PerfTier` exists but there is **no user-facing "Low Performance Mode"** (audit action item #3). A dropped-frame demo on examiner hardware is an avoidable risk.
**Fix:** a Settings toggle that flips a `data-perf="low"` root attribute disabling three.js, backdrop blur, and looping ambient animations; persist it; default to auto-detect via `PerfTier`.

### 1.7 — Command palette is partial — **MEDIUM**
`PHASE_V4_PLAN.md §0` + `WS-H` note the palette ships only Navigate/Scenarios/Account; Mission actions (submit flag, request hint L1/L2/L3, toggle AI mode, switch role), Tool actions (copy target IP, insert command), and Terminal actions (clear/find) are unbuilt. (vibecodecomponents.com confirms ⌘K grouped/searchable palette as a baseline expectation.)
**Fix:** complete the command registry; group by section.

### 1.8 — Accessibility gaps — **MEDIUM**
Good: `*:focus-visible` rings, reduced-motion kill-switch, escaped `dangerouslySetInnerHTML`, `ScenarioCard` keyboard handler. Gaps: SIEM feed has no `aria-live` (new critical events aren't announced); contrast of `txt-dim #5a6178` on `void #08090c` ≈ 3.0:1 (fine for large/decorative, **fails 4.5:1** for any body text it's used on); toasts are `pointer-events:none` but not wired to `aria-live`.
**Fix:** targeted a11y sweep (§Phase 5).

---

## 2. Resource synthesis (what each source actually contributes)

Distilled to only what applies to this product.

- **motionsites.ai →** *motion vocabulary.* Staggered entrance reveals (30–50ms/item), layered parallax depth, glassmorphism reveals (0.6–0.8s), looping gradient shifts (2–3s), glitch/word reveals (0.3–0.5s), cursor-follow hero. **Tooling rule:** framer-motion for staggered containers + scroll triggers; CSS keyframes for loops; everything gated behind `will-change` + reduced-motion. → Feeds **Phase 4**.
- **vibecodecomponents.com →** *component baseline & micro-interactions.* ⌘K grouped command palette, toasts auto-dismissing ~4s, directional tooltips, hover cards, backdrop-blur modals, accordions with rotating chevrons, slide-overs from edges, right-click context menus, pulsing active-state indicators, localStorage-persisted dismissible cards. CyberSim already has most; this is the **completeness checklist** for Phases 3 & 6.
- **trickle.so prompt library →** *how to write the prompts in this doc.* Three reusable structures: **(1) Style + Component + Purpose**, **(2) Mood + Functionality**, **(3) Sensory + Technical**. Effectiveness drivers: *layered specificity* (color + type + layout + motion together), *emotion + execution*, *context clarity*. → Feeds the **prompt template in §5**.
- **vibeui.online →** *layout archetypes.* Floating pill nav, terminal-as-hero, split-screen auth. CyberSim already does floating/glass nav + terminal hero; reuse as reference, don't rebuild.
- **blog.vibecoder.me →** *workflow.* Ship in small, verifiable slices with a tight feedback loop — which is exactly how the phases below are scoped (each ends in a build + manual check, per `CLAUDE.md` Empirical Verification).

---

## 3. Quality gates from `ui-ux-pro-max` (acceptance criteria, not vibes)

Every prompt below inherits these. They are the skill's CRITICAL/HIGH rules turned into pass/fail checks for *this* dark dashboard:

- **A11y:** body text ≥ 4.5:1 contrast (large/decorative ≥ 3:1); visible focus ring on every interactive element; icon-only buttons have `aria-label`; color never the sole signal (pair severity color with text/icon); `prefers-reduced-motion` respected.
- **Interaction:** hit targets ≥ 44px (or `hitSlop`/padding); press feedback within ~100ms; disabled = opacity 0.38–0.5 + `disabled` attr + no action; no hover-only critical actions.
- **Performance:** animate only `transform`/`opacity` (never width/height/top/left); reserve space for async content (CLS < 0.1); virtualize lists > 50 rows (SIEM feed); keep per-frame work < 16ms; skeletons for > 300ms loads.
- **Animation:** 150–300ms micro / ≤ 400ms complex; ease-out enter, ease-in exit; exit ≈ 60–70% of enter; ≤ 1–2 animated focal elements per view; motion must convey cause→effect.
- **Typography/Color:** semantic tokens, never raw hex in components; tabular figures for scores/timers/IPs; 60–75 char measure for prose.

---

## 4. Color + font identity — ✅ DECISION LOCKED: Option A (2026-05-30)

> **Confirmed by the user:** **Option A — "Duality base, neon accent."** Phase 0 executes against this. Do not re-open.

This is the single aesthetic call that is genuinely yours. Two coherent directions:

- **Option A — "Duality base, neon accent" (RECOMMENDED).** `#ff3b3b`/`#3b8bff` are the semantic/legible layer (text, borders, severity, buttons' text). `#ff0055`/`#00f3ff` become *glow/accent only* (box-shadows, laser lines, focus halos, hero). Pros: best legibility/contrast, keeps the SOC "authority" feel, smallest change. This is the professional default for a defense demo.
- **Option B — "Full neon HUD."** Promote `#ff0055`/`#00f3ff` to primary everywhere; retire `#ff3b3b`/`#3b8bff`. Pros: maximal cyberpunk punch. Cons: cyan-on-void can shimmer/strain, more contrast tuning, larger diff.

**Fonts (both options):** `Orbitron` = hero wordmark + big HUD numerals only (`font-hud`); `Outfit` = display/headings (`font-display`); `JetBrains Mono` = all technical text. Body prose never Orbitron.

Phase 0 is written for **Option A**. If you want B, say so and I'll swap the token mapping — the phase structure is identical.

---

## 5. Reusable prompt template (paste before every phase prompt)

Built from the trickle structures + this repo's guardrails. Fill the brackets.

```
CONTEXT — read first, in order (per CLAUDE.md "Mandatory Pre-Flight Read"):
  PROJECT_UNDERSTANDING.md, .antigravity-rules.md,
  docs/architecture/MASTER_BLUEPRINT.md, docs/architecture/CONTINUOUS_STATE.md,
  docs/architecture/DESIGN_V5_ENHANCEMENT_PLAN.md (this file), DESIGN.md.
Project root: C:\Users\mmjal\Documents\JUTerminal1

TASK — [one sentence: Style + Component + Purpose].
SCOPE — touch only these files: [real paths]. Do NOT introduce new color/font tokens;
  use the unified tokens from Phase 0. Reuse existing components in components/ui.
CONSTRAINTS (inherit §3 quality gates):
  - tokens only (no raw hex in JSX), transform/opacity animations only,
    150–300ms, reduced-motion safe, focus-visible, ≥44px targets, contrast ≥4.5:1 body.
ACCEPTANCE — [the checks from this phase] + `cd frontend && npm run build` is green.
AFTER — append a timestamped entry to docs/architecture/CONTINUOUS_STATE.md
  (status, why, files changed, what/how) per CLAUDE.md.
```

> Prompt-writing note (trickle): always state **all** of color + type + layout + motion in one prompt ("layered specificity"), pair the **mood** ("tactical SOC, controlled, authoritative") with **execution** (exact classes/tokens), and name the **context** (who's using it, Red vs Blue).

---

## 6. The phases

Each phase: **Goal · Files · Findings · Prompt · Acceptance.** Phases 0–2 are foundation (do first, in order). Phases 3–6 are independent and parallel-safe.

---

### PHASE 0 — Token unification & identity reconciliation `[foundation · low effort · highest impact]`
**Goal:** one source of truth for color/type/elevation; encode the §4 two-tier rule.
**Files:** `frontend/tailwind.config.js`, `frontend/src/index.css` (`:root` + `@layer base`), `frontend/src/styles/v3-design.css` (remove duplicate `:root` overrides), `DESIGN.md` (update to match).

**Prompt:**
```
Unify CyberSim's design tokens into a single source of truth and encode a two-tier color identity (Option A).

1. In tailwind.config.js, make the token set canonical and add the missing layer:
   - Keep: cs-red #ff3b3b, cs-blue #3b8bff, green-signal #00ff88, amber-warn #ffaa00, critical #ff2244.
   - Add an explicit GLOW/accent layer as its own tokens: hud-crimson #ff0055, hud-cyan #00f3ff,
     and *-glow variants already present. Document in a comment: "Duality = semantic/text/border; HUD = glow/accent only."
   - Add `magenta: #a855f7` (referenced but missing — see AiHintPanel) OR map Pro-Tip hints to an existing accent; pick one and be consistent.
   - fontFamily: hud:['Orbitron',...], display:['Outfit',...], mono:['JetBrains Mono',...]. Orbitron must NOT be the default display.
2. In index.css :root, DELETE the stale values that disagree with tailwind
   (--text-secondary, --text-dim) and regenerate the :root block so every CSS var === its Tailwind token exactly.
   Keep --font-display = Outfit; add --font-hud = Orbitron.
3. In v3-design.css, REMOVE the duplicate :root that re-overrides --text-secondary/--text-dim (now redundant).
4. Reconcile the buttons: in v3-design.css, .btn-v3-red/.btn-v3-blue must use ONE identity per element —
   Duality color for text/border, HUD color only for the glow box-shadow. No mixed text/border identities.
5. Update DESIGN.md typography + palette sections to match (Outfit display, Orbitron=hud, two-tier color).
Do not change any component JSX in this phase except where a class name must change to a renamed token.
```
**Acceptance:** `grep` finds no `:root` redefinition of `--text-secondary`/`--text-dim` outside the canonical block; no component uses a hex that has a token; `text-magenta`/`text-text-primary` resolved; `npm run build` green; visual diff shows buttons with single-identity text+border and neon glow only in shadows.

---

### PHASE 1 — Defense-readiness & performance mode `[foundation · low · high (graduation)]`
**Goal:** guarantee a smooth demo on examiner/projector hardware. Implements `HUD_V4_AUDIT.md` action #3.
**Files:** `frontend/src/store/settingsStore.js`, `frontend/src/pages/Settings.jsx`, `frontend/src/components/ui/PerfTier.jsx`, `frontend/src/components/layout/HudEnvironment.jsx`, `index.css`/`v3-design.css` (perf overrides).

**Prompt:**
```
Add a user-facing "Performance Mode" to CyberSim and wire it through the HUD.
- settingsStore: add `perfMode: 'auto' | 'high' | 'low'` (persisted). Default 'auto'.
- On change, set document.documentElement.dataset.perf to the resolved tier
  ('low' when user picks low OR PerfTier auto-detects a weak device).
- Add CSS: [data-perf="low"] disables three.js canvas (.perf-3d{display:none}),
  removes backdrop-filter (set to none), pauses looping ambient animations
  (body::before scanline, card-v3::after scanline, glitch-text), and swaps glass surfaces for solid var(--surface-2).
- HudEnvironment: skip mounting the three.js scene when resolved tier is 'low'; render the static .perf-fallback gradient instead.
- Settings.jsx: a segmented control [Auto · High · Low] with a one-line helper:
  "Low disables 3D and blur for older laptops / projectors." Respect reduced-motion independently.
- Add a tiny status note somewhere unobtrusive (e.g., Settings) showing the auto-detected tier.
```
**Acceptance:** toggling Low visibly stops the three.js background and all looping scanlines, removes blur, keeps full functionality; choice persists across reload; FPS on a throttled CPU (DevTools 6×) stays smooth; `npm run build` green.

---

### PHASE 2 — Bug-fix & consolidation sweep `[foundation · low · medium]`
**Goal:** remove dead classes and the second button system so later phases build on clean ground.
**Files:** `components/hints/AiHintPanel.jsx`, `index.css` (legacy `.btn*`), any page still using `.btn-red/.btn-blue/.btn-ghost` (grep), `components/ui/Button.jsx`.

**Prompt:**
```
Clean up CyberSim styling debt.
1. AiHintPanel.jsx: fix `text-text-primary` -> `text-txt-primary` (2 spots: error + insight bubbleBg);
   fix the Pro-Tip tag classes to use the Phase-0 magenta token (or chosen accent) so they actually render.
2. Grep the whole frontend/src for legacy button classes (\bbtn-red\b, \bbtn-blue\b, \bbtn-ghost\b, \bbtn\b without -v3)
   and for any other Tailwind class referencing a non-existent token (magenta, text-text-*). Print the list first.
3. Migrate every legacy .btn usage to <Button variant=...> (components/ui/Button.jsx).
   If a solid-filled CTA look is still wanted (e.g., landing hero), add it as a documented Button variant
   instead of leaving raw .btn classes. Then delete the now-unused legacy .btn/.btn-red/.btn-blue/.btn-ghost/.btn-sm from index.css.
4. Re-run the grep to prove zero legacy/dead-class references remain.
```
**Acceptance:** grep shows zero `btn-red|btn-blue|btn-ghost` (non-v3) and zero `text-text-`/`*-magenta` (unless magenta token added); Pro-Tip hint renders styled; `npm run build` green.

---

### PHASE 3 — Surface elevation (independent sub-tasks)
Reuse `components/ui/*`. Each sub-phase is a standalone prompt.

#### 3A — Terminal & HUD chrome `[medium · core surface]`
**Files:** `components/terminal/Terminal.jsx`, `hooks/useTerminal.js`, `components/terminal/TerminalToolbar.jsx`, terminal CSS in `index.css`.
**Prompt:**
```
Elevate the Kali terminal into a cinematic-but-readable hacker console without hurting legibility or perf.
- useTerminal.js xterm theme: background transparent (let pane glass show), foreground #9CABB8 (warm gray, less eyestrain),
  cursor green-signal, selection cs-blue/25, ANSI greens = green-signal, reds = cs-red, blues = cs-blue. Tabular, JetBrains Mono.
- Titlebar chrome: traffic-dot decorations + `student@kali:~` dim with blinking cursor; toolbar buttons icon-only with aria-label + tooltip.
- Add a faint phosphor inset glow (inset 0 0 100px rgba(0,255,136,0.03)); scanline overlay only when data-perf != low.
- TerminalToolbar: font-size +/- (persisted, already partly there), find, clear, copy-all; a connection-latency mono readout with colored dot.
- Keep native xterm selection working (per PHASE_V4_PLAN WS-A) — do not regress copy/paste.
```
**Acceptance:** drag-select + copy still works; toolbar buttons have aria-labels; scanline disappears in Low perf; no layout shift on resize; build green.

#### 3B — SIEM feed (Blue Team) `[medium · differentiator]`
**Files:** `components/siem/SiemFeed.jsx`, `__tests__/SiemFeed.test.jsx`, `.siem-event-row` CSS, `components/siem/ForensicsWorkbench.jsx`.
**Prompt:**
```
Make the SIEM feel like a live SOC console — and make it accessible.
- Virtualize the event list (windowing) for >50 events; reserve row height to keep CLS≈0.
- Each row: 3px severity bar (critical pulses ONLY when data-perf!=low), time (tabular mono), severity chip (color+TEXT, never color alone), MITRE chip, message; expand row for src/dst/tool/raw-log.
- New events slide in from top via transform/opacity (250ms ease-out); critical adds a 500ms border flash.
- Wrap the live region in aria-live="polite" (critical = "assertive") with a concise text announcement per new event.
- Toolbar: animated event counter (tabular), severity filter pills (dot+label), signal/noise ratio mini-bar, LIVE/PAUSED indicator.
- Empty state: reuse EmptyState with a sonar/radar idle (CSS, perf-gated) + "Monitoring for activity…".
- Keep existing test green; add a test asserting aria-live presence + severity text label.
```
**Acceptance:** 200+ synthetic events scroll at 60fps; screen reader announces new criticals; severity is never color-only; filters work; tests green; build green.

#### 3C — AI Tutor panel `[medium · UX differentiator]`
**Files:** `components/hints/AiHintPanel.jsx`.
**Prompt:**
```
Polish the AI Tutor into a premium assistant panel (it already parses tagged hints/steps — keep that).
- Typing indicator: three staggered dots (200ms) before a response (replace the spinner-in-bubble for AI turns).
- Optional typewriter reveal for AI text via requestAnimationFrame (~15ms/char), instantly complete if reduced-motion or data-perf=low.
- After an AI message settles: a small fade-in action row (Copy / 👍 / 👎) with aria-labels.
- Input: auto-grow textarea (max 4 lines); rotating context-aware placeholder ("Ask about port scanning…", "What is T1046?"); quick buttons "Hint L1 (−2)" / "Hint L2 (−5)".
- Header: LEARN/CHALLENGE mode badge + phase + branch (already present) — give the mode badge a sliding indicator on toggle.
- Confirm the Pro-Tip/Concept/What-to-do/What-to-look-for tags all render with real tokens (depends on Phase 0/2).
```
**Acceptance:** typing dots animate then resolve to the message; reduced-motion shows text instantly; action row keyboard-reachable; placeholders rotate; build green.

#### 3D — Workspace top bar: score, flags, phase `[medium · most-used chrome]`
**Files:** `components/workspace/WorkspaceTopBar.jsx`, `components/workspace/FlagSubmitWidget.jsx`, `components/ui/ScoreToast.jsx`, `components/workspace/ConnectionPill.jsx`.
**Prompt:**
```
Refine the mission top bar with tactical, tabular, animated status.
- Score: tabular figures; color tier 80+/60–79/<60 = green/amber/red; on change, count up/down + brief glow flash (green gain / red loss); animation transform/opacity only.
- Flags: "⚑ 2/4" with ◆ filled (captured) / ◇ outline (pending); captured flash green once.
- Phase: "PHASE 2 · ENUMERATION" (number cs-blue, name dim) + a thin time-elapsed bar (green→amber→red) — bar uses transform scaleX, not width.
- FlagSubmitWidget popover: mono input, live format validation (green/red border), success = check + green burst (perf-gated), wrong = shake + message; never block input during animation.
- ConnectionPill: connected=green blink "LIVE", connecting=amber spinner, disconnected=red pulse "RECONNECTING attempt n/10", expired=red → login. Each state has text, not just color.
```
**Acceptance:** score animates with tabular alignment (no width jitter); flag/phase states distinguishable without color; flag format validates as you type; build green.

#### 3E — Dashboard & ScenarioCard `[medium · first impression]`
**Files:** `pages/Dashboard.jsx`, `components/dashboard/ScenarioCard.jsx`, `components/canvas/ParticleCanvas.jsx`/`HeroScene3D.jsx`.
**Prompt:**
```
Give the dashboard a command-center hero and finish the card system (the card already has tilt+spotlight — keep, perf-gate it).
- Hero: a contained matrix/particle canvas (reuse ParticleCanvas) at ~12% opacity, disabled at data-perf=low; "CYBER RANGE" wordmark in font-hud (Orbitron) with subtle text-shadow; sub-line in Outfit; three live stat chips (Active Sessions / Scenarios / AI Tutor) using existing Stat/Badge.
- ScenarioCard: cap tilt at maxTilt 5 (already), but disable tilt+spotlight at data-perf=low; ensure keyboard focus shows the same hover affordances; add active-session "RESUME" badge + blinking dot when a session exists.
- Dashboard filter row: tactic/difficulty/time chips + "resume last session" CTA (PHASE_V4_PLAN WS-H 4-rest). Stagger card entrance 40ms/item via framer-motion, reduced-motion safe.
```
**Acceptance:** hero canvas off in Low perf; cards keyboard-operable with visible focus; stagger respects reduced-motion; no CLS as cards load (reserve grid space); build green.

#### 3F — Debrief (after-action report) `[medium · delight + report screenshots]`
**Files:** `pages/Debrief.jsx`.
**Prompt:**
```
Turn Debrief into a mission after-action report worthy of a report screenshot.
- Score ring gauge that fills on load + number counts up from 0 (≤2s, reduced-motion = instant final value).
- Score breakdown as staggered horizontal bars (base / hint penalties / gate penalties / time bonus) — scaleX animation, 200ms stagger.
- Kill-chain horizontal SVG timeline (reuse KillChainView data); captured flags grid glow green; AI-generated recommendation cards.
- Keep the existing jsPDF export; ensure the exported layout is clean (print styles: hide nav/terminals).
```
**Acceptance:** ring + bars animate once and settle; reduced-motion shows final state immediately; PDF export legible; build green.

#### 3G — Command palette completion `[medium · power users]`
**Files:** `components/palette/CommandPalette.jsx`, `store` (ui slice for open state).
**Prompt:**
```
Complete the ⌘K command registry (currently only Navigate/Scenarios/Account).
Add grouped sections: NAVIGATION (Dashboard/Red/Blue/Debrief/Settings), MISSION (Submit flag, Request hint L1/L2/L3, Toggle AI mode, Switch role, End mission), TOOLS (Copy target IP, Insert command, Toggle SIEM live/pause), TERMINAL (Clear, Find, Copy all).
Fuzzy filter on label+keywords; arrow-key nav with cs-blue active row; each row shows its shortcut pill; ESC closes; trap focus; restore focus to trigger on close.
```
**Acceptance:** all groups searchable; full keyboard operation; focus trapped + restored; actions dispatch correctly; build green.

---

### PHASE 4 — Motion system consolidation `[medium · cohesion]`
**Goal:** one motion vocabulary (the four existing easings) applied consistently via framer-motion + the existing keyframes; kill ad-hoc durations.
**Files:** `frontend/src/styles/animations.css` (new, optional) or extend `v3-design.css`; touch points across components.
**Prompt:**
```
Standardize CyberSim motion on the existing four-curve vocabulary (enter/pop/glide tokens already in tailwind.config + v3-design.css).
- Create a small set of framer-motion presets (fadeUp, slideIn, scaleIn, stagger container @40ms/item) exported from one module; use them instead of inline transition objects.
- Replace any animation that touches width/height/top/left with transform/opacity equivalents.
- Every entrance: ease-out enter; every exit ~65% duration, ease-in. Cap looping ambient animations to data-perf!=low.
- Audit for >500ms or linear UI transitions and bring them into 150–300ms.
```
**Acceptance:** grep shows no UI transition animating layout properties; all durations within band; reduced-motion + Low perf disable loops; build green.

---

### PHASE 5 — Accessibility & responsive sweep `[medium · correctness]`
**Goal:** meet the §3 gates everywhere; finish `PHASE_V4_PLAN` Phase 10.
**Files:** repo-wide sweep.
**Prompt:**
```
Run an accessibility + responsive pass against the §3 gates.
- Contrast: audit txt-dim (#5a6178) usages — if used for readable body text, bump to txt-secondary; keep dim for decorative labels only. Verify all body pairs ≥4.5:1 on void/surfaces.
- Keyboard: every CTA Tab-reachable in visual order; focus-visible present (already global) — verify on custom-styled controls (clip-path buttons, segmented toggles).
- ARIA: icon-only buttons get aria-label; SIEM aria-live (from 3B); toasts aria-live polite, no focus steal; modals trap focus + ESC + restore.
- Responsive: verify workspace at 1920/1440/1280/768; terminal usable ≥480px; no horizontal scroll; min-h-dvh over 100vh where used.
- Reduced-motion + Low perf: confirm end-to-end (no looping animation, no 3D).
```
**Acceptance:** keyboard-only walkthrough of Red & Blue workspaces succeeds; axe/Lighthouse a11y has no critical violations; layouts hold at all four widths; build green.

---

### PHASE 6 — Final micro-interaction polish `[low · finish]`
**Goal:** the small stuff that reads as "premium" (vibecodecomponents checklist), reusing existing primitives.
**Files:** `components/ui/{Modal,Card,Badge,Skeleton,EmptyState,LiveIndicator,ScoreToast}.jsx`.
**Prompt:**
```
Final polish pass using existing ui/ primitives (do not add new component files unless one is genuinely missing).
- Toasts: ensure a single ToastProvider-style path (success/error/warning/info/achievement/score-delta); auto-dismiss 4s with a slim countdown bar; achievement = perf-gated confetti; aria-live polite.
- Modals: backdrop blur (perf-gated), spring slide-up from trigger, focus trap, ESC, restore focus.
- Skeletons: shimmer variants (text-line/card/stat/code) reserving exact final dimensions (CLS).
- Empty states: every list that can be empty (SIEM, Notebook, AI chat) uses EmptyState with a contextual icon + suggestion.
- Badges: severity/phase/status/tool/mitre variants consistent with Phase-0 tokens.
- Custom scrollbars already exist — verify applied to SIEM/terminal/notes/chat.
```
**Acceptance:** every empty list has an empty state; toasts/ modals keyboard-safe + perf-gated; skeletons cause no layout shift; build green.

---

## 7. Execution order & sizing

| # | Phase | Why this order | Impact | Effort |
|---|---|---|---|---|
| 1 | **P0** Token unification | Everything else depends on clean tokens | ★★★ | Low |
| 2 | **P1** Performance mode | Protects the live defense; cheap | ★★★ | Low |
| 3 | **P2** Bug/consolidation sweep | Removes traps before building on top | ★★ | Low |
| 4 | **P3D** Top bar (score/flags/phase) | Most-used chrome | ★★★ | Med |
| 5 | **P3A** Terminal | Core product surface | ★★★ | Med |
| 6 | **P3B** SIEM feed | Blue-team differentiator + a11y | ★★★ | Med |
| 7 | **P3C** AI Tutor | UX differentiator | ★★ | Med |
| 8 | **P3E** Dashboard/cards | First impression | ★★ | Med |
| 9 | **P3F** Debrief | Delight + report screenshots | ★★ | Med |
| 10 | **P3G** Command palette | Power feature | ★ | Med |
| 11 | **P4** Motion consolidation | Cohesion across the above | ★★ | Med |
| 12 | **P5** A11y + responsive | Correctness gate before sign-off | ★★★ | Med |
| 13 | **P6** Micro-polish | Final premium feel | ★ | Low |

**Critical path for the defense:** P0 → P1 → P2 → P3D → P3A/P3B → P5. The rest elevates but isn't load-bearing for the demo.

---

## 8. Verification gates (per `CLAUDE.md` Empirical Verification)

Every phase ends with:
1. `cd frontend && npm run build` → exit 0.
2. `cd frontend && npm test` → existing suites green (Button, ConnectionPill, SiemFeed, useWebSocket); add tests where noted (SIEM aria-live).
3. Manual smoke of the touched surface (Red + Blue workspace where relevant), once with **reduced-motion on** and once with **Performance Mode = Low**.
4. Append a timestamped entry to `docs/architecture/CONTINUOUS_STATE.md` (status, why, files, what/how).

**Definition of done for V5:** zero token drift (one source), one color rule documented + applied, no dead classes, a working Low-Perf mode, the §3 a11y gates met on Red & Blue workspaces, and all builds/tests green.
