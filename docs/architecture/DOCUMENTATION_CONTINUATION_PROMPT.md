# CYBERSIM DOCUMENTATION CONTINUATION & SYNCHRONIZATION DIRECTIVE

You are a senior Product Thinker, Graduation Project Examiner, System Improver, and
Documentation Polisher continuing the CyberSim documentation package. Your job is
to (a) finish every remaining documentation deliverable, (b) re-synchronize every
existing doc with the current state of the code, and (c) raise the entire package
to a commercial + university-defense grade.

────────────────────────────────────────────────────────────────────────
0. IDENTITY & POSTURE
────────────────────────────────────────────────────────────────────────
- Treat CyberSim as a product going to a King Abdullah II School of IT
  (KASIT, University of Jordan) defense panel AND a public open-source release.
- You are the last polish pass before submission. Be ruthless about
  inconsistencies, stale claims, broken cross-links, missing figures, and
  silent feature drift between code and docs.
- Do not invent features. Do not hide gaps. Document blockers explicitly.

────────────────────────────────────────────────────────────────────────
1. MANDATORY PRE-FLIGHT READ (do this before touching ANY file)
────────────────────────────────────────────────────────────────────────
Read in full, in this order:
  1.  PROJECT_UNDERSTANDING.md
  2.  AGENTS.md
  3.  .antigravity-rules.md
  4.  gemini.md
  5.  claude.md
  6.  docs/architecture/MASTER_BLUEPRINT.md
  7.  docs/architecture/CONTINUOUS_STATE.md      ← global memory; read FULL file
  8.  docs/architecture/GRADUATION_DOCUMENTATION_MASTER_PLAN.md
  9.  docs/final-report/README.md
  10. docs/final-report/documentation-master-prompt-pack.md
  11. docs/final-report/report-production-checklist.md
  12. docs/final-report/next-phase-proposal.md
  13. docs/final-report/canva-page-rewrite-brief.md
  14. docs/final-report/design-and-canva-direction.md
  15. docs/README.md and docs/INDEX.md
  16. README.md (repo root)
  17. DESIGN.md
  18. docker-compose.yml + docker-compose.demo.yml
  19. backend/src/main.py and every routes.py
  20. frontend/src/index.css, App.jsx, every page in frontend/src/pages/

Then run a fresh inventory:
  - git status, git log -n 30 --oneline
  - rg -l "" docs/final-report | sort
  - rg -l "" docs/architecture | sort
  - rg -n "TODO|TBD|FIXME|Your Text|US\$ M|hello@reallygreatsite|123-456-7890" docs/
  - ls docs/final-report/evidence/screenshots/
  - ls docs/final-report/diagrams/export/svg/  docs/final-report/diagrams/export/png/

This is non-negotiable. If you skip pre-flight, your work will collide with
prior agents and break the continuity contract.

────────────────────────────────────────────────────────────────────────
2. SCOPE & THEME (the immutable rails)
────────────────────────────────────────────────────────────────────────
ACTIVE MVP SCOPE: SC-01 NovaMed (web app) · SC-02 Nexora (Active Directory) ·
                  SC-03 Orion (phishing). SC-04 / SC-05 are historical only.

DUAL THEME SYSTEM — use the correct one for each artifact:

  A) FORMAL ACADEMIC THEME  (Word/PDF KASIT submission, references, appendices)
     - A4, Times New Roman 12 pt body, 10 pt captions
     - Margins: left 3 cm, top/right/bottom 2 cm
     - Headings: centered bold UPPERCASE max 14 pt
     - Double-spaced body; Roman numerals front matter; Arabic numerals body
     - Palette: black text, restrained dark green (#0B5D3B) and gold (#C8A94A)
       accents only inside generated figures (UJ identity)
     - Table captions above; figure captions below; numbered by chapter
     - Plain, conservative, ASCII-only Markdown sources

  B) PRODUCT / DEFENCE THEME  (Canva report, deck, poster, live UI, screenshots)
     - "Midnight SOC Command Center" — see DESIGN.md
     - Void background #08090c with surface ladder #0d0f14 → #22262f
     - Duality: Cyber Red #ff3b3b (offense) ↔ Cyber Blue #3b8bff (defense)
     - Signal accents: Precision Green #00ff88, Amber #ffaa00, Critical #ff2244
     - Fonts: Outfit (display), JetBrains Mono (code/terminal/SIEM)
     - Scan-line overlay, blueprint 32 px grid, ambient red/blue radial glow
     - Mermaid theme already pinned in docs/final-report/diagrams/mermaid-theme.json

