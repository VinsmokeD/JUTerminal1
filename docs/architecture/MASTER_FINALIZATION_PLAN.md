# Parallax â€” MASTER FINALIZATION PLAN ("the ultimate super plan")

> Authored 2026-05-31 (Claude Opus 4.8), grounded in an empirical sweep of the live tree
> (521 tracked files, branch `master`, GitHub `VinsmokeD/JUTerminal1`), **not** the older plan docs.
> This document **supersedes and consolidates** the scattered plan docs (MASTER_ENHANCEMENT_PLAN,
> EXECUTION_ROADMAP_V2, DESIGN_V5_ENHANCEMENT_PLAN, MOTION_3D_MASTER_PLAN, GRADUATION_DOCUMENTATION_MASTER_PLAN,
> PHASE_V4_PLAN, HUD_V4_AUDIT, DEMO_DAY_PLAN, DEPLOYMENT_PLAN). Those are retired to `docs/history/` in WS8.
> The two LIVE plans it absorbs: `CONTINUE_HERE.md` (eng phases Aâ€“I; Aâ€“D done) and `MOTION_POLISH_PLAN.md`
> (UI phases Aâ€“F, open). Project law in `CLAUDE.md` + `CONTINUE_HERE.md` Â§4 still governs every change.

---

## 0. Where we actually are (the honest baseline)

**Strong / do NOT redo:**
- Backend: 51 source modules, 334 pytest passing (1 skipped); black + mypy + eslint are blocking CI gates.
- Real Kali terminal (`parallax-kali:latest`), 3 scenarios SC-01/02/03 fully built, isolation proven (6/6+ blocked).
- AI tutor live + OWASP-LLM-hardened; ROE scope gate live; scoring correct + documented.
- Frontend: 10 pages, deep component library, Zustand stores, 47 Vitest tests, motion/3D system.
- Docs: 137 markdown files incl. a 7-chapter graduation report, **22 Mermaid diagrams**, a rendered PDF,
  scenario dossiers, student/instructor/maintainer manuals, and an A1/A2/A3 poster (single-file HTML).
- Self-assessed completion **98/100** (README + ROADMAP agree).

