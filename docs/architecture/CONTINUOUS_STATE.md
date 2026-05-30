# CONTINUOUS_STATE — Live Rolling Log

> **Rotation policy (introduced 2026-05-29, Phase 0):** This file is the *live* cross-agent
> memory log. To keep it readable in a single tool call and to honor the token-efficiency
> rules in `CLAUDE.md`, it holds only recent entries. When it grows past ~2000 lines, archive
> the older portion into `docs/history/CONTINUOUS_STATE_ARCHIVE_<date>.md` and keep a lean tail.
>
> **Full history before 2026-05-29:** `docs/history/CONTINUOUS_STATE_ARCHIVE_2026-05-29.md`
>
> **Entry format:** `### [timestamp] - <Agent> (<short title>)` then Status / Why / Where / What & How / Verification.

---

## Recent entries (rolling tail — see archive for older history)

### [2026-05-30] - Claude Opus 4.8 (Scenario completeness audit — SC-01/02/03 made completable + learn-to-learn)

* **Status**: Complete — full backend suite 334 passed / 1 skipped (8.37s); `docker compose --profile sc01 sc02 sc03 config` exit 0; standalone loader + regex validation green.
* **Why**: User asked to verify all three scenarios are fully complete (machines ready, Kali tooled, AI knowledgeable/correct/logical, all hints/flags/artifacts present) and, separately, to make it an easy experience that teaches students *how to learn*. A read-level audit found multiple **scenario-breaking** defects: phase-progression deadlocks, a flag that could never be matched, missing Kali tools, wrong IPs, and brand drift.
* **Where** (12 files):
  - `backend/src/scenarios/engine.py` — `_check_completion_signals`: added `tools_used_any` OR-group (satisfied if ANY listed tool used). Additive/backward-compatible.
  - `docs/scenarios/SC-01-webapp-pentest.yaml` — FLAG-SC01-1 `value_pattern: .*root:x:0:0.*` (was exact-only → uncapturable → phase-3 deadlock); FLAG-SC01-3 pattern→`.*WebAppPass2024!.*` (matches the PHP `define()` artifact); **defined FLAG-SC01-BONUS** (the `/.env.bak` JWT secret) resolving an undefined scoring ref; added `ffuf`,`redis-cli` to tools_expected.
  - `docs/scenarios/SC-02-ad-compromise.yaml` — phase-1 completion was `tools_used:[bloodhound,ldapsearch,crackmapexec,impacket-getuserspns]` → **deadlock** (cme gated@3, getuserspns gated@2, and "bloodhound" never matches the recorded "bloodhound-python"). Replaced with `tools_used_any:[bloodhound-python,ldapsearch,smbclient,enum4linux,nmap,crackmapexec]`; aligned tools_expected names + added gpp-decrypt/GetNPUsers/enum4linux/ldapsearch.
  - `docs/scenarios/SC-03-phishing.yaml` — GoPhish IP `.40`→`.10` (ground truth); `network` string→dict{cidr,hosts} (now enforces ROE scope, previously silently disabled); briefing `.novamed.sim`→`orion-logistics.sim`; branch_sso `NEXORA`→`Orion`; gophish gate `4`→`2`; phase-1/2/3 completion → reachable `tools_used_any` (fixes theHarvester-not-installed, gophish-never-typed-and-gated@4, and netcat-vs-`nc` name mismatch — all deadlocks).
  - `infrastructure/docker/kali/Dockerfile` — added `theharvester` (SC-03 OSINT), `redis-tools` (SC-01 unauth-Redis branch), `swaks` (SC-03 SMTP); tolerant `gpp-decrypt` install + static-key openssl shim fallback (SC-02 GPP branch).
  - `infrastructure/docker/scenarios/sc02/provision-dc.sh` — `samba-tool group addmembers "Domain Admins" it.admin` so "DCSync as Domain Admin" is actually backed by a DA account.
  - `ai-monitor/system_prompt.md` — corrected SC-01 (MariaDB not MySQL; documents Redis 6379/FTP 21/SSH 22/`.env.bak`/`db_backup.sql.gz`/server-status/phpmyadmin/.git), SC-02 (MSSQLSvc SPN, rgreen AS-REP, it.admin DA, GPP/SYSVOL), SC-03 (Orion brand, GoPhish .10:3333, callback .10:4444, personas, theHarvester); enriched blue knowledge (4768/4662/4670; Orion callback .10:4444); hardened forbidden-credential list (LEARN+CHALLENGE) with all lab secrets; **added "Teaching philosophy — learning how to learn"** sections to both modes (observe→hypothesise→smallest test→read→document→decide loop; tiny first steps; mental models; normalise being stuck; reflection; fade support).
  - `infrastructure/docker/scenarios/sc03/landing-pages/nexora-sso.html` — rebranded NEXORA→Orion Logistics (content; filename unchanged, nothing references it by name).
  - `docs/architecture/MASTER_BLUEPRINT.md` — fixed stale SPN (CIFS→MSSQLSvc) + SC-03 GoPhish IP (.40→.10); added rgreen.
  - `backend/tests/unit_test_scenarios.py` — added test_31 (no phase-completion gate deadlock), test_32 (scoring bonuses reference defined flags), test_33 (flags capturable + required flags exist) — codifies the fixed bug classes.
* **What & How**: Ground truth was triangulated from `docker-compose.yml`, the per-scenario Dockerfiles/init scripts, and the command→`CommandLog.tool` path (`gatekeeper._parse_tool`). Confirmed flag artifacts physically exist: `db_backup.sql.gz` (FLAG-SC01-2), `admin/config.php` (FLAG-SC01-3), patient 1042 in `init.sql` (FLAG-SC01-4), `/.env.bak` (FLAG-SC01-BONUS), SYSVOL Groups.xml + svc_backup SPN + rgreen UAC (SC-02), victim-simulator callback `172.20.3.30→172.20.3.10:4444` (FLAG-SC03-1). Verified each flag's `value_pattern` `re.fullmatch`-matches the real tool output a student produces (incl. live GetUserSPNs `$krb5tgs$23$...` and secretsdump krbtgt line).
* **Verification**: `pytest` 334 passed/1 skipped; `pytest tests/unit_test_scenarios.py` 40 passed (37→40); standalone loader script → no deadlocks, all flags capturable, scoring resolved; 8 representative flag-regex fullmatch checks all pass; `docker compose` config valid for all profiles. **Follow-up (not yet done):** the `cybersim-kali:latest` image must be REBUILT for the new apt tools to be present (theharvester/redis-tools/swaks are standard kali-rolling packages; gpp-decrypt has a shim fallback) — the build itself was not run in this session.

### [2026-05-30] - Claude Sonnet 4.6 (V5 Phase 3 — Full surface elevation 3A–3G)

* **Status**: Complete — build ✓ (9.62s), lint exit 0, 27/27 tests pass.
* **Why**: Design V5 Phase 3 — elevate all core surfaces with micro-interactions, accessibility, and polish before the graduation defense.
* **Where** (10 files changed, 308 ins / 47 del):
  - `frontend/src/index.css` — added @keyframes: shake, dot-bounce (×3 stagger), slideFromTop, countUp. New utility classes: animate-shake, dot-bounce-1/2/3, siem-event-new, animate-count-up.
  - `frontend/src/components/terminal/Terminal.jsx` — traffic-dot titlebar (decorative ●●● + blinking cursor), phosphor inset glow perf-gated by role.
  - `frontend/src/components/siem/SiemFeed.jsx` — visually hidden aria-live assertive/polite announcer for new events, role=log on event list, isNew prop drives siem-event-new slide animation on newest row.
  - `frontend/src/components/hints/AiHintPanel.jsx` — three-dot bounce typing indicator (replaces spinner); auto-grow textarea (max 96px); rotating placeholders every 4s; L1/L2/L3 hint quick buttons with score cost; copy/👍/👎 action row fades in on hover for AI messages.
  - `frontend/src/components/workspace/WorkspaceTopBar.jsx` — useCountUp hook animates score over 600ms; border color tier (green/amber/red) on score badge; ◆◇ flag progress indicators.
  - `frontend/src/components/workspace/FlagSubmitWidget.jsx` — live border-color format validation (green valid / red invalid as user types); animate-shake on wrong submission.
  - `frontend/src/components/palette/CommandPalette.jsx` — added "End mission & debrief" + "Toggle SIEM live/pause" items with dispatch actions.
  - `frontend/src/components/dashboard/ScenarioCard.jsx` — activeSessionId prop triggers RESUME badge + pulsing green dot.
  - `frontend/src/pages/Dashboard.jsx` — passes activeMission?.id to ScenarioCard when scenario IDs match.
  - `frontend/src/pages/Debrief.jsx` — ScoreRing number counts up 0→score over 1.2s in sync with SVG ring fill via useCountUp hook.
* **What & How**: All changes are pure presentational/progressive enhancement — no API changes, no state-machine changes, no backend impact. CSS keyframes drive animations; React hooks (useCountUp) drive numeric reveals; aria-live handles screen-reader announcements. Perf-gating via inline opacity/shadow values (phosphor glow is just a CSS box-shadow — always fast).
* **Verification**: `npm run build` → ✓ built in 9.62s. `npm run lint` → exit 0. `npm test` → 27 passed. No runtime errors expected (purely additive JSX + CSS).

### [2026-05-30] - Claude Sonnet 4.6 (V5 Phase 2 — Bug-fix & consolidation sweep)

* **Status**: Complete — build green (7.80s), lint clean (exit 0), zero legacy dead-class references.
* **Why**: Design V5 Phase 2 — remove styling debt before later phases build on top: dead legacy button CSS, two `text-text-primary` typos, one legacy `btn btn-blue` usage in SiemFeed.
* **Where**:
  - `frontend/src/components/hints/AiHintPanel.jsx` — fixed two `text-text-primary` → `text-txt-primary` (error bubble + insight bubble `bubbleBg` strings).
  - `frontend/src/components/siem/SiemFeed.jsx` — migrated triage save button from `btn btn-blue` to `btn-v3 btn-v3-blue btn-v3-sm`.
  - `frontend/src/index.css` — deleted entire legacy `.btn`/`.btn-red`/`.btn-blue`/`.btn-ghost`/`.btn-sm` block (~50 lines). Sole button entry point is now `btn-v3*`.
* **What & How**: Audit confirmed all JSX already used `btn-v3*` except the one SiemFeed triage button (found via `git diff`). `text-text-primary` typos were in uncommitted working-tree changes. After removing the CSS block, a final grep across all `*.jsx`/`*.js`/`*.css` under `frontend/src` found zero legacy references.
* **Verification**: `npm run build` → ✓ built in 7.80s (exit 0). `npm run lint` → exit 0. `grep -rn "btn-red|btn-blue|btn-ghost|text-text-"` → 0 matches.

### [2026-05-30] - Claude Sonnet 4.6 (V5 Phase 1 — Performance mode for defense readiness)

* **Status**: Complete — build green (948 modules, 7.98s).
* **Why**: HUD_V4_AUDIT.md flagged projector frame-drop risk: three.js + full-screen scanline + backdrop-filter + looping ambient animations. No user-facing low-perf escape existed. Added "Low" mode for examiner/projector demo.
* **Where**:
  - `frontend/src/store/settingsStore.js` — added `perfMode: 'auto'|'high'|'low'`, `setPerfMode()`, `applyPerfMode()`, persistence via `cs.ui.perfMode`, initial DOM application on load.
  - `frontend/src/components/ui/PerfTier.jsx` — imported `useSettingsStore`; overrides auto-detection when perfMode is 'low'→tier 0 or 'high'→tier 3; FPS downgrade loop only active in 'auto' mode.
  - `frontend/src/styles/v3-design.css` — added `[data-perf="low"]` CSS block: hides `body::before/::after` (scanline+radial), `display:none` on `.perf-3d`, `backdrop-filter:none` on `.card-v3`, pauses all looping animations while keeping interactive `transition-duration` responsive.
  - `frontend/src/pages/Settings.jsx` — added "Performance" section with [Auto · High · Low] segmented control; context-sensitive helper text per mode; auto-detect explanation note.
* **What & How**: `setPerfMode('low')` → writes localStorage → sets `document.documentElement.dataset.perf='low'` → CSS `[data-perf="low"]` rules kill compositing layers. PerfTier reads `perfMode` from store and skips FPS monitor loop when overridden. No component JSX needed changing — CSS attribute selector does the work.
* **Verification**: `npm run build` exit 0. Setting persists across reload (localStorage). Low mode should visibly stop three.js canvas (perf-3d hidden) and all looping scanlines on next browser test.

### [2026-05-30] - Claude Sonnet 4.6 (V5 Phase 0 — Token unification & identity reconciliation)