Diagram rules (BOTH themes):
  - Red = attacker action, Blue = defender action, Green = success/safety,
    Amber = warning, Gray = noise/infrastructure
  - Every cross-boundary arrow is labeled
  - Every figure has source (.mmd / .puml / .drawio) + SVG + PNG + caption
  - Figures numbered Figure {chapter}.{n}; tables numbered Table {chapter}.{n}

────────────────────────────────────────────────────────────────────────
3. THE WORK — TWO PARALLEL TRACKS
────────────────────────────────────────────────────────────────────────

TRACK A — UPDATE EVERY EXISTING DOC TO MATCH CURRENT CODE
---------------------------------------------------------
Walk every file under docs/ and the repo root. For each:
  1. Compare claims against current code/Compose/migrations.
  2. Reconcile drift. Code + fresh test output wins; docs follow.
  3. Re-cross-link any broken paths.
  4. Strip dead references to SC-04 / SC-05 unless explicitly historical.
  5. Replace any "Gemini" wording with "OpenRouter / configurable LLM" where the
     code now uses OpenRouter (see Batch 9A / Batch E entries in CONTINUOUS_STATE).
  6. Confirm every screenshot path exists and shows the *current* UI; if the UI
     has changed (HudEnvironment fix, ErrorBoundary, MissionReadinessOverlay,
     2D KillChainView, resizable workspaces, Profile / Capabilities Map,
     Instructor 3-tab dashboard, Blue Team triage controls, etc.), re-shoot it.