**Confirmed REAL gaps (this plan's reason to exist):**
1. **Flag discovery is silent.** Flags carry `discovery_hint`/`on_wrong_attempt_hint` in the YAML and a manual
   `FlagSubmitWidget`, but terminal output is **not scanned for flag-shaped strings** â€” a student who reads the
   answer on screen gets no "that's a flag, capture it" signal. (Owner's headline ask.)
2. **Debrief score is reconstructed client-side** (`Debrief.jsx:506-512`), can mislabel; backend should return a
   structured `score_breakdown`.
3. **Debug noise shipped**: `FlagSubmitWidget.jsx` has `console.log`/`console.warn` in the submit path.
4. **Doc sprawl + drift**: ~10 overlapping plan docs and 6 review reports; some still mention removed SC-04/05;
   findings tables list already-fixed items as open.
5. **In-flight, uncommitted work** in the tree (motion polish) â€” must be landed before opening new fronts.
6. Open eng phases **E (honest coverage), F (degradation/observability), G (kill-chain evidence), H (doc truth),
   I (ws/routes refactor)** and UI phases **Aâ€“F** from `MOTION_POLISH_PLAN.md`.

**Invariants (never violate â€” these are how things broke before):**
- Exactly 3 scenarios. **Never** add SC-04/05. **Never** weaken network isolation. **Never** commit secrets.
- Verify empirically before claiming done (pytest green, image rebuild, live curl/Playwright). No hallucinated completion.
- Append a dated entry to `docs/architecture/CONTINUOUS_STATE.md` after every change; conventional commits.

---

## 1. Execution map (10 workstreams, dependency-ordered)

| WS | Theme | Depends on | Risk | Primary payoff |
|----|-------|-----------|------|----------------|
| **WS0** | Land in-flight work + git/GitHub hygiene | â€” | low | Clean tree, no lost work |
| **WS1** | **Flag & mission clarity** (headline) | WS0 | med | Students *see* flags & objectives |
| **WS2** | SIEM realism, capture-all, a11y live region | WS0 | med | Blue team feels real |
| **WS3** | AI tutor quality + latency + safety | WS0 | low | Better Socratic guidance |
| **WS4** | User tracking + reporting + Debrief truth | WS1 | med | Examiner-grade evidence |
| **WS5** | UI/UX, routing, usability, performance, a11y | WS0 | med | First-impression polish |
| **WS6** | Backend coverage, degradation, observability, refactor | WS0 | med-high | Reliability + maintainability |
| **WS7** | Scenarios / Docker / SC machines + kill-chain evidence | WS0 | high | Hardening + demo proof |
| **WS8** | Documentation truth pass + consolidation | WS1â€“WS7 | low | Single source of truth |
| **WS9** | Presentation: diagrams, PDF, **A2/A3 poster**, deck | WS8 | low | Defense-ready artifacts |
| **WS10** | Final verification + release gate | all | low | Green, reproducible, tagged |

**Suggested sequencing (no deadline):** WS0 â†’ WS1 â†’ (WS2 âˆ¥ WS3 âˆ¥ WS5) â†’ WS4 â†’ (WS6 âˆ¥ WS7) â†’ WS8 â†’ WS9 â†’ WS10.
Parallel tracks (âˆ¥) are worktree-isolatable for background sub-agents if desired.

### â± FAST-TRACK (defense â‰¤ 1 week) â€” front-load what examiners see

Examiners judge the **live demo + poster + report**, not coverage % or a refactor. Crash sequence:

| Day | Do | Skip/defer |
|-----|----|-----------|
| 0.5 | **WS0** â€” land in-flight work, clean tree, CI green | â€” |
| 1â€“2 | **WS1** â€” flag discovery nudge + mission clarity (the visible wow + headline ask) | â€” |
| 1 (âˆ¥) | **WS5 (Aâ€“C only)** â€” finish boot-hero, scroll/route integrity, a11y quick wins (first impressions) | WS5 Dâ€“F deep perf |
| 1 | **WS7 (evidence only)** â€” run 3 kill chains, capture walkthroughs, confirm isolation; light SIEM "looks alive" check (fold in WS2-lite) | deep container hardening |
| 0.5 | **WS4 (Debrief score_breakdown only)** if time â€” else leave the working client score | full analytics rework |
| 2 | **WS9** â€” render 22 diagrams on-theme, rebuild PDF, polish + export **A2 & A3 poster PDFs**, build defense `.pptx` | â€” |
| 0.5 | **WS10** â€” full live walkthrough + screenshots; tag `v1.0.0-rc1` | â€” |

**Defer past the defense:** WS6 (coverage/degradation/refactor â€” invisible to examiners), WS3 deep tutor work
(it's already live â€” just confirm it responds), WS8 full doc consolidation (do a *light* truth-pass only: one
consistent score, no SC-04/05 in active docs). **Verify the AI tutor + SIEM feed both visibly work in the demo
path â€” a silent tutor or dead feed reads worse than any missing refactor.**

---

## WS0 â€” Land in-flight work + git/GitHub hygiene  *(do first)*

**Why first:** the tree has uncommitted motion-polish edits + a new `ScrollToTop.jsx`. Opening new fronts on a
dirty tree risks losing or tangling work.

**Prompt:**
> 1. Run `npm --prefix frontend run verify` (build + 47 tests) and the backend suite per CONTINUE_HERE Â§6.
>    If green, commit the in-flight motion work as discrete conventional commits (it maps to MOTION_POLISH_PLAN
>    Phase A/C: boot-gated hero reveal, `ScrollToTop`, WebGL alpha fix, Debrief share modal). If a test is red,
>    fix before committing.
> 2. Git hygiene: confirm `.env`, `.env.bak.*`, `*.zip`, `backup.zip` are gitignored and not tracked
>    (audit `git ls-files | grep -Ei 'env|backup|\.zip'`); purge any tracked secret-bearing artifact from the
>    index (keep on disk) and document. Verify `MANIFEST.sha256` is still meaningful or retire it.
> 3. GitHub repo hygiene: add/refresh repo description, topics, a clean `README` hero, a LICENSE if missing,
>    branch protection note, and a release tag plan (`v1.0.0-rc1` after WS10). Delete the stale local/remote
>    `phase/0-ground-truth-baseline` branch if merged.
> 4. Tighten `.github/workflows/ci.yml`: ensure black+mypy+eslint+pytest+vitest+`docker compose config` all gate;
>    add a frontend `build` gate and the network-isolation script as an optional job.
>
> **Gate:** clean `git status`, CI green, no tracked secrets, repo metadata polished. Log to CONTINUOUS_STATE.

**Tools:** `Bash`/`PowerShell` git, `gh` CLI, `/code-review` on the staged diff, `git-guardrails` skill (optional).

---

## WS1 â€” Flag & mission clarity  *(headline feature)*

**Why:** Owner's explicit ask â€” "flags should be clear when a user finds them and hinted that this is a flag."
Today nothing detects a flag the student reads on screen.

**Prompt:**
> **Backend** (`backend/src/scenarios/output_patterns.py` + the output-scan path that already emits
> `output_insight` WS frames in `ws/routes.py`): when a completed PTY line matches a scenario flag's
> `value`/`value_pattern`, emit a new WS frame `flag_candidate` `{flag_id, matched_text, points, already_captured}`.
> Do **not** auto-capture (the student must still submit â€” keeps the learning loop) but mark it discovered.
> Respect the no-spoiler rule: only fire on a line the student actually produced, never volunteer the answer.
> Add a unit test per scenario that a known flag line triggers exactly one `flag_candidate`.
> **Frontend:**
> 1. `Terminal.jsx` / `OutputAnnotator.jsx`: when `flag_candidate` arrives, **highlight the matched substring**
>    in the terminal (or a glowing inline chip) and show a non-blocking nudge: *"ðŸš© Looks like a flag â€” submit it
>    for +N pts"* with a one-click "Capture" that prefills `FlagSubmitWidget`.
> 2. `FlagSubmitWidget.jsx`: remove all `console.log`/`console.warn`; on a `flag_candidate`, glow the button and
>    auto-fill the candidate value (student confirms). Keep the captured `N/total` counter.
> 3. **Mission clarity:** make objectives + current phase + flags-remaining always visible in the workspace
>    (extend `WorkspaceTopBar`/`MissionReadinessOverlay`/`PhaseTrail`): each flag shows description + a
>    progressively-revealed `discovery_hint` (gated behind the AI tutor / hint-cost so it isn't a free spoiler).
> 4. On capture: celebratory toast (already partly there) + PhaseTrail tick + ScoreToast; on phase complete,
>    a clear "Phase N complete â†’ Phase N+1 unlocked" banner.
>
> **Gate:** in a live SC-01 run, reading the `/etc/passwd` line surfaces a flag nudge; clicking Capture submits
> FLAG-SC01-1; SIEM still logs the action; no console noise. pytest + verify green. Log to CONTINUOUS_STATE.

**Tools:** `Read`/`Grep` the WS frame plumbing, `ui-ux-pro-max` + `frontend-design` for the nudge/chip,
`web-design-guidelines` for the a11y of the live nudge, `verify`/`browser-use` (Playwright) for the live proof.

---

## WS2 â€” SIEM realism, capture-all, live region

**Why:** "siem feed and logs to capture all and real." Verify every commandâ†’event mapping fires and reaches the
Blue feed + Elastic, with accessible streaming.

**Prompt:**
> 1. Audit `siem/command_bridge.py` + `siem/engine.py` against every `soc_detection` rule in the 3 scenario YAMLs:
>    confirm each `trigger_regex` actually produces an event end-to-end (terminal â†’ Redis pub/sub â†’ WS â†’ SiemFeed)
>    **and** is shipped to Elasticsearch via Filebeat (`infrastructure/docker/siem/filebeat.yml`). Add a test that
>    each rule maps to â‰¥1 event and that no command silently drops.
> 2. Coverage gaps: ensure noisy-but-benign recon (whoami/ip/curl) still produces *some* low-severity telemetry so
>    the feed never looks dead; verify `daemon_noise.py` background events render. Confirm timestamps, source IP,
>    MITRE technique, and severity are populated on every event (no `null` fields in the UI).
> 3. `SiemFeed.jsx`: add an `aria-live="polite"` region (it streams), severity color contrast to WCAG AA, pause/
>    filter controls, and a "X events captured" counter. Confirm `ForensicsWorkbench.jsx` triage still works.
> 4. Blue-team scoring: verify detection bonuses (`directory_scan_detected_within_5min`, etc.) actually award.
>
> **Gate:** run each scenario's kill chain; every detection rule yields a visible + Elastic-indexed event; feed is
> screen-reader-announced; no empty/null fields. pytest + verify green. Log to CONTINUOUS_STATE.

**Tools:** `Grep`/`Read`, `chart-designer`/`data-viz` if adding a SIEM stats strip, `verify` for live capture.

---

## WS3 â€” AI tutor quality, latency & safety

**Why:** "ai improved also." It's live and safe; raise pedagogy + responsiveness.

**Prompt:**
> 1. Review `ai/monitor.py`, `context_builder.py`, `level_classifier.py`, `discovery_tracker.py`,
>    `debrief_coach.py`, `security.py` + `ai-monitor/system_prompt.md`. Confirm hints stay Socratic (Level 1â†’3),
>    â‰¤150 tokens, branch-aware, and never reveal flag values. Tighten the prompt for the 3 scenarios only.
> 2. Latency: confirm OpenRouter calls are async, cached where safe, and debounced (never per-keystroke â€” only on
>    command submit / note save). Add a visible "tutor thinkingâ€¦" state and a graceful fallback line on timeout.
> 3. Calibration: extend `docs/decisions/ai-tutor-calibration.md` with measured hint quality on the real kill
>    chains; add/keep adversarial-safety regression tests (OWASP-LLM-Top-10) green.
> 4. Wire the new WS1 `flag_candidate` into the tutor context so a near-miss gets the `on_wrong_attempt_hint`.
>
> **Gate:** live hints are on-topic, fast (<~3s p50), spoiler-free; safety tests green. Log to CONTINUOUS_STATE.

**Tools:** `claude-api` skill (caching/thinking patterns), `Read`/`Grep`, `verify` for live hint capture.

---

## WS4 â€” User tracking, reporting & Debrief truth

**Why:** "user tracking, reporting." Make the debrief/report the examiner-grade evidence trail.

**Prompt:**
> 1. **Debrief truth (MOTION_POLISH_PLAN M4):** add `score_breakdown {starting, hint_penalty, gate_penalty,
>    time_bonus, flag_bonuses, final}` to `/reports/{id}/report` (`reports/generator.py`); render it verbatim in
>    `Debrief.jsx` (delete the client reconstruction at 506-512 and the unused `baseScore`). Keep a graceful
>    fallback for older sessions.
> 2. **Activity/tracking:** verify `activity/service.py` records the full session timeline (commands, flags, hints,
>    phase transitions, detections) and that `instructor/analytics.py` + `InstructorDashboard.jsx` surface
>    per-student progress, time-on-phase, hint usage, and flags captured. Add any missing event types.
> 3. **Report export:** `reports/generator.py` + `learning_insights.py` â†’ polished PDF (the frontend already has
>    `jspdf`; ensure parity with the backend report). Add a clean print stylesheet so "Print Dossier" scopes to the
>    certificate only (MOTION_POLISH_PLAN L4). Consider a DOCX export via the `docx` skill for academic submission.
> 4. **Privacy:** confirm no full terminal output is stored in Postgres (only command + metadata) â€” invariant.
>
> **Gate:** a real session's Debrief shows backend-computed numbers; instructor view reflects live progress;
> PDF/print are clean. pytest for the new field; verify. Log to CONTINUOUS_STATE.

**Tools:** `docx` skill (academic DOCX), `chart-designer`/`data-viz` (debrief radar/score charts),
`infographic-builder` (learning-insights summary), `Read`/`Edit`.

---

## WS5 â€” UI/UX, routing, usability, performance, accessibility

**Why:** "uiux, user experience, page redirecting, ease of use, usability, performance." Finish MOTION_POLISH_PLAN
Aâ€“F and do a full UX/a11y sweep.

**Prompt:**
> Execute `MOTION_POLISH_PLAN.md` Phases Aâ€“F in order (first-paint correctness, pointer/render perf, navigation &
> scroll integrity incl. the already-added `ScrollToTop`, Debrief hardening, a11y sweep, **empirical 60fps gate**).
> Then a cross-platform UX pass:
> 1. **Routing/redirects:** audit `App.jsx` RouteGuards â€” unauthâ†’Auth, authed-on-publicâ†’Dashboard, deep links to a
>    workspace without a sessionâ†’graceful redirect (not a blank/crash). Verify Onboardingâ†’Dashboardâ†’Workspaceâ†’
>    Debriefâ†’Dashboard flows and back-button behavior. ScrollRestoration on every route.
> 2. **Usability:** consistent loading/empty/error states (Skeleton/EmptyState/ErrorBoundary already exist â€” apply
>    everywhere); CommandPalette discoverability; keyboard shortcuts documented in-app; mobile/responsive sanity on
>    the marketing pages (workspaces can stay desktop-first with a "best on desktop" notice).
> 3. **Accessibility (WCAG 2.2 AA):** axe/Lighthouse â‰¥95 on Landing, Auth, Dashboard, both workspaces, Debrief;
>    focus-visible rings survive `cursor:none`; SIEM/terminal/notes reachable by keyboard; reduced-motion honored
>    end-to-end; decorative mocks `aria-hidden`.
> 4. **Performance:** keep the bundle split (main chunk already âˆ’56KB); lazy-load Three.js/xterm; verify perf tiers
>    downgrade on weak GPUs; Lighthouse perf â‰¥90 on Landing.
>
> **Gate:** all 10 routes behave; axe â‰¥95; Lighthouse perf â‰¥90 (Landing); 60fps validated under CPU throttle (not a
> headless 16-core box); verify green. Log to CONTINUOUS_STATE.

**Tools:** `ui-ux-pro-max`, `web-design-guidelines`, `frontend-design`, `theme-factory`/`color-palette` (token/contrast),
`perf-optimizer`, `react-best-practices`, `verify`/`browser-use` (Playwright, axe).

---

## WS6 â€” Backend coverage, degradation, observability, refactor

**Why:** Open eng phases E, F, I from `CONTINUE_HERE.md`.

**Prompt (run as three sub-phases, pytest green after each):**
> **E â€” Honest coverage:** remove/shrink the `omit` list in `backend/pyproject.toml`, record the honest baseline,
> raise `scenarios/engine|gatekeeper|branching`, `siem/engine|command_bridge` to â‰¥80% with focused unit tests, add
> `--cov-fail-under=<floor>` to CI.
> **F â€” Degradation & observability:** prove the app degrades (not crashes) when Redis/Elastic are down (add a test
> per outage path); confirm session recovery after `docker compose restart backend`; add a `/api/metrics` endpoint
> (active sessions, WS count, AI latency, SIEM lag) + structured JSON logs; document single-node load limits via
> `backend/tests/load_test.py`.
> **I â€” ws/routes refactor:** FIRST add characterization tests around command pipeline / gate / hint / reconnect,
> THEN extract `ws/command_pipeline.py`, `ws/hint_service.py`, `ws/session_runtime.py` with zero behavior change;
> async-correctness + Redis key-namespacing audit.
>
> **Gate:** honest coverage in CI; outages degrade gracefully (proven live + test); metrics endpoint live;
> ws/routes meaningfully smaller, suite green throughout. Log to CONTINUOUS_STATE.

**Tools:** `test-driven-development`/`tdd`, `systematic-debugging`, `refactor-assistant`, `perf-optimizer`, `code-review`.

---

## WS7 â€” Scenarios / Docker / SC machines + kill-chain evidence

**Why:** "the sc machines, the docker"; open eng phases B-remainder (hardening) + G (evidence).

**Prompt:**
> 1. **Hardening (R3):** finish least-privilege on the fail-open containers (`sc01-php`, `sc02-dc`,
>    `sc02-fileserver`, `sc03-mailrelay`, `sc03-victim`) â€” add `no-new-privileges` + minimal `cap_add` incrementally,
>    testing each scenario's kill chain after every change; if a cap is needed, KEEP it and document why in
>    `docs/SECURITY_THREAT_MODEL.md` R3. Re-run `scripts/verify-network-isolation.sh` (must stay all-blocked).
> 2. **Realism polish:** confirm SC-01 (NovaMed) LFI/SQLi/Redis/IDOR/backup routes, SC-02 (Nexora AD) SYSVOL/GPP/
>    AS-REP, SC-03 (Orion) SSO landing + persona victim sim all behave; flags reachable; hints/detections match.
> 3. **Kill-chain evidence (Phase G):** run each scenario end-to-end through the REAL terminal; capture transcript,
>    SIEM events, phase advancement, final score; save to `docs/final-report/scenarios/<sc>-walkthrough.md`. Confirm
>    `randomizer.py` varies flags/IPs per session without breaking hints/detections.
> 4. **Compose/runbook:** `docker compose config --quiet` green; `docker-safe.ps1` + demo runbook current;
>    document exact rebuild commands and the ~8s reset.
>
> **Gate:** 3 kill chains complete with captured evidence; isolation script all-blocked; pytest green. Log to CONTINUOUS_STATE.

**Tools:** `Bash`/`PowerShell` (docker), `security-review`, `Read`/`Grep`, `verify` for the live walkthroughs.

---

## WS8 â€” Documentation truth pass + consolidation

**Why:** "documentationâ€¦ remove old unnecessary unupdated docs." Sprawl is real: ~10 plan docs + 6 reviews + drift.

**Prompt:**
> 1. **Consolidate:** make THIS file the single architecture-plan source of truth. Move the superseded plan docs
>    (listed in the header) and the stale `docs/reports/*` review files into `docs/history/` with a one-line
>    "retired, see MASTER_FINALIZATION_PLAN" stub. Do NOT touch `docs/history/` archives.
> 2. **Truth pass:** reconcile every reviewer-facing doc to the real state â€” one consistent score (98/100, cite
>    `docs/final-report/evidence/LIVE_VERIFICATION_*.md`); mark resolved findings RESOLVED with commit refs in
>    `MASTER_ENHANCEMENT_PLAN`/`BASELINE`; purge any lingering SC-04/05 mentions outside immutable history.
> 3. **Index:** refresh `docs/DOCUMENTATION_INDEX.md` + `docs/INDEX.md` so a reader can navigate in 30s. Ensure
>    `README` reflects WS0â€“WS7 outcomes. Verify `CONTINUE_HERE.md` points here as the active plan.
> 4. **Technical depth:** ensure every subsystem has a current, accurate doc (terminal-proxy, scenario-provisioning,
>    network-and-environment, AI_SYSTEM, SCORING, SECURITY_THREAT_MODEL). Generate API + DB references from code.
>
> **Gate:** no contradictory scores; no orphan/duplicate plan docs in `docs/architecture/`; index navigable;
> SC-04/05 only in immutable history. Log to CONTINUOUS_STATE.

**Tools:** `technical-writer`, `docs-generator`, `markdown-pro`, `api-designer` (OpenAPI ref), `concept-mapper`
(doc map), `graphify` (codebase Q&A to verify claims), `obsidian-brain` MCP (the graph is already synced).

---

## WS9 â€” Presentation: premium diagrams, PDF, A2/A3 poster, deck

**Why:** "very premium diagrams, pdf, A2-3 posterâ€¦ top tier, matching the platform theme."

**Prompt:**
> 1. **Diagrams (22 `.mmd` in `docs/final-report/diagrams/source/`):** render ALL to high-res SVG + PNG with a
>    consistent Parallax dark theme (Orbitron/Rajdhani headings, the poster's token palette: `--gold #C8A94A`,
>    `--cyan #00F0FF`, `--green-hi #1FA268`, ink `#EAF1FB` on `#0A0F1C`). Add a Mermaid theme config + a render
>    script so they regenerate deterministically. Verify each diagram matches the REAL system (terminal/SIEM/AI/
>    scoring/scope-gate/scenarios). Update `diagrams/catalog.md`. Embed the rendered set in the report.
> 2. **Graduation PDF:** rebuild `docs/final-report/formal-report/parallax-graduation-report.pdf` from the 7
>    chapters + rendered diagrams; verify render (`render-verification.md`). Cross-check the
>    requirements-traceability-matrix and references.
> 3. **A2/A3 poster:** the A1/A2/A3 single-file HTML already exists and is on-theme. Polish it to "top tier":
>    verify A2 + A3 print fidelity (it's ISO 1:1.414 so it scales), tighten the information hierarchy (problem â†’
>    architecture â†’ red/blue â†’ AI safety â†’ results/metrics â†’ QR to repo/demo), embed 4â€“6 of the rendered diagrams,
>    real metrics (334 tests, isolation, scenarios), and export print-ready **A2 and A3 PDFs**. Optionally produce a
>    Canva version via the Canva MCP for an editable handoff. Proof at 100% zoom â€” no overflow/clipping.
> 4. **Defense deck:** build/refresh the slide deck (`defense-deck-outline.md`) as a real `.pptx` on the same theme
>    (title, problem, demo flow, architecture, red/blue, AI safety, security model, results, Q&A) with speaker notes.
>
> **Gate:** all 22 diagrams render on-theme + match reality; PDF rebuilt + verified; **A2 and A3 poster PDFs**
> print-clean; deck exported. Log to CONTINUOUS_STATE.

**Tools:** Mermaid CLI (`@mermaid-js/mermaid-cli` via npx) for SVG/PNG; `chart-designer`/`data-viz`/`infographic-builder`
for metric visuals; `markdown-pro`/`docx`/`technical-writer` for the report; **`pptx` skill** for the deck;
`canvas-design`/`ui-mockup`/`brand-guidelines`/`typography-guide` for poster craft; **Canva MCP** for an editable
poster; `WebFetch`/`WebSearch` for citation/reference checks; `browser-use` to print-preview-verify the poster PDFs.

---

## WS10 â€” Final verification + release gate

**Prompt:**
> Full-stack verification: `docker compose up -d` â†’ readiness all-ok; backend suite green; `npm --prefix frontend
> run verify` green; `docker compose config --quiet`; `scripts/verify-network-isolation.sh` all-blocked; a real
> browser walkthrough of all 3 scenarios (login â†’ kill chain â†’ flags surfaced & captured â†’ SIEM â†’ debrief â†’ report).
> Lighthouse a11y â‰¥95 / perf â‰¥90 on Landing. Then tag `v1.0.0-rc1`, push, and write a release summary + a fresh
> `CONTINUE_HERE` pointer. Capture screenshots into `docs/final-report/evidence/screenshots/`.
>
> **Gate:** every check green and reproducible from a clean clone; tagged release; evidence captured.

---

## 2. Capability/tool/skill/MCP map (use the full toolbox)

- **Codebase intelligence:** `graphify` (graph already at `graphify-out/`), `obsidian-brain` MCP (synced), `Grep`/`Glob`.
- **Engineering quality:** `/code-review`, `/security-review`, `/simplify`, `test-driven-development`/`tdd`,
  `systematic-debugging`, `refactor-assistant`, `perf-optimizer`, `react-best-practices`.
- **UI/UX:** `ui-ux-pro-max`, `web-design-guidelines`, `frontend-design`, `theme-factory`, `color-palette`,
  `dark-mode-converter`, `typography-guide`.
- **Visualization/diagrams:** Mermaid CLI, `chart-designer`, `data-viz`, `infographic-builder`, `concept-mapper`,
  `canvas-design`, `wireframe-builder`, `ui-mockup`.
- **Docs/deliverables:** `technical-writer`, `docs-generator`, `markdown-pro`, `api-designer`, `docx`, **`pptx`**,
  `brand-guidelines`, `doc-coauthoring`.
- **AI app work:** `claude-api` (prompt caching/thinking for the tutor).
- **MCP servers:** `Canva` (editable poster), `Google Drive` (deliver artifacts), `memory`/`sqlite` (analysis),
  `fetch`/`WebSearch` (references), `obsidian-brain` (knowledge graph).
- **Empirical verification:** `verify`, `run`, `browser-use` (Playwright + axe + Lighthouse), `Bash`/`PowerShell`.
- **Project flow:** `to-prd`/`to-issues` to split this plan into trackable issues; `loop`/`schedule` for long jobs.

---

## 3. Definition of done (graduation-ready)

- [ ] Tree clean, CI all-gates green, tagged `v1.0.0-rc1`, repo metadata polished (WS0, WS10).
- [ ] Flags surface on discovery + clear mission/objective/phase UI (WS1).
- [ ] SIEM captures every rule, real + Elastic-indexed, accessible (WS2).
- [ ] AI tutor fast, Socratic, spoiler-free, safety-tested (WS3).
- [ ] Debrief/report show backend-truth numbers; instructor analytics live; PDF/DOCX clean (WS4).
- [ ] All routes correct; axe â‰¥95; Lighthouse perf â‰¥90 (Landing); 60fps validated (WS5).
- [ ] Honest coverage gate; graceful degradation; metrics endpoint; ws/routes refactored (WS6).
- [ ] 3 scenarios hardened + kill-chain evidence captured; isolation all-blocked (WS7).
- [ ] Docs consolidated to one source of truth; no drift; SC-04/05 only in history (WS8).
- [ ] 22 diagrams rendered on-theme; PDF rebuilt; **A2 + A3 poster PDFs**; defense deck (WS9).
- [ ] Full live walkthrough proven from a clean clone; evidence screenshots captured (WS10).

â€” End of plan. Start with WS0, then WS1.