* **Status**: Complete — build green (948 modules, 7.05s), all acceptance greps pass.
* **Why**: Triple token drift (same semantic colors defined 3× with different values), dual color identity with no rule (Duality and HUD neon colliding inside single components), Orbitron incorrectly first in `fontFamily.display` (causing `.font-display` to render Orbitron instead of Outfit), missing `magenta` token making Pro-Tip hints render unstyled.
* **Where**:
  - `frontend/tailwind.config.js` — added `magenta: '#a855f7'`; split `fontFamily` into `hud: ['Orbitron']` + `display: ['Outfit']` + `mono: ['JetBrains Mono']`; added two-tier color rule comment.
  - `frontend/src/index.css :root` — fixed `--text-secondary #8890a4 → #9ba3b8`, `--text-dim #4a5068 → #5a6178`; added `--text-ghost: #3a4054`, `--font-hud: 'Orbitron'`, `--magenta: #a855f7`.
  - `frontend/src/styles/v3-design.css :root` — removed duplicate `--text-secondary/--text-dim/--text-ghost` definitions that were the fragile import-order patch; kept motion vars and elevation.
  - `frontend/src/styles/v3-design.css` buttons — fixed `.btn-v3-red` bg/border from hud-crimson → cs-red (glow stays hud-crimson); fixed `.btn-v3-blue` text+border from hud-cyan → cs-blue (glow stays hud-cyan). One identity per element.
  - `DESIGN.md` — updated color palette section with two-tier rule table; updated typography table (Orbitron=hud only, Outfit=display).
* **What & How**: Phase 0 of DESIGN_V5_ENHANCEMENT_PLAN.md. No component JSX changed. Pure token/CSS fixes. The `magenta` Tailwind token now resolves `border-magenta/30 text-magenta bg-magenta/5` in AiHintPanel.jsx's Pro-Tip tag.
* **Verification**: `npm run build` exit 0 (948 modules). `grep` confirms v3-design.css `:root` has no `--text-secondary` redefinition. Canonical values in index.css match tailwind.config.js token values.

* **Status**: Complete - verified zero runtime errors across all routes via Puppeteer and cleaned up redundant button classes.
* **Why**: The user requested a review of the frontend to ensure stability after reporting an intermittent React `TypeError` (which was likely from a cached/stale build) and to keep the current design as it was deemed "good".
* **Where**:
  - `frontend/src/pages/Dashboard.jsx` - Replaced raw `button` tags with the custom `Button` component from the UI library for the briefing modal.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry.
* **What & How**:
  - Wrote automated Puppeteer scripts to navigate to `/`, `/dashboard`, and session workspaces to guarantee that the UI renders without hitting `Cannot read properties of undefined (reading 'type')`.
  - Refactored the Dashboard briefing actions to strictly use `Button variant="ghost"` and `variant="danger"`.
  - Rebuilt the frontend via `npm run build` and ensured successful compilation with zero ESLint or build errors.
* **Verification**:
  - `npm run build` output: 949 modules transformed, successfully built in 8.05s.
  - Puppeteer local smoke test reported zero `pageerror` or `console error` across all major routes.

### [2026-05-24 10:16:00 +03:00] - Antigravity (HUD E2E Verification & Core Bugfixes)
* **Status**: Complete - resolved critical bugs preventing natural overlay dismissal, and executed screenshot verification suite.
* **Why**: The senior graduation examiner review required verifying Tasks 1â€“6 from HUD redesign, producing updated visual evidence, and addressing technical drifts (SQL mutations, missing WebSocket payload IDs).
* **Where**:
  - `backend/src/ws/routes.py` (lines 410-425) - added `session_id` to the WebSocket readiness updates.
  - `backend/src/sessions/routes.py` (lines 414-419) - replaced in-place JSON modification of session metadata with a fresh dict assignment to ensure database commits dirty the attribute.
  - `capture_screenshots_v2.js` (lines 53-65) - modified ensuring hook to dynamically wait for the Mission Readiness Overlay DOM element to detach.
  - `screenshot-temp-env/capture_screenshots_v2.js` - updated script in the temporary environment.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry.
* **What & How**:
  - Injected missing `session_id` key in `readiness_update` WS frame payload from backend, enabling frontend to pass the ID check and close overlay naturally.
  - Fixed standard SQLAlchemy JSON trap by assigning `{**meta, "force_unlocked": True}` instead of mutating dict in-place, which correctly triggers database writes on override.
  - Aligned Playwright screenshot hook to wait dynamically for `'text=MISSION READINESS REPORT'` selector with state `'detached'` rather than using hardcoded timeouts.
* **Verification**:
  - Reran full backend test suite (`pytest -q`): `188 passed, 1 skipped in 10.26s`.
  - Serviced demo readiness checking (`python scripts/demo_check.py`): `ALL 12 CHECKS PASSED`.
  - Executed high-fidelity visual capture (`node capture_screenshots_v2.js`): exit status 0, generating all 12 optimized screenshots in final-report evidence folder.

### [2026-05-26 18:15:26 +03:00] - Codex (AI Monitor Probe Spam Regression Test)
* **Status**: In progress - added the failing regression expectation for the SC-01/SC-02 tutor probe spam before changing production monitor logic.
* **Why**: The target reachability socket probe can falsely mark an up sandbox target as offline and return the repeated "offline or still starting up" tutor message on unprompted WebSocket observations.
* **Where**:
  - `backend/tests/unit_test_scenarios.py` - changed the unreachable-probe test to assert that probe failure must not emit offline/startup guidance.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry.
* **What & How**:
  - Kept the test focused on the existing `get_ai_hint` call path by monkeypatching `_probe_target` to return `False` and disabling `OPENROUTER_API_KEY`.
  - The expected behavior is now silent/static Socratic fallback behavior, never the stale target-offline stub.
* **Verification**:
  - Pending red/green verification.

### [2026-05-26 18:16:15 +03:00] - Codex (AI Monitor Regression Harness Correction)
* **Status**: In progress - corrected the new regression test harness after the first run failed before exercising the monitor behavior.
* **Why**: Python 3.14 did not provide an implicit default event loop for `asyncio.get_event_loop()`, so the test needed to follow the file's existing `pytest.mark.asyncio` pattern.
* **Where**:
  - `backend/tests/unit_test_scenarios.py` - converted `test_ai_probe_failure_does_not_emit_offline_message` to an async pytest test.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry.
* **What & How**:
  - Replaced the manual event-loop call with `await monitor.get_ai_hint(...)`, keeping the same unreachable-probe assertion.
* **Verification**:
  - First red run failed on the event-loop harness, not the product behavior; the intended red run is pending.

### [2026-05-26 18:16:56 +03:00] - Codex (AI Monitor Probe Spam Fix)
* **Status**: In progress - removed the per-message target probe decision from the AI monitor hint path.
* **Why**: The backend's socket probe can return false negatives across Docker network boundaries even when SC-01/SC-02 targets answer HTTP/SMB from the student sandbox, causing repeated false "scenario target offline" tutor messages.
* **Where**:
  - `backend/src/ai/monitor.py` - `get_ai_hint` now trusts scenario readiness/lifecycle checks and no longer returns the target-offline fallback from probe failure.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry.
* **What & How**:
  - Set `target_reachable` to `True` in the tutor context and removed the `if not target_reachable` early return.
  - Kept the normal OpenRouter/static fallback/cooldown logic intact, so missing API keys still produce bounded Socratic guidance for meaningful commands without health-probe spam.
* **Verification**:
  - Red regression test previously failed with the offline/startup stub; green verification pending.

### [2026-05-26 18:25:17 +03:00] - Codex (AI Monitor Probe Spam Fix Verification)
* **Status**: Complete - AI monitor no longer emits the false target-offline fallback, regression coverage is green, and the running backend was restarted and live-checked through the WebSocket tutor path.
* **Why**: The user reported repeated "scenario target offline" messages while SC-01 was demonstrably reachable; this was caused by a per-message backend probe being trusted more than the scenario readiness layer.
* **Where**:
  - `backend/src/ai/monitor.py` - removed the `_probe_target` call/early offline return from `get_ai_hint`, leaving `target_reachable=true` in the AI context.
  - `backend/tests/unit_test_scenarios.py` - replaced the old offline-stub expectation with `test_ai_probe_failure_does_not_emit_offline_message`.
  - `docs/architecture/CONTINUOUS_STATE.md` - this entry plus the in-progress TDD entries above.
* **What & How**:
  - Red test evidence: `python -m pytest tests/unit_test_scenarios.py::test_ai_probe_failure_does_not_emit_offline_message -q` initially failed because `get_ai_hint` returned the offline/startup stub.
  - Green test evidence: the same targeted pytest passed after the monitor change.
  - Restarted `cybersim-backend-1` so Uvicorn loaded the bind-mounted source change.
  - Live WebSocket tutor check sent three `tutor_question` frames to session `0bd5325b-7b2b-4021-8206-95d24d307081` within roughly 30 seconds; all three returned tutor responses and `offline_or_starting_up_count=0`.
  - Phase DB check used the actual schema column (`phase`); the requested `current_phase` column does not exist. The latest SC-01 session has three `flag:capture` rows (`FLAG-SC01-1`, `FLAG-SC01-2`, `FLAG-SC01-4`) but `sessions.phase=1` and Redis state `phase=1`, so phase advancement is a real backend/state issue separate from the probe fix.
* **Verification**:
  - `python -m pytest tests/unit_test_scenarios.py -q` -> `37 passed in 1.64s`.
  - Full backend pytest with host-local DB/cache URLs -> `295 passed, 1 skipped in 8.52s`.
  - `docker compose config --quiet` -> exit 0.
  - `git diff --check -- backend/src/ai/monitor.py backend/tests/unit_test_scenarios.py docs/architecture/CONTINUOUS_STATE.md` -> exit 0 with normal CRLF conversion warnings only.
  - `curl.exe -s http://localhost:8001/api/health/readiness` -> status `ok` for Postgres, Redis, Elasticsearch, and OpenRouter.

### [2026-05-26 19:19:02 +0300] - Gemini CLI (Session Management & Auth Upgrades)
* **Status**: Complete - Implemented auto sign-out, session 401 cleanup, return URL routing, and global active mission nav.
* **Why**: The user requested professional session features: skipping sign-in when authenticated, timing out inactive sessions, fixing session invalidation state, and redirecting properly via back/return mechanisms.
* **Where**:
  - rontend/src/App.jsx - Added RequireUnauth and SessionManager wrappers.
  - rontend/src/components/ui/SessionManager.jsx - New component tracking inactivity (30m limit, 2m warning modal).
  - rontend/src/pages/Auth.jsx - Handles ReturnURL params.
  - rontend/src/lib/api.js - Intercepts 401s, clears storage, and appends returnUrl query param.
  - rontend/src/components/nav/CyberSimNav.jsx - Added global Active Mission pill.
  - rontend/src/store/sessionStore.js - Added activeSession state.
* **What & How**:
  - Auth flow now passes state={{ from: location }} to preserve target routes, making the login screen smart.
  - Inactivity tracker binds to mouse/keyboard/scroll events with throttling to auto-logout abandoned lab environments.
  - 401 API responses comprehensively wipe all Zustand/localStorage state to fix ghost sessions.
  - Signed-in users landing on / or /auth are immediately forwarded to their dashboard or previous route.
  - Navigation bar queries /sessions/active to display an accessible return button across all portal pages.

### [2026-05-27 21:37:00 +03:00] - Antigravity (Phase 9A — Report Quality, Format & Theme Redesign)
* **Status**: Complete — Premium DOCX and PDF generated. 521,452 B DOCX / 960,684 B PDF. All 16 figures embedded. All 7 chapters styled with CyberSim theme. MANIFEST.sha256 updated. next-phase-proposal.md updated with Phase 10.
* **Why**: User requested improved quality, format, layout, readability, and theme redesign of the formal report. The v1 compiler used plain python-docx defaults with no color or brand application.
* **Where**:
  - `scripts/compile_report_v2.py` — created. 1000-line premium compiler with Markdown parser, brand palette, styled tables, code blocks, chapter title blocks, figure embedder, and Word COM PDF export.
  - `docs/final-report/formal-report/cybersim-graduation-report.docx` — regenerated (521,452 B).
  - `docs/final-report/formal-report/cybersim-graduation-report.pdf` — regenerated (960,684 B).
  - `docs/final-report/formal-report/render-verification.md` — recreated for v2 with full theme/compliance audit table.
  - `docs/final-report/next-phase-proposal.md` — Phase 9A completion block + Phase 10 Defense Preparation proposal appended.
  - `MANIFEST.sha256` — regenerated (32 entries, Phase 9A hashes locked).
  - `docs/architecture/CONTINUOUS_STATE.md` — this entry.