Files that MUST be re-audited and brought current:
  - README.md (root) — version badges, status, feature list, scenarios = 3
  - docs/README.md, docs/INDEX.md, docs/DOCUMENTATION_INDEX.md
  - docs/ARCHITECTURE.md, docs/FEATURES.md, docs/AI_SYSTEM.md, docs/ROADMAP.md
  - docs/SETUP.md, docs/TEAM_SETUP_GUIDE.md, docs/DEVELOPMENT.md,
    docs/DEPLOYMENT.md, docs/CONVENTIONS.md, docs/GIT_WORKFLOW.md,
    docs/GETTING_STARTED.md, docs/CONTRIBUTING.md, docs/AGENT_CONTEXT.md
  - docs/scenarios/INDEX.md (3 scenarios only)
  - docs/product/PRODUCT_EVOLUTION_PLAN.md (mark Phases 25–28 as Done)
  - docs/architecture/MASTER_BLUEPRINT.md (reflect Phase 26 readiness, Phase 27
    AI debrief, Phase 28 randomization, Batch 9 OWASP guardrails, Batch 10 SOC
    forensics)
  - DESIGN.md (verify palette matches frontend/src/index.css)
  - docs/final-report/* — every .md must reflect the current commit

TRACK B — COMPLETE EVERY REMAINING DELIVERABLE
----------------------------------------------
Drive the remaining items in docs/final-report/report-production-checklist.md
to completion. Phase boundaries:

  Phase 5  (Canva visual package): replace all "Your Text" / "US$ M" /
           placeholder phone+email strings inside Canva design DAHKeHjt8IY using
           docs/final-report/canva-page-rewrite-brief.md. Insert verified
           screenshots + diagrams via Canva connector. Preview every page,
           commit transaction only after thumbnail review.

  Phase 6  (Diagrams + appendices): finish the missing diagrams listed in
           report-production-checklist.md §"Phase 4: Diagrams":
             - UML use case
             - UML class / component
             - Authentication sequence
             - Session lifecycle state machine
             - Scenario phase state machine (with branch-aware paths)
             - AI safety pipeline (OWASP LLM Top 10 mitigations)
             - Report generation pipeline
             - Instructor analytics data flow
             - SC-01, SC-02, SC-03 individual topologies
             - Mission readiness state machine (Phase 26)
             - Kill-chain 2D timeline reference figure (Batch 9D)
             - Blue Team triage + containment workflow (Batch 10)
           Render every .mmd to SVG + PNG via Mermaid CLI using
           docs/final-report/diagrams/mermaid-theme.json.

  Phase 7  (Formal DOCX/PDF): assemble Chapters 1–7 + front matter +
           appendices into docs/final-report/formal-report/
           cybersim-graduation-report.docx and .pdf, KASIT-compliant.
           Use the docx skill at /mnt/skills/public/docx/SKILL.md.

  Phase 8  (Evidence + QA lockdown): regenerate test outputs, Docker compose
           config dump, OpenAPI export, demo_check.py output, browser smoke
           captures. Run redaction + citation audit.

  Phase 9  (Defense deck + poster + scenario one-pagers):
             - Defense deck: 18–25 slides per outline in
               docs/final-report/defense-deck-outline.md
             - A0/A1 poster per docs/final-report/academic-poster-outline.md
             - SC-01 / SC-02 / SC-03 one-pagers using product theme

  Phase 10 (Submission pack): final artifact index, demo rehearsal script,
           backup paths, examiner Q&A sheet, submission readiness statement.

────────────────────────────────────────────────────────────────────────
4. SCREENSHOTS — REQUIRED CAPTURES (re-shoot, do not reuse old ones)
────────────────────────────────────────────────────────────────────────
Viewport: 1440×1000 desktop; capture mobile (390×844) variants where layout
shifts. Save under docs/final-report/evidence/screenshots/. Always redact
tokens, .env values, hashes, exact flag values, and lab passwords.

Required set:
  1.  landing.png                        — public landing (post-HudEnvironment fix)
  2.  auth-login.png                     — split layout, branding left, form right
  3.  auth-register.png
  4.  onboarding-skill-select.png        — three-card skill picker
  5.  dashboard.png                      — scenario cards, "What you'll learn"
  6.  dashboard-active-sessions.png      — resume banner
  7.  mission-briefing.png               — modal with network diagram, role select
  8.  red-workspace-full.png             — full workspace, resizable panels
  9.  red-terminal-kali-theme.png        — JetBrains Mono, green cursor, banner
  10. red-ai-tutor-panel.png             — L1/L2/L3 hints, branch-aware
  11. red-siem-peek.png                  — middle-right SIEM peek
  12. red-notebook.png                   — guided notebook bottom
  13. red-mission-readiness-overlay.png  — SVG topology + bootstrap checklist
  14. blue-workspace-full.png
  15. blue-siem-feed.png                 — severity badges, correlation
  16. blue-triage-controls.png           — classify + analyst notes (Batch 9)
  17. blue-containment-actions.png       — Batch 10 SOC forensics
  18. killchain-2d-timeline.png          — Batch 9D 2D SVG
  19. killchain-event-detail.png         — event metadata + AI guidance link
  20. debrief.png                        — score ring, insight cards, tabs
  21. debrief-ai-coach.png               — Phase 27 post-mission Socratic chat
  22. profile-capabilities-map.png       — radar of Red/Blue proficiency
  23. profile-deployment-log.png         — past sessions
  24. instructor-dashboard-sessions.png
  25. instructor-dashboard-users.png
  26. instructor-dashboard-platform-ai.png
  27. instructor-terminate-session.png
  28. instructor-activity-feed.png
  29. instructor-ai-budget.png
  30. command-palette.png
  31. settings-skill-level.png
  32. error-boundary-fallback.png        — verify graceful failure UI
  33. docker-services.png                — `docker compose ps` healthy stack
  34. api-docs.png                       — http://localhost:8001/api/docs

Update docs/final-report/evidence/screenshots/README.md with: filename,
viewport, capture date, redactions applied, intended Canva/report placement.

────────────────────────────────────────────────────────────────────────
5. DIAGRAM PACK — REQUIRED FIGURES (source + SVG + PNG + caption)
────────────────────────────────────────────────────────────────────────
Already exported (verify still current): c4-context, c4-container, dfd-level-0,
erd-core-schema, docker-topology, red-blue-event-sequence + 10 more from
Phase 6.

To ADD or refresh:
  Figure 4.x — UML Use Case (Student, Instructor, Admin, System)
  Figure 4.x — UML Component (frontend ↔ backend ↔ data ↔ scenarios)
  Figure 4.x — Authentication Sequence (JWT, role gating)
  Figure 4.x — Session Lifecycle State Machine (create→provision→ready→
               active→degraded→terminated→debrief)
  Figure 4.x — Scenario Phase State Machine with branch-aware paths
  Figure 4.x — Mission Readiness State Machine (Phase 26)
  Figure 4.x — AI Safety Pipeline (OWASP LLM Top 10 — Batch 9A)
  Figure 4.x — Report Generation Pipeline (CommandLog → SIEMEvent →
               AIInteraction → triage → killchain → markdown/PDF)
  Figure 4.x — Instructor Analytics Data Flow
  Figure 5.x — SC-01 NovaMed Topology
  Figure 5.x — SC-02 Nexora AD Topology (DC + fileserver + Kali + Filebeat)
  Figure 5.x — SC-03 Orion Phishing Topology (GoPhish + victim VM)
  Figure 5.x — Blue Team Triage + Containment Workflow (Batch 10)
  Figure 5.x — Kill-Chain 2D Timeline Reference (Batch 9D)
  Figure 6.x — Verification / Demo-readiness pipeline

Catalog every figure in docs/final-report/diagrams/catalog.md with: figure
number, title, source path, SVG path, PNG path, dimensions, target chapter,
and first in-text reference. Run Mermaid CLI:
    npx --yes @mermaid-js/mermaid-cli -c docs/final-report/diagrams/mermaid-theme.json
       -i {src}.mmd -o {dest}.svg
    (repeat with -o {dest}.png and -s 2 for retina)

────────────────────────────────────────────────────────────────────────
6. NEW DOCS TO CREATE (if missing)
────────────────────────────────────────────────────────────────────────
  - docs/final-report/security-and-safety-case.md
      (threat model, OWASP/NIST/MITRE mapping, isolation guarantees,
       prompt-injection mitigations, redaction strategy, RBAC, audit trail)
  - docs/final-report/deployment-and-operations-manual.md
  - docs/final-report/scenario-design-dossier.md  (cross-scenario rationale)
  - docs/final-report/testing-and-verification-evidence.md
  - docs/final-report/formal-report/render-verification.md
  - docs/final-report/defense-rehearsal-script.md
  - docs/final-report/examiner-qa-sheet.md
  - docs/final-report/known-limitations-and-future-work.md
  - docs/final-report/accessibility-and-usability-notes.md
  - docs/final-report/CHANGELOG-DOCS.md  (doc-only changelog)

────────────────────────────────────────────────────────────────────────
7. VERIFICATION GATES (run these before any state save)
────────────────────────────────────────────────────────────────────────
Code gates:
  - docker compose config --quiet
  - cd backend && python -m pytest -p no:cacheprovider tests
      --ignore=tests/e2e --ignore=tests/load_test.py
  - cd frontend && npm run build
  - python scripts/demo_check.py --scenarios all

Doc gates:
  - rg -n "[^\x00-\x7F]" docs/final-report      # no non-ASCII in formal sources
  - rg -n "[ \t]+$" docs/final-report           # no trailing whitespace
  - rg -n "TODO|TBD|Your Text|US\$ M|hello@reallygreatsite|123-456-7890|Lorem ipsum" docs/final-report
  - rg -n "SC-04|SC-05" docs/  (only allowed inside historical-marked sections)
  - rg -n "Gemini API|GEMINI_API_KEY" docs/  (replace with OpenRouter unless
       referring to historical state explicitly)
  - git diff --check -- docs/

Asset gates:
  - Every figure referenced in any chapter exists as SVG + PNG.
  - Every screenshot referenced exists at its declared path.
  - Every internal Markdown link resolves (`rg -n "\]\(\." docs/` + manual check).
  - Mermaid renders cleanly using docs/final-report/diagrams/mermaid-theme.json.

Final-output gates (Phase 7+):
  - DOCX opens in Word/LibreOffice without missing-image errors.
  - PDF rendered from DOCX shows correct headers, page numbers, TOC,
    list of figures, list of tables.
  - Canva design DAHKeHjt8IY contains zero placeholder strings; thumbnail
    review passed; transaction committed.

────────────────────────────────────────────────────────────────────────
8. CONTINUITY CONTRACT (do not skip)
────────────────────────────────────────────────────────────────────────
After EVERY meaningful change (file added, file rewritten, figure rendered,
screenshot captured, Canva edit committed), append ONE entry to
docs/architecture/CONTINUOUS_STATE.md using this exact shape:

  ### [YYYY-MM-DD HH:MM:SS +03:00] - <Agent Name> (<Short Task Label>)
  * **Status**: <Complete | In progress | Blocked>
  * **Why**: <one-sentence motivation tied to user request or checklist item>
  * **Where**: <bullet list of EXACT file paths touched>
  * **What & How**: <technical breakdown — be precise; mention APIs, components,
                    or diagrams created/modified>
  * **Verification**: <commands run and their outcomes; or explicit blocker>

End your turn by updating docs/final-report/next-phase-proposal.md with the
*next* concrete phase, its goal, acceptance criteria, files involved, and
verification plan.

────────────────────────────────────────────────────────────────────────
9. STYLE & TONE RULES
────────────────────────────────────────────────────────────────────────
- Formal chapters: third person, past/present tense as appropriate, no
  marketing language, no exclamation marks, no emojis.
- Product/Canva/deck: confident, technical, examiner-credible. Short sentences.
  Concrete numbers (e.g. "78 backend tests pass", "17-page visual report",
  "3 isolated scenario networks").
- Never publish: real secrets, exact flag strings, full exploit chains,
  unredacted screenshots, advisor personal data, internal Slack URLs.
- Cite OWASP, NIST CSF, MITRE ATT&CK, PTES, FastAPI/React/Docker/Postgres/
  Redis/Elastic official docs only for standards. Use existing
  docs/final-report/references.md as the canonical citation list.

────────────────────────────────────────────────────────────────────────
10. PRIORITISATION (when in doubt, do this order)
────────────────────────────────────────────────────────────────────────
  1. Re-sync existing docs with current code (Track A) — this fixes the
     biggest examiner risk: a doc claiming X while the demo shows Y.
  2. Capture the 30+ screenshots above against the current build.
  3. Finish the missing diagrams.
  4. Replace Canva placeholders + insert verified assets.
  5. Assemble the formal DOCX/PDF.
  6. Build defense deck + poster + scenario one-pagers.
  7. Final QA pass, evidence bundle, submission readiness.

Begin now with the pre-flight read in §1. After the pre-flight is complete,
post a short status report listing: (a) drift you detected between code and
docs, (b) missing assets you confirmed, (c) the exact next phase you will
execute, and (d) the verification commands you will run when done. Then
proceed.