* **What & How**:
  - CyberSim Brand Palette: BRAND_DARK #0D1B2A (navy), BRAND_ACCENT #00B4D8 (cyan), BRAND_MID #17324E, BRAND_LIGHT #E8F4F8.
  - Cover page: navy + cyan title block, university/school/department text, year block.
  - Chapter title blocks: navy label strip + light-blue heading band + bottom accent border.
  - H2: left 18pt cyan border rule + 0.4cm indent. H3: left 10pt mid-navy border + 0.3cm indent.
  - Tables: navy header fill (white bold text) + alternating alice-blue rows + first-column bold + caption above.
  - Figures: centered 13.5cm wide PNGs + italic caption below. Caption lines in MD skipped if image rendered above.
  - Code blocks: Courier New 9pt + grey (#F5F5F5) fill + cyan left border.
  - Per-chapter table numbering (Ch.N) for KASIT compliance.
  - Markdown parser handles H1/H2/H3/para/bullet/numbered/code/table/figure blocks.
  - Word COM called for Fields.Update() and PDF export.
  - Fixed python-docx 1.2.0 RGBColor tuple indexing (no .red/.green/.blue attributes).

### [2026-05-27 21:43:00 +03:00] - Antigravity (Prompts D, E, F, Phase Logic, Layer 2 Regex Refinement)
* **Status**: Complete - Fixed phase advancement logic, added LEARN mode tool/IP regex prevention, added "Missions" button to TopBar, hid active mission pill on session page, and added /restart endpoint with "Restart sandbox" button.
* **Why**: The user requested a series of UI and backend fixes (Prompts D, E, F) and conditionally fixing phase advancement and regex refinement based on previous session summaries.
* **Where**:
  - rontend/src/components/workspace/WorkspaceTopBar.jsx - Updated back button text to "Missions" and added "Restart sandbox" button.
  - rontend/src/components/nav/CyberSimNav.jsx - Hid active mission pill when currently in a session.
  - ackend/src/sessions/routes.py - Added POST /{session_id}/restart endpoint.
  - ackend/src/ai/security.py - Added LEARN_MODE_PATTERNS to block tool and IP leakage in LEARN mode. 
  - ackend/src/ai/monitor.py - Passed mode to sanitize_tutor_response.
  - ackend/src/scenarios/engine.py - Fixed the 	ools_used intersection check so phase advancement correctly queries and evaluates alternative tools.
* **What & How**:
  - Updated WorkspaceTopBar and CyberSimNav to improve dashboard navigation and Active Mission pill behavior.
  - Built the /restart session endpoint which invokes stop_scenario_container and clears the terminal history from Redis, allowing users to safely bounce their sandbox environments.
  - Patched the phase advancement logic bug in engine.py where a truthy intersection of equired & used_tools erroneously passed the requirement when alternative tools were present. Explicitly expanded the DB query and enforced a logical AND/OR evaluation.
  - Refined Layer 2 Regex in security.py by adding LEARN_MODE_PATTERNS to catch IPv4 leakage and flagless tool disclosure specifically when the AI is in learn mode.

### [2026-05-27 21:52:00 +03:00] - Antigravity (Run fully on docker start)
* **Status**: Complete - Added restart policies and brought up the full project stack.
* **Why**: The user requested that the project run fully when the docker daemon starts.
* **Where**:
  - docker-compose.yml - Appended estart: unless-stopped to postgres, edis, elasticsearch, ilebeat, and sc01-db.
* **What & How**:
  - Modified the Compose file so the core infrastructure services automatically start with the Docker host.
  - Rebuilt and started the full suite of containers including SC01, SC02, and SC03 using docker compose --profile sc01 --profile sc02 --profile sc03 up -d. All containers resolved as healthy.

### [2026-05-27 22:03:00 +03:00] - Antigravity (Prompts A, B, C, D, E, F - Session & Navigation Upgrades)
* **Status**: Complete - Implemented session inactivity hooks, return URL login redirects, stale token app-load checks, workspace back/Missions buttons, role-switching Active Mission pills, and dynamic scenario restart capabilities.
* **Why**: The user provided a structured prompt set to resolve six discrete session and routing bugs to prepare for graduation project defense.
* **Where**:
  - rontend/src/components/ui/SessionManager.jsx - Created SessionActivityContext and useSessionActivity hook.
  - rontend/src/components/terminal/Terminal.jsx - Wrapped xterm onData to trigger esetActivity (throttled).
  - rontend/src/pages/Auth.jsx - Read and validated whitelisted eturnUrl (starts with /) on successful login.
  - rontend/src/store/authStore.js - Updated logout() to call clearSession() on Zustand useSessionStore and updated checkAuth to logout on API failure.
  - rontend/src/components/workspace/WorkspaceTopBar.jsx - Converted the back button style to tn-v3 btn-v3-subtle, added in-progress badge info, and renamed endpoint triggers.
  - rontend/src/pages/RedWorkspace.jsx & rontend/src/pages/BlueWorkspace.jsx - Mount-registered setLastVisitedRole('red' | 'blue') to the store and forwarded completed_at to the top-bar.
  - rontend/src/components/nav/CyberSimNav.jsx - Handled routing for Active Mission pill to support lastVisitedRole navigation and fixed the logo to point to /dashboard when authenticated.
  - ackend/src/sessions/routes.py - Renamed container endpoint to /restart-sandbox and implemented a logical /restart endpoint that snapshots current runs to metadata.runs[] and resets progress variables.
  - rontend/src/pages/Dashboard.jsx - Implemented confirm-modal-gated estartScenario action and updated card controls/text to "Terminate Mission".
  - rontend/src/pages/Debrief.jsx - Appended a "Retry this scenario" button that triggers a logical session reset.
* **What & How**:
  - Hooked up xterm typing events directly to React Context to reset the inactivity timer.
  - Hardened JWT auth checks: if user enters the page with an expired token, the app immediately intercepts, logs out, and redirects to /auth with a valid eturnUrl query parameter.
  - Implemented the snapshotting scenario restart logic in DB and Redis, clearing commands from the current run while maintaining historical debrief reports.
  - Verified compilation via 
pm run build and ran unit tests successfully.

### [2026-05-27 22:15:00 +03:00] - Antigravity (Remove CRT, boot sequence, HUD controls, and audio effects)
* **Status**: Complete - Stripped HudEnvironment, removed hudSound entirely, updated App and Landing routing, and cleaned up v3-design styles.
* **Why**: The user requested cleanup of the heavy "immersive HUD" components and audio utilities that were restored by a previous agent from an older branch.
* **Where**:
  - frontend/src/components/layout/HudEnvironment.jsx - Stripped to a minimal React component wrapping children.
  - frontend/src/App.jsx - Removed HudEnvironment import and wrapper tag.
  - frontend/src/lib/hudSound.js - Deleted the audio controller library entirely.
  - frontend/src/pages/Landing.jsx - Removed references and imports to hudSound.
  - frontend/src/styles/v3-design.css - Deleted CRT scanlines, flicker animations, coordinates ticker, boot consoles, and radar sweep keyframes.
* **What & How**:
  - Simplified HudEnvironment to act as a direct transparent wrapper (passthrough) without state, three.js canvas, clock loops, or sound events.
  - Removed hudSound usage inside Landing.jsx buttons to prevent browser runtime reference errors.
  - Deleted obsolete CSS selectors and keyframe blocks from the v3 design system stylesheet to ensure no styles bleed.
  - Verified clean compilation with npm run build and verified formatting/linter rules.

### [2026-05-27 22:25:00 +03:00] - Antigravity (Fix Windows IPv6 localhost resolution and Commit working tree upgrades)
* **Status**: Complete - Changed backend test URL targets to 127.0.0.1 to avoid Windows IPv6 resolution latency, and committed all remaining session management and navigation upgrades.
* **Why**: The integration and performance tests exhibited a 2.1-second latency check failure on Windows due to `localhost` dns mapping attempting IPv6 prior to falling back to IPv4. Saving the remaining uncommitted session logic prevents any loss of progress in future sessions.
* **Where**:
  - backend/tests/integration_test.py - Replaced `localhost` with `127.0.0.1` in database and Redis target URLs.
  - backend/src/ai/monitor.py, backend/src/ai/security.py, backend/src/scenarios/engine.py, backend/src/sessions/routes.py, docker-compose.yml - Committed backend changes.
  - frontend/src/components/nav/CyberSimNav.jsx, frontend/src/components/terminal/Terminal.jsx, frontend/src/components/ui/SessionManager.jsx, frontend/src/components/workspace/WorkspaceTopBar.jsx, frontend/src/hooks/useTerminal.js, frontend/src/lib/api.js, frontend/src/pages/Auth.jsx, frontend/src/pages/BlueWorkspace.jsx, frontend/src/pages/Dashboard.jsx, frontend/src/pages/Debrief.jsx, frontend/src/pages/RedWorkspace.jsx, frontend/src/store/authStore.js, frontend/src/store/sessionStore.js - Committed frontend changes.
* **What & How**:
  - Rewrote test runner environment variables to query the raw loopback address `127.0.0.1`, which avoids the Windows DNS helper 2-second timeout.
  - Verified that all 41 integration tests and all 190+ unit tests across the backend now execute and pass successfully in under 7 seconds total.
  - Re-built and verified the frontend compiles with zero warnings or errors.

### [2026-05-27 22:40:00 +03:00] - Antigravity (AI Tutor Panel Chat & Flag Submission Rework)
* **Status**: Complete - Replaced the MissionReadinessOverlay, added inline chat input to the AI Tutor panel, enabled interactive Tutor mode toggling via top bar, and implemented flag submission inside the top bar.
* **Why**: The user requested that the AI tutor panel match the second screenshot (a chat input instead of the static guidance levels), that the flag submission panel be moved to the top bar (SUBMIT FLAG inline pill), and that the "readiness report boot sequence" (MissionReadinessOverlay) be removed entirely.
* **Where**:
  - `backend/src/sessions/routes.py` - Made `_session_dict` async to fetch dynamic flags captured status and total spec flags count, and updated all callers to await it.
  - `frontend/src/hooks/useWebSocket.js` - Exposed `sendTutorQuestion` helper inside the websocket hook to send raw `tutor_question` frames.
  - `frontend/src/components/hints/AiHintPanel.jsx` - Replaced the old segmented toggles and request-hint buttons with a chat input and Socratic tutor info drawer.
  - `frontend/src/components/workspace/WorkspaceTopBar.jsx` - Enabled interactive toggling of Tutor mode and appended `SubmitFlagWidget` with validation form modal.
  - `frontend/src/pages/RedWorkspace.jsx` - Removed `MissionReadinessOverlay` imports, registered the `handleFlagSubmit` callbacks, and forwarded props to `WorkspaceTopBar` and `AiHintPanel`.
  - `frontend/src/pages/BlueWorkspace.jsx` - Removed `MissionReadinessOverlay` references and connected the `AiHintPanel` chat stream.
* **What & How**:
  - Enabled direct workspace rendering upon page load by removing the overlay diagnostic blocker on both offensive and defensive panels.
  - Streamlined `AiHintPanel` down to a scrolling tutor chat list, welcome initialization message, and input form dispatching backend socket queries.
  - Placed the inline flag counter and submission modal button within the workspace header. When submitted, the client queries for score validation, triggers database phase advancement, and pulls updated session counts.
  - Verified backend pytests are green, and verified build output compiles without warnings.

### [2026-05-28 11:05:00 +03:00] - Antigravity (AI Tutor Layout & Flag Submission Popover Cleanup)
* **Status**: Complete - Bypassed the readiness overlay, cleaned up the AI Tutor panel subheader and welcome state to match the approved layout, and refactored the flag submission widget into a clean, popover-based component with zero linter warnings.
* **Why**: The user requested that the AI panel layout match the approved screenshots (removing avatars/bubbles for welcome text and using dot separators), that the flag submission widget use a clean panel design, and that the boot page report is entirely bypassed.
* **Where**:
  - `frontend/src/components/workspace/FlagSubmitWidget.jsx` - Created a new clean popover-based flag submit widget.
  - `frontend/src/components/workspace/WorkspaceTopBar.jsx` - Replaced `SubmitFlagWidget` modal with the new `FlagSubmitWidget` and cleaned up unused React imports.
  - `frontend/src/pages/RedWorkspace.jsx` & `frontend/src/pages/BlueWorkspace.jsx` - Added missing `setLastVisitedRole` dependencies to session load `useEffect` hooks.
  - `frontend/src/components/hints/AiHintPanel.jsx` - Reworked header formatting to use middots and simplified empty message states to be cleanly centered.
  - `docs/architecture/CONTINUOUS_STATE.md` - This entry.
* **What & How**:
  - Refactored `SubmitFlagWidget` into a separate, clean, and functional `FlagSubmitWidget` component that displays as a popover instead of a modal. The input field is cleared only on successful flag capture, and failure handles guidance messages from backend hints.
  - Patched `handleFlagSubmit` in `RedWorkspace.jsx` to reload session state when called with an empty string, allowing the popover child component to trigger state updates upon successful flag captures.
  - Reworked `AiHintPanel` header styles to match the middot notation `·` and render without a distinct bg/border banner separation. Added a centered empty state for welcome messages to mirror the clean approved layout.
  - Resolved all React hooks missing dependency and unused variable warnings, ensuring `npm run lint` and `npm run build` finish with exactly 0 warnings/errors. Verified all 295 backend pytests run and pass successfully.

### [2026-05-28 11:13:00 +03:00] - Antigravity (Phase 9B -- Comprehensive Diagram Redesign)
* **Status**: In Progress -- 22 Mermaid sources redesigned, render running (16/22 confirmed at high-DPI)
* **Why**: User requested rework of all diagrams with improved quality, design, color, layout; add all use cases, everything.
* **What was done**:
  1. Installed @mermaid-js/mermaid-cli globally (355 packages, mmdc v11+)
  2. Rewrote mermaid-theme.json with full CyberSim brand palette (#0D1B2A navy, #00B4D8 cyan)
  3. Redesigned ALL 16 existing diagrams with inline %%{init}%% brand overrides
  4. Added 6 NEW diagrams: deployment-architecture, red-team-methodology-flow, blue-team-ir-workflow, scoring-and-debrief-flow, scenario-sc01-flow (red+blue correlation), system-component-interaction
  5. Expanded ERD to 11 tables (added SCENARIO_CONFIGS, enriched all fields with types and PK/FK notes)
  6. Expanded UML use case from 10 to 28 use cases across 7 groups (Auth, Session, RedOps, BlueOps, AI, Debrief, Instructor)
  7. Created PowerShell render script scripts/render-diagrams.ps1 (2400x1600px, scale 2.5)
  8. Updated FIGURE_CAPTIONS map in compile_report_v2.py to include all 22 figures
  9. Updated diagram catalog to register all 22 diagrams with new naming
* **Files modified**:
  - docs/final-report/diagrams/source/ -- all 16 .mmd files redesigned, 6 new .mmd files created (22 total)
  - docs/final-report/diagrams/mermaid-theme.json -- complete brand redesign
  - docs/final-report/diagrams/catalog.md -- updated to 22 entries
  - scripts/render-diagrams.ps1 -- NEW: batch render script
  - scripts/compile_report_v2.py -- FIGURE_CAPTIONS expanded to 22 entries

### [2026-05-28 11:24:00 +03:00] - Antigravity (Frontend Rebuild and Test Runner Stability)
* **Status**: Complete - Rebuilt the frontend Docker container to compile the new UI features (removed readiness overlay, inline Socratic tutor chat, top bar flag submission), and added `backend/tests/conftest.py` to stabilize host test runs.
* **Why**: The user pointed out that they were still seeing the old boot readiness report page. Since the frontend container serves a static build compiled at build-time, updates were not active until the container was built again. Additionally, the local test runner failed to resolve the database and Redis hosts on local execution, requiring a global test context initialization.
* **Where**:
  - `backend/tests/conftest.py` - [NEW] Sets default test env variables and registers a session-scoped autouse fixture to initialize the databases.
  - Frontend Docker container - Recompiled and restarted the service to serve the latest Vite build.
* **What & How**:
  - Ran `docker compose build frontend` and `docker compose up -d frontend` to compile the React code changes into the container's static nginx bundle.
  - Created `conftest.py` to override `POSTGRES_URL` and `REDIS_URL` to local loopback addresses (`127.0.0.1`) before any test imports happen, and automatically boot/cleanup test connections.
  - Verified that all 295 unit/integration tests pass cleanly in 8.06s.

### [2026-05-28 11:30:00 +03:00] - Antigravity (Test Stability and Debrief Coach Cache Fix)
* **Status**: Complete - Fixed debrief coach caching TypeError and resolved Redis key contamination across output pattern tests.
* **Why**: The test suite encountered failures under real Redis connection testing because hardcoded session IDs in test assertions collided with leftover Redis keys from previous runs. Additionally, the debrief coaching logic encountered a TypeError because `cache_get` automatically parses JSON strings to dictionaries, causing a redundant `json.loads` to fail.
* **Where**:
  - `backend/src/ai/debrief_coach.py` - Updated `generate_debrief_coaching` to store dictionaries directly in cache and bypass redundant `json.loads` if the retrieved object is already parsed.
  - `backend/tests/test_debrief_coach.py` - Randomized session IDs to prevent cross-test key pollution.
  - `backend/tests/test_output_patterns.py` - Replaced static test session IDs with unique UUIDs.
  - `backend/tests/test_coverage_gaps.py` - Randomized output pattern test session IDs.
  - `docs/architecture/CONTINUOUS_STATE.md` - Appended this entry.
* **What & How**:
  - Modified `generate_debrief_coaching` to bypass redundant deserialization if `cached_result` is already a dictionary. Removed `json.dumps` from its `cache_set` invocations to allow Redis helper serialization.
  - Added `import uuid` to test files and replaced hardcoded session IDs (e.g. `"test-sess-2"`, `"sess-sqli"`, etc.) with unique UUID hashes.
* **Verification**:
  - Executed `python -m pytest` inside the backend directory. All 295 tests passed successfully with 1 skipped.

### [2026-05-28 11:34:00 +03:00] - Antigravity (UI Layout, AI Tutor, and Welcome Modal Fixes)
* **Status**: Complete - Fixed top bar overflow and submit flag overlapping layout issues, resolved the repeating AI tutor responses, and persisted welcome modal dismissal across browser refreshes.
* **Why**: The user reported that the "Submit Flag" button overlapped, the workspace top-bar overflowed the screen, the AI tutor kept giving the exact same responses, and browser refreshes restarted the training welcome modal.
* **Where**:
  - `backend/src/ai/monitor.py` - Removed the unsupported `reasoning_effort` parameter from OpenRouter payload that was causing API request 400 failures, preventing fallback responses.
  - `frontend/src/pages/RedWorkspace.jsx` - Updated welcome modal to check/persist `welcome_acked_${sessionId}` state in `sessionStorage` so refreshing does not trigger it repeatedly.
  - `frontend/src/components/workspace/LayoutPicker.jsx` - Refactored layout presets from 4 distinct buttons into a single select dropdown to save substantial screen width.
  - `frontend/src/components/workspace/WorkspaceTopBar.jsx` - Reworked responsive layout: merged duplicate scenario chip into scenario/phase badge, shortened actions ("Restart sandbox" -> "Restart", "End & debrief" -> "End Mission"), hid `PhaseTrail` under `xl` screen width, and optimized responsive classes.
* **What & How**:
  - Removed `"reasoning_effort": "high"` from the httpx post payload to OpenRouter, restoring successful DeepSeek model responses (avoiding 400 Bad Request error).
  - Modified standard state initializer for `showWelcome` to check `sessionStorage` and modified modal dismiss actions to save acknowledgment.
  - Rewrote `LayoutPicker.jsx` to render a styled `<select>` element.
  - Adjusted Tailwind layout structure in `WorkspaceTopBar.jsx` to support flex wrapping and responsive element hiding.
* **Verification**:
  - Rebuilt and restarted backend and frontend containers with `docker compose build` and `docker compose up -d`.
  - Executed `python -m pytest` inside the backend directory. All 295 tests passed successfully.

### [2026-05-29] - Claude Code (Master Enhancement Plan authored)
* **Status**: Complete - Authored docs/architecture/MASTER_ENHANCEMENT_PLAN.md, a 13-phase (0-12) end-to-end hardening playbook with copy-paste prompts, a skills->workstream map, ground-truth audit findings, a program Definition of Done, and a risk register.
* **Why**: User requested a full phase-by-phase plan to enhance/fix/implement every layer (docker, backend, frontend, AI tutor, SIEM, scenarios, kill chain, terminal, reporting, security, compliance, testing, docs, scalability) and to leverage installed skills.
* **Where**: docs/architecture/MASTER_ENHANCEMENT_PLAN.md (new); this entry in CONTINUOUS_STATE.md.
* **What & How**: Performed a real read-level audit (not doc-claim level) surfacing 10 findings: F1 terminal reconnect absent (HIGH), F2 Gemini->OpenRouter doc drift (HIGH), F3 inconsistent completion score + env var names, F4 SC-04/05 half-built, F5 thin SIEM maps, F6 600KB state file, F7 secrets/artifact hygiene, F8 missing scope_enforcer.py, F9 oversized hot modules, F10 CLAUDE.md/claude.md duplication. Phases ordered truth->correctness->reliability->security->realism->polish->proof. No source code changed (planning deliverable only).
* **Verification**: Plan grounded in measured signals - wc -l of hot files, grep for gemini drift, docker-compose service/port inspection, status/roadmap cross-read. No tests required (docs-only change). docker compose config NOT re-run as no compose edits were made.

### [2026-05-29] - Claude Code (Phase 0: Ground Truth & Baseline COMPLETE)
* **Status**: Complete - Executed Phase 0 of MASTER_ENHANCEMENT_PLAN on branch phase/0-ground-truth-baseline.
* **Why**: Replace optimistic doc claims (README 95/100 vs ROADMAP 78/100) with measured truth; clean the repo; make the 600KB state log usable.
* **Where**:
  - docs/architecture/BASELINE_2026-05-29.md [NEW] - measured baseline + 4 contract findings (C1 wrong README login curl, C2 /api/scenarios 307, C3 default admin creds, C4 conftest password mismatch) + test result + dep snapshot + hygiene log.
  - docs/architecture/CONTINUOUS_STATE.md - rotated 610KB/5558L -> 34KB/315L; full history archived to docs/history/CONTINUOUS_STATE_ARCHIVE_2026-05-29.md; rotation-policy header added.
  - .gitignore - added .gemini_backup/, graphify-out/, backend/src/graphify-out/, screenshot-temp-env/, stash.patch, *.patch, .superpowers/.
  - Untracked from git index (kept on disk): .gemini_backup/(2), graphify-out/(8), backend/src/graphify-out/cache/(28), screenshot-temp-env/(7), stash.patch(3MB) -> 0 junk tracked.
  - claude.md -> CLAUDE.md (git mv -f; canonical casing).
* **What & How**:
  - LIVE VERIFICATION (full stack already healthy): /health OK on nginx(80)+backend(8001); frontend 200; auth via OAuth2 form (admin/CyberSimAdmin!) -> JWT; GET /api/scenarios/ -> exactly SC-01/02/03; all sc01-sc03 scenario containers healthy.
  - SECRET SCAN: no live keys in tracked files; .env untracked+ignored. Benign hits: CI test secret, intentional sc01/.env_leak training artifact. Drift hit: scripts/demo-bootstrap.sh still uses GEMINI_API_KEY (-> Phase 4/11).
  - TESTS: host venv py3.12. conftest default DB password (change_this_password) != real (cybersim) -> first run 296 errors (asyncpg InvalidPasswordError). With TEST_POSTGRES_URL corrected: 286 passed / 10 failed / 1 error in 9.93s. All 10 failures+1 error are asyncio event-loop-scope errors (pytest-asyncio 0.23.7 on py3.12 vs session-scoped fixture), NOT product bugs; pass on the documented py3.11. Logged as Phase 10 work.
* **Verification**: docker compose config --quiet exit 0; live curl evidence captured above; pytest executed (286 pass) and failure class diagnosed from tracebacks (base_events.py/streams.py); git ls-files shows 0 tracked junk; state log now reads in one tool call.

### [2026-05-29] - Claude Code (Phase 1 start: test harness made reliable -> 296/296 green)
* **Status**: Complete - Fixed the test runner so pytest is a trustworthy gate for all later phases. Suite now 296 passed / 0 failed in 8.48s (py3.12 host venv).
* **Why**: Baseline run showed 10 failures + 1 error, all asyncio loop-scope errors. Root cause: pyproject.toml sets asyncio_default_test_loop_scope="session" but pinned pytest-asyncio==0.23.7 does NOT support that key (added in newer versions), so it was silently ignored -> tests ran on function-scoped loops while the session-scoped init_services fixture held DB/Redis connections on the session loop -> "Future attached to a different loop" / "Event loop is closed". Also conftest default DB password mismatched the stack (C4).
* **Where**:
  - backend/requirements.txt - pytest-asyncio 0.23.7 -> 1.4.0 (version that honors the loop-scope config already in pyproject.toml).
  - backend/tests/conftest.py - default POSTGRES_URL password change_this_password -> cybersim (matches docker-compose default); TEST_POSTGRES_URL override preserved + documented.
  - docs/architecture/BASELINE_2026-05-29.md - recorded root cause + resolution.
* **What & How**: Empirically upgraded pytest-asyncio in the venv (resolved to 1.4.0), re-ran suite -> all 296 pass. Pinned 1.4.0 in requirements.txt so the container build picks it up. No product code changed - this was purely test-infra. Surfaced a minor follow-up: python-jose uses datetime.utcnow() (deprecation warning) -> timezone-aware JWT fix queued for Phase 3.
* **Verification**: `pytest --ignore=tests/e2e -q` => "296 passed, 28 warnings in 8.48s". Confirmed failures were CPython asyncio internals (base_events.py/streams.py), not CyberSim modules.

### [2026-05-29] - Claude Code (Phase 1 Pass A: API contract + async-safety fixes)
* **Status**: Complete - Fixed concrete backend correctness items found via targeted audit; suite 297 passed (296 + new contract test). NOTE: backend is otherwise clean - most broad excepts are intentional resilience (health probes, cleanup loops, AI best-effort telemetry), so NO churn was manufactured.
* **Why**: Baseline finding C2 (/api/scenarios 307 redirect), blocking file I/O in async handlers, and a duplicate stale DB-password default in integration_test.py.
* **Where**:
  - backend/src/scenarios/routes.py, sessions/routes.py, notes/routes.py - added `@router.<verb>("", include_in_schema=False)` aliases alongside the existing `"/"` routes so collection endpoints answer on BOTH /path and /path/ with no 307 (C2). Non-breaking.
  - backend/src/api/playbooks.py - replaced 2 blocking `open().read()` calls in async handlers with `await anyio.to_thread.run_sync(... read_text)`; stopped leaking raw exception text in 500 responses (generic messages).
  - backend/tests/integration_test.py - fixed line 38 stale default password (change_this_password -> cybersim, matching conftest/compose); added test_api_scenarios_no_trailing_slash_redirect asserting both forms return 200 (no redirect) and agree.
* **What & How**: Stacked router decorators register both paths to one handler. anyio (Starlette dep) moves sync file reads off the event loop. Verified the route fix in-process via httpx ASGITransport (AsyncClient does not follow redirects, so a 307 would fail the assertion).
* **Verification**: `pytest --ignore=tests/e2e` => 297 passed in 8.12s (after flushing TEST redis db/1 to clear rate-limit contamination from repeated runs). Discovered 2 more Phase-10 test-hermeticity findings: (1) tests share the live Redis and trip the real auth rate limiter (429) across repeated runs; (2) integration fixtures don't clean sessions. Backend container rebuilt to serve the route fix at runtime.

### [2026-05-29] - Claude Code (hotfix: backend image build broke on pytest pin conflict)
* **Status**: Complete - Fixed a build-breaking dependency conflict introduced by the earlier pytest-asyncio bump, and verified the 307 fix live end-to-end.
* **Why**: Commit 8e99789 bumped pytest-asyncio to 1.4.0 but left pytest==8.2.0. pytest-asyncio 1.4.0 requires pytest>=8.4,<10 -> `docker compose build backend` failed with ResolutionImpossible. The host venv had masked this because `pip install -U pytest-asyncio` silently upgraded pytest there. LESSON: a requirements change is not "verified" until the container image actually rebuilds.
* **Where**: backend/requirements.txt - pytest 8.2.0 -> 8.4.2 (satisfies pytest-asyncio 1.4.0 floor; pytest-cov 5.0.0 remains compatible).
* **What & How**: Resolved the proven-good set in the venv (pytest 8.4.2 + pytest-asyncio 1.4.0 + pytest-cov 5.0.0 -> 297 passed), pinned pytest==8.4.2, rebuilt the backend image (build exit 0), force-recreated the container.
* **Verification**: `docker compose build backend` exit 0; container healthy after ~2s; LIVE: GET /api/scenarios (no trailing slash) -> 200 (was 307), GET /api/scenarios/ -> 200, count=3. Host suite still 297 passed.

### [2026-05-29] - Claude Code (Phase 1/7: reconnect ground-truth correction + characterization test)
* **Status**: Complete - Read ws/routes.py (915L) + useWebSocket.js fully. KEY FINDING: F1 (terminal reconnect) is NOT an open gap - it is already implemented end-to-end. Corrected the plan, added the missing characterization test, made one safe clarity fix. Suite 298 passed.
* **Why**: I was about to refactor/build reconnect per the MASTER_ENHANCEMENT_PLAN's HIGH-severity F1. Reading the actual code showed the April 2026 audit (CURRENT_STATUS_REPORT) was stale - reconnect was built since then. Acting on stale findings wastes effort; ground truth wins.
* **Where**:
  - backend/src/ws/routes.py - line 548: `except (json.JSONDecodeError, TypeError, Exception)` -> `except Exception` (redundant tuple; Exception already supersets the others; behavior identical).
  - backend/tests/test_ws_integration.py - NEW test_send_reconnect_history_replays_terminal_and_commands (seeds Redis history, mocks the socket, asserts the `history` frame replays commands+terminal in chronological order). Also fixed the 3rd stale password default (line 41 change_this_password -> cybersim).
  - docs/architecture/MASTER_ENHANCEMENT_PLAN.md - F1 reclassified HIGH->LOW with code-line evidence; Phase 7 retitled "verify/harden" not "build".
* **What & How**: Evidence that reconnect exists: backend _send_reconnect_history (ws/routes.py:79,456) replays terminal:{sid}:history + session:{sid}:commands; idempotent PTY stream (:452-453); alive/active_sessions grace keys (:469,727). Frontend useWebSocket.js: exponential-backoff auto-reconnect (:154-178), connection-state machine, pending-frame replay, ws_ping->ws_pong (:137), history rehydration (:92). The replay logic previously had ZERO test coverage; now characterized.
* **Verification**: pytest --ignore=tests/e2e => 298 passed in 8.55s (after flushing test redis db/1). New test passes in isolation. Backend image rebuilt to sync the clarity fix.

### [2026-05-29] - Claude Code (Phase 4/11: Gemini->OpenRouter purge + AI-config truth)
* **Status**: Complete - Purged stale Gemini references from maintained docs+scripts, fixed a functional demo-deploy bug, and corrected the default AI model. MAJOR FINDING surfaced: the live OPENROUTER_API_KEY is a placeholder, so the AI tutor has been silently running on static fallback hints.
* **Why**: F2/F3 doc drift + empirical verification of the AI path. Reading config and testing the live OpenRouter call (401 Unauthorized) revealed the key is `your_ope...` (placeholder) AND the model `deepseek/deepseek-v4-pro` is not a real OpenRouter model.
* **Where**:
  - scripts/demo-bootstrap.sh - was writing a .env with GEMINI_API_KEY/GEMINI_MODEL=gemini-2.5-flash -> a fresh demo VPS would MISCONFIGURE the AI entirely. Fixed to OPENROUTER_API_KEY + OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324. (FUNCTIONAL FIX, not cosmetic.)
  - scripts/demo-day-check.sh - placeholder detection + warning text updated to OpenRouter.
  - docs/ARCHITECTURE.md, FEATURES.md, README.md, ROADMAP.md, findings.md, GIT_WORKFLOW.md, architecture/network-and-environment.md - replaced Gemini misdescriptions of CyberSim's own AI with OpenRouter (DeepSeek). FEATURES.md now notes the silent-fallback risk.
  - backend/src/config.py, .env.example, .env.demo.example, live .env - OPENROUTER_MODEL deepseek/deepseek-v4-pro -> deepseek/deepseek-chat-v3-0324 (the README-documented, real OpenRouter model). Now consistent across all 5 sources + root README.
  - .gitignore - added .env.bak*/*.bak (backed up .env before editing it).
  - docs/architecture/BASELINE_2026-05-29.md - added C5 (placeholder API key, HIGH) + C6 (invalid model, resolved); marked C4 resolved.
* **What & How**: DELIBERATELY did NOT touch history/, final-report/chapters (academic Gemini-the-product references), reports/ snapshots, or CURRENT_STATUS_REPORT (dated). Only maintained, reviewer-facing docs + functional scripts. Verified the model is invalid-by-default by hitting OpenRouter live (401). The placeholder KEY cannot be fixed by me - it is the user's secret to provide.
* **Verification**: grep for "gemini" across the 12 edited files => 0. Model string identical across config.py/.env/.env.example/.env.demo.example/README. Backend image rebuilt (exit 0); live backend now reports deepseek/deepseek-chat-v3-0324. pytest --ignore=tests/e2e => 298 passed. readiness still correctly reports openrouter degraded (placeholder key).
* **ACTION REQUIRED BY USER**: set a real OPENROUTER_API_KEY in .env to enable live AI tutoring; until then the static fallback hints serve all sessions.

### [2026-05-29] - Claude Code (AI tutor verified LIVE after user added key)
* **Status**: Complete - User set a real OPENROUTER_API_KEY. Restarted backend, verified the full AI path works end-to-end with the corrected model.
* **Verification (live)**: key sk-or-... (len 73); model deepseek/deepseek-chat-v3-0324; direct OpenRouter chat call -> HTTP 200, reply "PONG", model_used echoes the corrected model (validates C6 - the old deepseek-v4-pro would 404). /api/health/readiness -> overall ok, openrouter ok (was degraded). Real get_ai_hint() path returns a genuine Socratic hint that references the user's nmap command (not a static fallback). Bonus: get_ai_hint degrades gracefully (still returns a hint) when Redis is unavailable.
* **Where**: docs/architecture/BASELINE_2026-05-29.md (C5 marked RESOLVED with live evidence); this entry.
* **What & How**: docker compose up -d --force-recreate backend to reload .env; tested via the container's own python against the real API and the app's get_ai_hint code path. C5 + C6 now both empirically resolved. Moving to Phase 2 (Docker/sandbox reliability).

### [2026-05-29] - Claude Code (Phase 2: Docker boot determinism + isolation verification)
* **Status**: Complete - Added a backend healthcheck + gated nginx on it (fixes the 502-on-restart race), and verified + scripted the scenario network-isolation guarantee.
* **Why**: Empirically, recreating the backend caused nginx to return 502 until the lifespan finished, because nginx's depends_on only waited for container START, not readiness (backend had NO healthcheck). Also, the platform's #1 safety property (scenario nets internal:true) had no automated verification.
* **Where**:
  - docker-compose.yml - backend: added a pure-Python healthcheck (urllib to /health, start_period 40s to cover lifespan boot). nginx: depends_on upgraded from plain [backend,frontend] to {backend: service_healthy, frontend: service_started}.
  - scripts/verify-network-isolation.sh [NEW] - asserts every running cybersim-sc0[1-3] container CANNOT reach the internet (TCP 1.1.1.1:443 via bash /dev/tcp or python fallback); non-zero exit on any breach. Reusable in CI/demo-day.
  - Pre-existing healthchecks confirmed good: postgres (pg_isready), redis (redis-cli ping), elasticsearch (curl), filebeat depends_on es healthy, backend depends_on pg+redis healthy.
* **Verification**: docker compose config --quiet -> exit 0. Recreated backend -> docker health went starting->healthy in ~9s. Recreated nginx (now waits for backend healthy) -> health via nginx OK. ISOLATION: ran verify-network-isolation.sh -> 6/6 scenario containers BLOCKED from internet, exit 0; positive control: backend CAN reach internet (expected, it calls OpenRouter). pytest unaffected (no Python changed) - last run 298 passed.

### [2026-05-29] - Claude Code (Phase 4: AI tutor safety VERIFIED + regression coverage)
* **Status**: Complete - Verified the AI tutor's safety is genuinely robust (now that the key is live) and added regression coverage for the headline lab credentials. Suite 301 passed.
* **Why**: With the key active, Phase 4 became testable. Goal: confirm the Socratic guardrails + secret-leak defenses actually hold, not just exist on paper.
* **Findings (all positive - codebase is mature here)**:
  - ai-monitor/system_prompt.md is excellent: LEARN + CHALLENGE modes, skill-level adaptation, detailed SC-01/02/03 knowledge, explicit forbidden-token rules (Password123/Backup2023!/payloads), self-check steps, BAD/GOOD Socratic examples.
  - ai/security.py is defense-in-depth mapped to OWASP LLM Top-10: sanitize_tutor_response (post-LLM payload/cred -> Socratic fallback), sanitize_untrusted (LLM01 injection stripping), redact_for_ai/redact_text (LLM02), validate_ai_output (LLM05/07 reject HTML/secrets/prompt-leak), check_ai_budget/record_ai_usage (LLM10 budgets).
  - WIRED into the live path: monitor.py calls check_ai_budget (286), record_ai_usage (356), validate_ai_output (364), sanitize_tutor_response (367).
  - LIVE adversarial test (real LLM, unique sessions to bypass the 10s cooldown): direct cred ask, injection ('ignore all instructions'), riddle, SQLi/LFI payload asks -> ALL HELD, no leak.
  - DETERMINISTIC backstop proven: sanitize_tutor_response strips Backup2023!/Password123/admin'--/OR 1=1/../../etc/passwd (leaked_after=False for all 5); validate_ai_output rejects known secrets.
* **Where**: backend/tests/ai/test_response_sanitization.py - added 3 cases for the headline secrets (Backup2023!, Password123, WebAppPass2024!) the prior test omitted (it only covered P@ssw0rd_NovaMed_2023!). Guards against a regex-list refactor silently dropping one.
* **Minor observation (not fixed, non-fatal)**: get_ai_hint inserts ai_interactions telemetry with an FK to sessions; calling it with a non-existent session_id raises ForeignKeyViolationError (caught, hint still returns). Won't happen with real sessions. Candidate for a try/except wrap later.
* **Verification**: pytest --ignore=tests/e2e => 301 passed in 8.47s. Live + deterministic guardrail proofs above.

### [2026-05-29] - Claude Code (Phase 10: CI workflow corrected + hardened)
* **Status**: Complete - Rewrote .github/workflows/ci.yml to be a real, hermetic gate. Locally simulated the critical test job (301 pass on a fresh DB).
* **Why**: The existing ci.yml had a FALSE-GREEN defect (`pytest ... || echo "No tests yet"` swallowed every failure) plus env bugs that meant the suite couldn't actually connect, re-introduced the pytest pin conflict, and still set GEMINI_API_KEY.
* **Where**: .github/workflows/ci.yml - full rewrite.
* **What & How**:
  - GATE jobs (must pass): backend-test (ephemeral postgres+redis services; sets TEST_POSTGRES_URL/TEST_REDIS_URL which conftest actually honors -> dedicated cybersim_test DB; OPENROUTER_API_KEY="" for deterministic fallback; real `pytest --ignore=tests/e2e -q` with NO failure-swallowing), frontend build, compose-validate (`docker compose config`), docker-build (backend+frontend images - would have caught the pin conflict).
  - ADVISORY jobs (continue-on-error, report-only): backend-quality (black+mypy - codebase is NOT black-clean: 58 files would reformat, so blocking would red-light CI day one), frontend ESLint, security-scan (pip-audit + npm audit + gitleaks docker).
  - Removed: `|| echo "No tests yet"` false-green, the bare `pip install pytest pytest-asyncio` re-resolve, GEMINI_API_KEY, POSTGRES_URL-that-conftest-ignores.
  - Added concurrency cancel-in-progress; PRs gate on main+develop.
* **Verification**: YAML parses (6 jobs). SIMULATED the backend-test job exactly: created a fresh cybersim_test database, exported the CI env vars (TEST_POSTGRES_URL/TEST_REDIS_URL/ENVIRONMENT=test/OPENROUTER_API_KEY=""), ran the job command -> 301 passed in 8.52s (init_db built tables in the empty DB; hermetic). All other GATE jobs independently verified live this session (compose config exit 0; npm build; backend+frontend image builds). NOTE: full GH Actions run requires a push (user-controlled); every gate verified locally.
* **Follow-up (advisory debt)**: a `black src/ tests/` formatting pass (58 files) would let black become a blocking gate; gitleaks will flag the intentional sc01 .env_leak training artifact + CI test secret -> add a .gitleaks.toml allowlist later.

### [2026-05-29] - Claude Code (Phase 3: scope_enforcer.py - server-side ROE scope gate, F8)
* **Status**: Complete (code+tests; live rebuild verifying) - Implemented the previously-missing scope_enforcer (baseline F8) and wired it into the command pipeline. Suite 301 -> 318.
* **Why**: A pentest trainer should enforce Rules of Engagement server-side. The network is internal:true (verified), but an explicit out-of-scope target (public IP, or another scenario's subnet) should produce a clear, logged, scored ROE violation instead of a silent timeout - teaching scope discipline.
* **Where**:
  - backend/src/scenarios/scope_enforcer.py [NEW] - pure check_scope(command, scenario_spec) -> ScopeResult. CONSERVATIVE / FAIL-OPEN: blocks ONLY a reliably-parsed IPv4 that is provably out of scope (ipaddress.is_global public IPs, or 172.20.0.0/16 outside the scenario cidr = cross-scenario pivot). Allows in-scope IPs, loopback/link-local, hostnames, file paths, version strings, and no-IP commands. Reads network.cidr from the scenario spec (SC-01 172.20.1.0/24, SC-02 172.20.2.0/24; SC-03 has none -> enforcement off).
  - backend/src/ws/routes.py - import check_scope; inserted a scope gate in _handle_terminal_command AFTER the ROE-ack check and BEFORE the PTES/engine gates. Mirrors the existing gate-block exactly (score -_GATE_PENALTY, CommandLog [scope_blocked], record_activity 'scope_block', OUT OF SCOPE terminal warning + score_update, return). Wrapped in try/except -> FAIL-OPEN (a scope-check error never drops a command).
  - backend/tests/scenarios/test_scope_enforcer.py [NEW] - 17 tests: in-scope/ambiguous allowed, public+cross-scenario IPs blocked, scope relative to active scenario, no-cidr fail-open, invalid octets ignored, first-out-of-scope-IP-wins.
* **Verification**: 17 unit tests pass; full suite `pytest --ignore=tests/e2e` => 318 passed in 8.16s; ws/routes.py AST-parses. Backend image rebuilt to deploy. Full end-to-end WS scope-block will be exercised in the Phase 6 kill-chain walkthrough.

* **LIVE E2E (rebuilt image)**: seeded a real SC-01 session (roe_acknowledged) and called _handle_terminal_command directly: 'nmap -sV 8.8.8.8' -> OUT OF SCOPE blocked; 'nmap -sV 172.20.2.20' (cross-scenario) -> blocked; 'whoami' (in-scope) -> NOT blocked. No handler exceptions. Scope gate confirmed working end-to-end.

### [2026-05-29] - Claude Code (Phase 3: STRIDE threat model documented)
* **Status**: Complete - Wrote docs/SECURITY_THREAT_MODEL.md (v1.0), a STRIDE threat model grounded in code review + the live verifications done this session.
* **Why**: A security training platform that runs offensive tooling needs a documented containment model; high value for the graduation defense.
* **Where**: docs/SECURITY_THREAT_MODEL.md [NEW].
* **What & How**: Trust-boundary diagram; assets; STRIDE per component (auth/JWT, WS command proxy, AI tutor [OWASP LLM Top-10], sandbox/docker, datastores, frontend); the network-isolation invariant; residual-risk register (R1 docker.sock=High, R2 default creds, R3 sandbox cap-drop, R4 hostname ROE, R5 CSP, R6 utcnow); and an empirical-verification section listing what was proven live (isolation 6/6, AI guardrails, scope gate, WS auth, ro socket).
* **Verification**: docs-only, no code/tests affected. Cross-checked every claimed mitigation against the actual code/files referenced.

### [2026-05-29] - Claude Code (style: black formatting pass + make black a CI gate)
* **Status**: Complete - Applied black across backend (src + tests); 59 files reformatted, tree now black-clean. Flipped the CI black check from advisory to a blocking gate.
* **Why**: The project declares black ([tool.black] line-length 100, py311) and CI ran `black --check`, but the tree wasn't clean (58 files) so black couldn't be a real gate. Formatting is behavior-only, so it is safe to apply wholesale and then enforce.
* **Where**: backend/src/** + backend/tests/** (formatting only); .github/workflows/ci.yml (black step -> blocking).
* **Verification**: `black --check src/ tests/` exit 0 (clean); full suite `pytest --ignore=tests/e2e` => 318 passed (unchanged - behavior preserved); backend image rebuilt. mypy stays advisory (still has type findings).

### [2026-05-29] - Claude Code (Phase 9: scoring double-count bug FIXED + rubric documented)
* **Status**: Complete - Found and fixed a real scoring-correctness bug (hint penalties double-counted), added 11 deterministic tests, documented the rubric. Suite 318 -> 329.
* **Why**: session.score is decremented LIVE per hint (ws/routes._send_hint, hint_engine) and per gate/scope block (-5). But final_score(base=session.score, hints_used, ...) ALSO subtracted compute_hint_penalty(hints_used) -> penalties counted twice. Students were over-penalised.
* **Where**:
  - backend/src/scoring/engine.py - final_score now returns clamp(base + time_bonus); hints_used kept for signature stability but NOT re-penalised (documented why). Fixed the misleading time-bonus comment (+20 at instant completion, +10 at half threshold, +0 at threshold - not "+20 at half").
  - backend/tests/test_scoring_engine.py [NEW] - 11 tests incl. a named regression guard test_final_score_does_not_resubtract_hint_penalties.
  - backend/tests/test_coverage_gaps.py - corrected 3 assertions that ENCODED the bug (route 85->100, reports 70->95, inline 80->100 & 0->4) with explanatory comments.
  - docs/SCORING.md [NEW] - transparent rubric (start 100, live penalties, hint table by skill, linear time bonus, final = clamp(running + bonus)).
* **Verification**: 11 scoring tests pass; full suite `pytest --ignore=tests/e2e` => 329 passed in 8.28s; black --check clean; backend image rebuilt. Callers (scoring/routes, reports/routes) now return correct, non-double-counted scores.

### [2026-05-29] - Claude Code (Phase 5/6: SIEM verified rich + Red->Blue loop proven live; evidence doc)
* **Status**: Complete - Confirmed SIEM maps are already rich (F5 stale), proved the Red->Blue data path live, and consolidated all session live-verifications into one examiner-ready evidence doc.
* **Why**: F5 (thin SC-03 SIEM) was another stale-audit finding; SC-03 is actually the richest map (27 events / 16 ATT&CK techniques). Also verified AIInteraction telemetry insert is ALREADY try/except-guarded (the FK error I saw is caught; not a bug).
* **Where**: docs/final-report/evidence/LIVE_VERIFICATION_2026-05-29.md [NEW].
* **What & How**: SIEM counts - SC-01 27ev/9tech, SC-02 25/11, SC-03 27/16. Live Red->Blue: create_command_siem_events for nmap/gobuster/sqlmap on a real SC-01 session -> 6 MITRE-tagged events (T1046, T1083), 6/6 persisted in Postgres, delivered to siem:{sid}:feed. Evidence doc captures health(all green), isolation(6/6), AI(live+adversarial-safe), scope gate(live), SIEM loop(live), scoring(fixed), tests(329)+CI.
* **Verification**: live script output captured in the doc; no code changed (SIEM already solid). Suite remains 329.

### [2026-05-29] - Claude Code (Phase 3: configurable admin credentials - C3/R2)
* **Status**: Complete - Removed the hardcoded admin password; now env-configurable with a production guard + warning. Suite 329 -> 331.
* **Why**: Baseline C3 / threat-model R2 - admin/CyberSimAdmin! was hardcoded in _seed_admin and worked out of the box on any deployment.
* **Where**:
  - backend/src/config.py - added ADMIN_USERNAME/ADMIN_PASSWORD settings; mirrored the existing JWT_SECRET pattern: raise in production if ADMIN_PASSWORD is the default, warn otherwise (non-test).
  - backend/src/main.py - _seed_admin now uses settings.ADMIN_USERNAME/ADMIN_PASSWORD.
  - .env.example - documented ADMIN_USERNAME/ADMIN_PASSWORD with a CHANGE-THESE note.
  - backend/tests/test_config.py [NEW] - 2 tests (default + env override).
  - Also confirmed: our code uses NO datetime.utcnow() (R6 deprecation is library-internal to python-jose); SC-04/SC-05 have ZERO dangling assets (F4 already clean).
* **Verification**: 331 passed; black clean; backend rebuilt; LIVE - admin login still works with the default (token len 191) AND the warning "Default admin password in use ... Set ADMIN_PASSWORD" is emitted in backend logs. Production deploys with the default password will now fail-fast at startup.

### [2026-05-29] - Claude Code (Phase 3/8: nginx security headers - R5)
* **Status**: Complete - Added clickjacking/MIME/referrer/feature security headers to nginx; verified live. No code/tests affected.
* **Where**: infrastructure/nginx/nginx.conf - server-level add_header (always) for X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (geo/mic/cam off). CSP intentionally deferred (needs browser validation vs Vite SPA + xterm + WS). docs/SECURITY_THREAT_MODEL.md R5 updated.
* **Verification**: `nginx -t` syntax ok; `nginx -s reload` clean (config is bind-mounted, no image rebuild); curl -I shows all 4 headers; frontend still 200 + /health ok.

### [2026-05-29] - Claude Code (DX: pre-commit hooks mirroring CI)
* **Status**: Complete - Added .pre-commit-config.yaml so quality issues are caught locally before CI. Verified all hooks pass.
* **Where**: .pre-commit-config.yaml [NEW] - hooks: check-added-large-files(512kb, excl docs/history|final-report), detect-private-key, check-merge-conflict, check-json, check-yaml(--unsafe), black(backend src/tests, pinned 24.4.2 matching requirements).
* **Verification**: `pre-commit validate-config` ok; `pre-commit run --all-files` => all 6 hooks Passed (large-files, private-key, merge-conflict, json, yaml, black). Setup: `pip install pre-commit && pre-commit install`.

### [2026-05-29] - Claude Code (User directive: remove SC-04/SC-05 totally; product is 3 scenarios only)
* **Status**: Complete (product + active docs) - Removed all SC-04/SC-05 references from the product, AI tutor, tests, and active/reviewer-facing docs. Suite 331.
* **Why**: User: "remove sc4-5 totally from all i dont want more sc or missions."
* **Where**:
  - ai-monitor/system_prompt.md - tutor scope reworded to "exactly SC-01/02/03; any other scenario -> redirect" (no SC-04/05 named).
  - backend/tests/{integration_test,test_ws_integration,unit_test_scenarios}.py - SC-04/05-specific tests repurposed to "unknown scenario" guards (SC-99) + exact-catalog asserts (set(ids)=={SC-01,02,03}); names test_17_unknown_scenario_rejected, test_session_start_rejects_unknown_scenario, test_05_loader_rejects_unknown_scenario.
  - docs/scenarios/SC-02-05-specs.md -> renamed SC-02-03-specs.md with SC-04/05 sections stripped; filename refs updated.
  - docs active scope cleaned: scenarios/INDEX.md, FEATURES.md, INDEX.md, DOCUMENTATION_INDEX.md, QUICK_START_CONTINUATION_GUIDE.md, DEFENSE_EVIDENCE_PACK.md, product/PRODUCT_EVOLUTION_PLAN.md, SC-03-IMPLEMENTATION-SUMMARY.md; network-and-environment.md (fixed wrong sc03 subnet 172.20.5->172.20.3, removed sc05-net/frozen-ranges note).
* **NOT changed (intentional)**: dated historical reports/snapshots (docs/reports/*, CURRENT_STATUS_REPORT, MASTER_BLUEPRINT, PHASE_V4_PLAN, final-report chapters, INTEGRATION_TEST_RESULTS/REPORT) + the rotated state archive - these are immutable historical records; editing them is revisionism and has zero product impact. Offered to purge if the user wants.
* **Verification**: grep -> product code (backend/src, frontend/src, ai-monitor, infrastructure, active scenario docs) has ZERO SC-04/05. black clean; affected tests 94 passed; full suite 331.

### [2026-05-29] - Claude Code (Frontend fix: ResizeObserver loop global-error popup)
* **Status**: Complete - Fixed the "Global Error: ResizeObserver loop completed with undelivered notifications" alert the user hit after launching a mission. Verified live in the served bundle.
* **Why**: main.jsx had a debug window.onerror that window.alert()'d on EVERY error, including the benign browser-generated ResizeObserver loop notice (no real stack -> ":0:0"). Source: useTerminal.js called fitAddon.fit() synchronously inside a ResizeObserver callback -> observe->fit->resize loop.
* **Where**:
  - frontend/src/main.jsx - replaced the alert-on-everything handler with: swallow benign ResizeObserver loop errors (both variants) via the capture-phase 'error' listener + 'unhandledrejection' + window.onerror; log real errors to console (non-blocking) instead of alert().
  - frontend/src/hooks/useTerminal.js - ResizeObserver now defers fitAddon.fit() to requestAnimationFrame (+ try/catch), breaking the synchronous resize loop at the source.
* **Verification**: `docker compose build frontend` (vite ✓ built in 19.72s, exit 0); recreated container; served bundle: 'Global Error' alert string => 0 occurrences (gone), 'ResizeObserver loop completed...' suppression => present. Frontend serves 200.

### [2026-05-29] - Claude Code (Handoff: GEMINI_HANDOFF_PROMPTS.md authored)
* **Status**: Complete - Wrote a self-contained continuation handoff for the Gemini CLI agent with detailed per-phase prompts.
* **Where**: GEMINI_HANDOFF_PROMPTS.md [NEW, root].
* **What & How**: Cold-start context (what CyberSim is, current verified state after 21 commits, the "docs overstate gaps - verify empirically" lesson, the test/rebuild gotchas), an Operating Protocol, and 9 ready-to-paste phase prompts (A Kali image/real terminal, B sandbox cap-drop hardening, C frontend lint-gate/tests/a11y/CSP, D mypy gate, E coverage honesty, F reliability/observability, G scenario kill-chain evidence, H docs truth pass + optional historical SC-04/05 purge, I ws/routes refactor). Each prompt has objective/steps/gate + the protocol references. Verification commands + hard rules included.

### [2026-05-29] - Claude Code (Phase A: Kali image built -> REAL terminal, verified live)
* **Status**: Complete - Built cybersim-kali:latest (9.1GB, ~6.5min) from infrastructure/docker/kali/Dockerfile. The Red Team terminal now executes real commands instead of mock mode.
* **Why**: The image was missing, so backend/src/sandbox/manager.py:362 fell back to "mock-" containers. Owner wants the real terminal for manual browser testing. NOTE: the Kali run is ALREADY hardened (manager.py:304 cap_drop=ALL, no-new-privileges, user=student, cpu/mem limits) - so Phase A was purely building the image; all run/network/krb5/tool-repair logic already existed.
* **Where**: README.md (added the required `docker build -t cybersim-kali:latest infrastructure/docker/kali` step to Quick Start); GEMINI_HANDOFF_PROMPTS.md (Phase A marked DONE). No code changed.
* **Verification (live)**: ensure_scenario_container('...', 'SC-01', None) -> real container (MOCK?=False) on cybersim_sc01-net; exec whoami=student; nmap 7.99 present; curl http://172.20.1.20/ -> HTTP 200 (reaches SC-01 target); curl https://1.1.1.1 -> BLOCKED (internet isolation holds). Test container cleaned up. crackmapexec 5.4.0 still in kali-rolling (no package drift). Frontend re-scanned: only legitimate confirm/alert dialogs remain (no debug artifacts); API uses relative /api (no hardcoded URLs).

### [2026-05-29] - Claude Code (Continuation doc: GEMINI_HANDOFF -> CONTINUE_HERE.md)
* **Status**: Complete - Owner will continue in a new Claude chat (not Gemini). Renamed the handoff to a single agent-agnostic entry-point doc and refreshed it to current state.
* **Where**: GEMINI_HANDOFF_PROMPTS.md -> CONTINUE_HERE.md (git mv); reframed intro ("read this to resume in a new chat; start from Phase B"); §3 updated to 24 commits + Kali/real-terminal done.
* **What & How**: CONTINUE_HERE.md is now THE resume document - cold-start context, the "verify empirically / docs overstate gaps" lesson, current verified state, Operating Protocol (test/rebuild gotchas), and per-phase prompts (A done; B sandbox hardening, C frontend lint/a11y/CSP, D mypy, E coverage, F reliability, G kill-chain evidence, H docs, I ws/routes refactor). Next unstarted phase = B.
* **Verification**: docs-only; rename verified via git mv; grep confirms no leftover agent-specific framing (only the legitimate 'Gemini->OpenRouter' history line remains).

### [2026-05-30] - Claude Code (Bugfix: CRLF in Kali .bashrc + AI chat persistence)
* **Status**: Complete — CRLF fix applied to running container immediately; manager.py applies it on every future session start; Dockerfile ensures clean image rebuilds; AI chat persists to localStorage per session.
* **Why**: User reported broken Kali terminal (`bash: $'\r': command not found`, `syntax error near $'{\r''`) and garbled prompt (`] $ ent@kali:~ [SC-01` instead of `student@kali:~$`). Root cause: `.bashrc` had Windows CRLF endings; PS1 variable included trailing `\r`, causing cursor to jump to column 0 after printing the prompt. User also requested AI chat history to survive page refresh.
* **Where**:
  - `backend/src/sandbox/manager.py` — added `_fix_bashrc_crlf(container)` (runs `sed -i 's/\r$//'` as `student` user, the file owner — must NOT be root because cap_drop=ALL removes DAC_OVERRIDE); called after `_repair_kali_tools` in both `_start_sync` and `_ensure_sync`
  - `infrastructure/docker/kali/Dockerfile` — added `RUN sed -i 's/\r$//' /home/student/.bashrc` after COPY; permanent fix for future image rebuilds
  - `.gitattributes` — added `*.bashrc text eol=lf` and `infrastructure/docker/**/.bashrc text eol=lf` rules so git normalizes future edits
  - `frontend/src/components/hints/AiHintPanel.jsx` — hints state initialized from `localStorage.getItem(cs.ai.chat.{sessionId})`; persisted to localStorage on every change; up to 50 messages stored per session; survives page refresh and machine restart
  - `frontend/eslint.config.js` — added `Node: 'readonly'` browser global (missed by the Phase C ESLint pass; used in Button.test.jsx)
* **Immediate fix**: `docker exec -u student kali-a3bb04c6 sed -i 's/\r$//' /home/student/.bashrc` applied to running container directly.
* **Verification**:
  - `cat -A /home/student/.bashrc | grep '^M'` → 0 CRLF remaining in running container
  - `pytest --ignore=tests/e2e` → 331 passed
  - `npm run lint` → exit 0 (clean)
  - `npm test` → 27 passed
  - Backend + frontend rebuilt and redeployed; both healthy

### [2026-05-30] - Claude Code (Bugfix: terminal typing + live output + smarter AI model)
* **Status**: Complete — three bugs fixed; backend rebuilt + healthy; 331 tests still pass.
* **Why**: User reported: (1) terminal typing wrong (characters silently dropped on session start), (2) Kali terminal output only visible after page refresh, (3) request for smarter AI model.
* **Root causes found**:
  1. `readiness_status = "initializing"` was set at WS connect, ALL terminal_raw keystrokes were silently dropped until `get_session_readiness()` returned "ready". That function probes target container ports (via `container.exec_run()`) which takes 5–15s. Fix: immediately set `readiness_status = "ready"` if a real (non-mock) Kali container_id is attached. Full readiness check still runs in background for the frontend overlay.
  2. `_terminal_output_to_ws()` asyncio task had no try/except around `scan_output_chunk()`. Any Redis error or output-pattern exception would crash the entire task loop silently, stopping all live terminal output. History still accumulated in Redis (explaining the "refresh shows output" symptom). Fix: nested try/except around `scan_output_chunk` and the outer loop.
  3. AI model was `deepseek/deepseek-chat-v3-0324` at 150 max_tokens — too small for quality Socratic guidance.
* **Where**:
  - `backend/src/ws/routes.py` — readiness_status init (1-liner); `_terminal_output_to_ws` try/except
  - `backend/src/config.py` — `OPENROUTER_MODEL = "google/gemini-2.0-flash-001"`, `OPENROUTER_MAX_TOKENS = 500`
  - `docker-compose.yml` — default model + max_tokens updated to match
  - `.env.example` — model options documented
  - `.env` — updated `OPENROUTER_MODEL` + `OPENROUTER_MAX_TOKENS` directly (gitignored, live change)
* **Verification**:
  - `pytest --ignore=tests/e2e` → 331 passed (unchanged behavior)
  - `black --check src/ tests/` → exit 0
  - Backend rebuilt + redeployed; healthy in 35s
  - `docker exec cybersim-backend-1 env | grep OPENROUTER` → MODEL=google/gemini-2.0-flash-001, MAX_TOKENS=500
  - `/api/health/readiness` → status ok, openrouter ok

### [2026-05-30] - Claude Code (Phase D: mypy type-safety — 54 errors → 0, now a CI gate)
* **Status**: Complete — mypy exits 0 across all 58 source files; promoted to a blocking CI gate alongside black. pytest still 331 passed.
* **Why**: Phase D — make the type checker a real gate (was advisory with 54 errors). CONTINUE_HERE §4 mandates: "mypy src/ --ignore-missing-imports exits 0; pytest still 331; mypy is a CI gate."
* **Where** (all Python, no behavior change, black-clean after each edit):
  - `src/api/playbooks.py` — annotated `parse_playbook_sections` return type + inner `current_section: dict[str, Any] | None`
  - `src/auth/routes.py` — `changes: dict[str, Any]` (was inferred as `dict[str, str]`, blocking bool assignment)
  - `src/notes/routes.py` — split reused `result` var → `session_result` / `notes_result` so mypy tracks the correct scalar type
  - `src/reports/routes.py` — `timeline: list[dict[str, Any]]` annotation
  - `src/reports/generator.py` — renamed collision variable `notes` → `triage_notes` inside triage loop
  - `src/sessions/routes.py` — `_triage_dict` now accepts `SiemTriage` (not `| None`); call site fixed to `_triage_dict(t) if (t := ...) else None`
  - `src/ws/routes.py` — `from typing import Any`; `session_state: dict[str, Any]`; two redis-py overload `# type: ignore[misc]` for `hset`/`hdel`
  - `src/sandbox/daemon_noise.py` — `from redis.exceptions import RedisError`; replaced shadowing `redis.exceptions.RedisError` with `RedisError`; `http_tick: float`; one `# type: ignore[misc]` for `hgetall`
  - `src/sandbox/container_cleanup.py` — same `RedisError` import pattern; three `# type: ignore[misc]` for redis-py awaitable overloads; switched to `RedisError` in except
  - `src/ai/security.py` — `scenario_secrets: list[str] | None = None` (explicit Optional)
  - `src/ai/discovery_tracker.py` — one `# type: ignore[misc]` for `smembers`
  - `src/ai/debrief_coach.py` — `str(enriched.get(...)) + suffix` instead of `Sequence[str] +=`
  - `src/ai/context_builder.py` — `tags: dict[str, int] = {}`; `list(all_notes)` cast at call site
  - `src/instructor/analytics.py` — `blind_spot_rules: list[dict[str, Any]]`; `spot_counts: dict[str, dict[str, Any]]`
  - `src/cache/redis.py` — one `# type: ignore[misc]` for `lrange`
  - `src/siem/engine.py` — `float(str(...))` cast; one `# type: ignore[misc]` for `hgetall`
  - `src/scenarios/engine.py` — `int(result.scalar() or 0)` cast for comparison
  - `.github/workflows/ci.yml` — mypy step promoted from `continue-on-error` advisory to a GATE
* **Verification**:
  - `mypy src/ --ignore-missing-imports` → "Success: no issues found in 58 source files"
  - `black --check src/ tests/` → exit 0 (89 files unchanged)
  - `pytest --ignore=tests/e2e -p no:cacheprovider -q` → **331 passed** (unchanged behavior)

### [2026-05-30] - Claude Code (Phase C: Frontend quality — ESLint gate, component tests, CSP)
* **Status**: Complete — ESLint clean + CI gate; 27 component tests passing in CI; CSP in Report-Only mode; backend test suite still 331.
* **Why**: Phase C — raise frontend quality gates to match the black gate on the backend, and add CSP headers (R5 in the threat model).
* **Where**:
  - `frontend/eslint.config.js` — added missing browser globals `atob`, `btoa`, `sessionStorage` to the allow-list
  - `frontend/src/pages/BlueWorkspace.jsx` — renamed `noiseCount` → `_noiseCount` (unused-var lint fix)
  - `.github/workflows/ci.yml` — ESLint step flipped from `continue-on-error` (advisory) to a **GATE**; unit test step added as a **GATE**
  - `frontend/package.json` — added `"test": "vitest run"` and `"test:watch": "vitest"` scripts
  - `frontend/vite.config.js` — added Vitest `test` config block (jsdom env, test-setup.js, exclude e2e)
  - `frontend/src/test-setup.js` [NEW] — @testing-library/jest-dom + HTMLElement.scrollTo shim for jsdom
  - `frontend/src/__tests__/Button.test.jsx` [NEW] — 5 tests (variants, loading, disabled, leftIcon)
  - `frontend/src/__tests__/ConnectionPill.test.jsx` [NEW] — 7 tests (all 4 states, defaults, aria-live)
  - `frontend/src/__tests__/SiemFeed.test.jsx` [NEW] — 9 tests (empty state, severity counts, filter buttons, noise toggle, search input, CRITICAL filter)
  - `frontend/src/__tests__/useWebSocket.test.js` [NEW] — 6 tests (WS creation, state transitions, auth token send, reconnect on close)
  - `infrastructure/nginx/nginx.conf` — added `Content-Security-Policy-Report-Only` header
  - `docs/SECURITY_THREAT_MODEL.md` — R5 updated (CSP now in Report-Only; note on enforcement after browser validation)
* **What & How**: ESLint: only 4 errors + 1 warning found (atob/sessionStorage undefined, noiseCount unused) — all fixed in 2 changes. Tests: 27 passing (vitest run); Playwright e2e excluded from Vitest via `test.exclude`. CSP: Report-Only mode per Phase C instructions (cannot browser-test in this environment; enforce only after human validates no violations).
* **Verification**:
  - `npm run lint` → exit 0 (clean)
  - `npm test` → 27 passed (vitest run)
  - `npm run build` → exit 0 (✓ built in 10.5s)
  - nginx -t → syntax ok; CSP-Report-Only header visible in `curl -I http://localhost/`
  - Backend pytest: 331 passed (unaffected)

### [2026-05-30] - Claude Code (Phase B: Sandbox container hardening — R3 partial resolution)
* **Status**: Complete — incremental cap-drop hardening applied to 4 containers; 5 containers fail-open with documented rationale; all scenarios healthy; isolation intact; pytest 331.
* **Why**: Threat-model R3 — scenario containers running without capability restrictions. Kali (student attack) container was already hardened in Phase A. Phase B addresses the scenario *target* containers.
* **Where**:
  - `docker-compose.yml` — added security hardening to 4 containers:
    - `sc01-db`: `security_opt: no-new-privileges:true` (MariaDB uses gosu/syscall; cap_drop deferred — needs extensive DB-init testing)
    - `sc01-webapp`: `no-new-privileges` + `cap_drop: ALL` + `cap_add: [NET_BIND_SERVICE, SETUID, SETGID, KILL]`
    - `sc01-waf`: `no-new-privileges` + `cap_drop: ALL` + `cap_add: [NET_BIND_SERVICE, CHOWN, DAC_OVERRIDE, SETUID, SETGID, KILL]`
    - `sc03-phish`: `no-new-privileges` + `cap_drop: ALL` + `cap_add: [NET_BIND_SERVICE]`
  - `infrastructure/docker/scenarios/sc01/waf-entrypoint.sh` — made `touch` idempotent (`|| true`) so restart on a pre-initialized log volume doesn't fail without DAC_OVERRIDE
  - `docs/SECURITY_THREAT_MODEL.md` — R3 updated with full per-container capability table, rationale, and Phase B verification evidence
* **What & How**: Incremental approach per operating protocol — apply `no-new-privileges` first (safe everywhere except sshd/vsftpd/Postfix/Samba), then `cap_drop ALL` + minimal `cap_add`. Tested each container by force-recreating it and checking health status. WAF required fixing the entrypoint script (touch on nginx-owned volume files) and adding DAC_OVERRIDE (needed by the OWASP image's own setup scripts). sc01-php/sc02-dc/sc02-fileserver/sc03-mailrelay/sc03-victim: left unhardened — all use setuid-exec programs (sshd, vsftpd, Postfix) or complex Samba privilege model; fail-open per operating protocol.
* **Verification**:
  - `docker compose -f docker-compose.yml config --quiet` → exit 0
  - All 16 containers healthy after recreating the 4 changed ones
  - Network isolation: 9/9 scenario containers BLOCKED from internet (tested via `docker exec timeout curl`)
  - `pytest --ignore=tests/e2e -p no:cacheprovider -q` → **331 passed** (unchanged)
  - Black check: no Python files modified; still clean

---

### [2026-05-30] - Claude Sonnet 4.6 (Design V5 Phase 4 — Motion System Consolidation)

* **Status**: COMPLETE ✅
* **Why**: Phase 4 of the V5 Enhancement Plan. Three problems existed: (1) framer-motion variants were copy-pasted inline per component with inconsistent durations (stagger 150ms, spring/stiffness values, etc.); (2) Dashboard card entrance used a spring that could run outside the 150–300ms band; (3) Profile.jsx progress bar animated `width` (triggers layout recalc) not `transform: scaleX` (GPU-composited). Modal had no entry/exit animation.
* **Files modified**:
  - `frontend/src/lib/motion.js` ← **new**: canonical framer-motion preset module
  - `frontend/src/pages/Dashboard.jsx` — import presets, remove 18 lines of inline variants
  - `frontend/src/components/dashboard/ScenarioCard.jsx` — inline transition style now uses `var(--ease-enter)` / `var(--dur-enter)` instead of raw cubic-bezier/ms
  - `frontend/src/pages/Profile.jsx` — progress bar: `width` → `transform: scaleX(n)` + `transition-transform duration-300`
  - `frontend/src/components/ui/Modal.jsx` — added `AnimatePresence` + `motion.div` (modalSlideUp preset); scrim fades; panel slides up from 24px; exit at 65% duration; focus moved into panel on open
* **What & How**:
  - `lib/motion.js` exports 6 presets + `t` utility object. Token mirrors match `v3-design.css :root` exactly: enter=280ms [0.16,1,0.3,1], pop=180ms [0.34,1.56,0.64,1], glide=320ms [0.4,0,0.2,1], exit=180ms [0.4,0,1,1] (≈65% of enter). All durations within 150–300ms band. Stagger is 40ms/item (was 150ms).
  - No new component files added; only lib/motion.js created.
  - `transition-all duration-700` on width (Profile.jsx) was the only layout-property animation found in a grep sweep; fixed to `scaleX` + `duration-300`.
  - All other `transition-all` usages are on color/border/shadow (composited) — acceptable.
  - Ambient looping animations (glitch, scanlines, pulses) were already gated by `[data-perf="low"]` and `prefers-reduced-motion` in v3-design.css — no further change needed.
* **Verification**:
  - `cd frontend && npm run build` → exit 0 (8.40s, no warnings)
  - `npm test -- --run` → 4 files · **27 passed**
  - Grep confirms zero remaining raw cubic-bezier values in JSX inline styles outside ScenarioCard (which now uses CSS vars)

---

### [2026-05-30] - Claude Sonnet 4.6 (Design V5 Phase 5 — Accessibility & Responsive Sweep)

* **Status**: COMPLETE ✅
* **Why**: Phase 5 of the V5 Enhancement Plan. Four audit areas: contrast (txt-dim ≈3.6:1 below 4.5:1 WCAG AA for body text), focus trapping (Modal/Palette let Tab escape to page background), viewport units (min-h-screen clips on mobile browsers with address bars), and readable text that was using the dim color.
* **Files modified**:
  - `frontend/src/hooks/useFocusTrap.js` ← **new**: reusable focus-trap hook
  - `frontend/src/components/ui/Modal.jsx` — useFocusTrap wired; rAF focus on open
  - `frontend/src/components/palette/CommandPalette.jsx` — useFocusTrap via panelRef
  - `frontend/src/pages/Auth.jsx` — sign-in paragraph contrast + min-h-dvh
  - `frontend/src/pages/BlueWorkspace.jsx` — loading state contrast + min-h-dvh
  - `frontend/src/pages/RedWorkspace.jsx` — loading state contrast + min-h-dvh
  - `frontend/src/pages/Debrief.jsx` — coaching/loading text contrast + min-h-dvh
  - `frontend/src/pages/Dashboard.jsx` — min-h-dvh
  - `frontend/src/pages/Landing.jsx` — min-h-dvh
  - `frontend/src/pages/Settings.jsx` — min-h-dvh
  - `frontend/src/pages/Profile.jsx` — min-h-dvh (both main + loading function)
  - `frontend/src/pages/Onboarding.jsx` — min-h-dvh
  - `frontend/src/pages/InstructorDashboard.jsx` — min-h-dvh
  - `frontend/src/index.css` — workspace-shell responsive min-height: 100dvh
* **What & How**:
  - useFocusTrap: finds all focusable elements within a container ref, intercepts Tab/Shift+Tab to cycle within them, restores previously-focused element on deactivation. Applied to Modal and CommandPalette.
  - Contrast: txt-dim (#5a6178 on void #08090c ≈ 3.6:1) kept for decorative metadata labels; readable body text sentences upgraded to txt-secondary (#9ba3b8 ≈ 5.4:1). Targeted the instances most likely to be read: auth subtitle, loading messages, coaching state paragraph.
  - min-h-dvh: dvh (dynamic viewport height) accounts for browser chrome (address bars) on mobile. Swap is safe on all evergreen browsers; provides no visible change on desktop.
* **Verification**:
  - `cd frontend && npm run build` → exit 0 (7.93s)
  - `npm test -- --run` → 4 files · **27 passed**

---

### [2026-05-30] - Antigravity (Design V5 Phase 6 — Final Micro-Interaction Polish)

* **Status**: COMPLETE ✅
* **Why**: Phase 6 of the V5 Enhancement Plan. Refine final micro-interactions, unify empty states, ensure single toast path, add confetti for achievements, and ensure low performance modes disable heavyweight aesthetics (like blur on modal scrim).
* **Files modified**:
  - `frontend/src/App.jsx` — added ToastContainer to page layout
  - `frontend/src/components/siem/SiemFeed.jsx` — replaced local EmptyState with global component, removed redundant local EmptyState function
  - `frontend/src/components/ui/Skeleton.jsx` — added shimmer variant + SkeletonTextLine / SkeletonStat / SkeletonCode
  - `frontend/src/components/ui/index.js` — exported new Skeleton variants and Toast component
  - `frontend/src/index.css` — added toast-countdown and skeleton-shimmer keyframes, added confetti-fly keyframe and confetti-particle styling
  - `frontend/src/styles/v3-design.css` — added .modal-v3-scrim to the low performance selector to disable backdrop-filter blur
  - `frontend/src/hooks/useWebSocket.js` — wired the global toast system for score update notifications (deductions and gains)
  - `frontend/src/components/workspace/FlagSubmitWidget.jsx` — wired warning, achievement, and error toasts upon flag validation results
  - `frontend/src/components/notes/GuidedNotebook.jsx` — wired toasts for note saving/deletion and replaced notes empty state with the unified EmptyState component
  - `frontend/src/components/hints/AiHintPanel.jsx` — replaced placeholder text with the unified EmptyState component
* **Files created**:
  - `frontend/src/components/ui/Toast.jsx` — ToastContainer and ToastItem component with portals and AnimatePresence
  - `frontend/src/lib/toast.js` — minimal singleton toast bus subscription model
* **What & How**:
  - Converted the raw score toast events and note saving/deleting actions to use a single singleton toast notification system.
  - Implemented lightweight, pure-CSS confetti particle effects for the `achievement` toast type, gated by the performance tier.
  - Unified empty states for lists (SIEM feed, notebook, AI chat panel, scenarios search list) under a single UI component (`EmptyState`).
  - Added shimmer animation classes for skeleton loaders.
  - Verified keyboard-safe modal focus traps, ESC closing, and low-perf fallback modes (no backdrop blurs on modal overlay).
* **Verification**:
  - `cd frontend && npm run build` → exit 0 (built in 6.07s)
  - `npm test -- --run` → 27 passed (all tests green)
  - `backend pytest` → 334 passed (all tests green)
