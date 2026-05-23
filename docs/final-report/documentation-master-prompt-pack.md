# CyberSim Documentation Master Prompt Pack

Status date: 2026-05-23

This file is the maximum-detail handoff pack for the remaining CyberSim graduation documentation work. It gives future Codex, Claude Code, Gemini, Antigravity, Canva, Browser, Documents, Presentations, and local CLI sessions enough context to continue without guessing.

Use this file as a prompt source. Copy one phase prompt at a time into a fresh agent session, then verify the phase before moving on.

## 1. Operating Rules for Every Documentation Agent

Every documentation agent must obey these rules:

1. Read the mandatory alignment sources before editing:
   - `PROJECT_UNDERSTANDING.md`
   - `.antigravity-rules.md`
   - `gemini.md`
   - `docs/architecture/MASTER_BLUEPRINT.md`
   - `docs/architecture/CONTINUOUS_STATE.md`
2. Treat `docs/architecture/CONTINUOUS_STATE.md` as the global memory. Append a complete state entry after every edit, creation, planning output, significant finding, or verification result.
3. Keep the MVP scope to SC-01, SC-02, and SC-03 only.
4. Never publish real secrets, API keys, bearer tokens, hashes, full lab solution chains, or unsafe payload material.
5. Use local project evidence before broad claims.
6. Use official references for standards and frameworks.
7. Keep formal-report Markdown ASCII-only unless a specific target format requires otherwise.
8. Run verification before claiming completion.
9. Always end a phase with the next proposed phase.
10. Leave unrelated working-tree changes untouched.

## 2. Current Documentation Status

The final-report workspace is in `docs/final-report/`.

Completed or drafted:

| Area | Status |
| --- | --- |
| Final-report workspace | Created and active |
| Canva candidate | Selected: design id `DAHKeHjt8IY`, 17 A4 pages |
| Chapter 1 Introduction | Drafted |
| Chapter 2 Related Existing Systems | Drafted but should be citation-polished |
| Chapter 3 Requirements Engineering and Analysis | Drafted |
| Chapter 4 System Design | Drafted with six rendered diagrams |
| Chapter 5 Implementation | Drafted |
| Chapter 6 Testing, Installation, and Operations | Drafted |
| Chapter 7 Conclusions and Future Work | Drafted but should be scope-polished for SC-01 through SC-03 |
| API reference | Started |
| Database reference | Started |
| Requirements traceability matrix | Started |
| Technical architecture atlas | Started |
| Scenario dossiers | Drafted and report-safe |
| Student manual | Drafted |
| Instructor manual | Drafted |
| Maintainer operations manual | Drafted |
| Evidence bundle | Started |
| Screenshot inventory | Planned, not captured |
| Diagram batch 1 | Rendered: 6 SVG and 6 PNG exports |
| Canva visual report | Candidate selected; generic text still needs replacement |
| Defense deck | Planned |
| Academic poster | Planned |
| Scenario one-pagers | Planned |
| Formal DOCX/PDF | Planned |

Known active documentation files:

- `docs/final-report/README.md`
- `docs/final-report/report-production-checklist.md`
- `docs/final-report/next-phase-proposal.md`
- `docs/final-report/design-and-canva-direction.md`
- `docs/final-report/canva-page-rewrite-brief.md`
- `docs/final-report/tooling-and-skill-usage.md`
- `docs/final-report/technical-architecture-atlas.md`
- `docs/final-report/api-reference.md`
- `docs/final-report/database-reference.md`
- `docs/final-report/requirements-traceability-matrix.md`
- `docs/final-report/references.md`
- `docs/final-report/chapters/`
- `docs/final-report/diagrams/`
- `docs/final-report/evidence/`
- `docs/final-report/scenarios/`
- `docs/final-report/user-manuals/`

Recent verification:

- `docker compose config --quiet` passed.
- `git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md` passed.
- `rg -n "[^\\x00-\\x7F]" docs/final-report` found no non-ASCII.
- `rg -n "[ \\t]+$" docs/final-report` found no trailing whitespace.
- Final-report workspace had 47 files after Documentation Phase 4.

Current working-tree caution:

- There are existing frontend dependency changes in `frontend/package.json` and `frontend/package-lock.json`.
- Do not revert or overwrite unrelated frontend work.
- Documentation phases should usually touch only `docs/final-report/**`, `docs/architecture/CONTINUOUS_STATE.md`, and possibly final export artifacts.

## 3. Tool Strategy

Use tools deliberately. Do not use a tool just to say it was used.

| Tool or capability | Use it for | Do not use it for |
| --- | --- | --- |
| Local shell with `rg` | Source inventory, status checks, text QA, command evidence | Writing files through shell redirection |
| `apply_patch` | Manual Markdown edits and small structured updates | Bulk generated binaries |
| Browser plugin | Local screenshots, browser smoke checks, viewport verification | Replacing CLI checks |
| Canva connector | Editing the selected Canva visual report, inspecting page text, replacing placeholders, previews | Formal report DOCX/PDF |
| Documents plugin | Creating and verifying DOCX/PDF report artifacts | Short Markdown-only edits |
| Presentations plugin | Creating PPTX defense deck and speaker notes | Canva report page editing |
| Spreadsheets plugin | Traceability matrix workbook, QA checklist workbook, grading matrix | Narrative chapter prose |
| Node REPL MCP | Playwright automation, image dimension checks, small asset scripts | Primary source code edits |
| Mermaid CLI | Formal architecture diagrams and SVG/PNG exports | Screenshots of UI |
| Repomix | Fresh source inventory before final claims | Full repo dumps in final report |
| GitHub connector | PR/CI review, issue references, publishing workflow | Local-only doc editing without GitHub need |
| Academic paper/reviewer skills | Chapter structure, citations, claim support, review rubrics | Unsafe source generation |
| Canvas-design/color-expert skills | Visual identity, poster/deck composition, palette consistency | Changing formal handbook rules |
| Humanizer/beautiful-prose skills | Final prose pass and removal of stiff wording | Rewriting technical facts loosely |
| Verification-before-completion skill | Final gate before phase closeout | Replacing actual commands |
| Image generation | Optional non-sensitive background art or abstract visual elements | Architecture diagrams, screenshots, or evidence |

## 4. Master Context Prompt

Use this prompt at the start of any future documentation session.

```text
You are continuing the CyberSim graduation documentation package in the repository:
C:\Users\Mahmo\OneDrive\Documents\Mahmoud\Graduation Project\JUTerminal1

CyberSim is a dual-perspective cybersecurity training platform for university students. It uses a React/Vite frontend, FastAPI backend, PostgreSQL, Redis, Elasticsearch/Filebeat, Nginx/Caddy routing, and Docker-isolated scenario networks. The active MVP scope is exactly three scenarios:
- SC-01 NovaMed Healthcare: web application security and WAF/SIEM analysis.
- SC-02 Nexora Financial: directory-service compromise concepts and authentication telemetry.
- SC-03 Orion Logistics: phishing simulation, endpoint markers, and SOC response.

Before editing, read:
- PROJECT_UNDERSTANDING.md
- .antigravity-rules.md
- gemini.md
- docs/architecture/MASTER_BLUEPRINT.md
- docs/architecture/CONTINUOUS_STATE.md

Documentation source is under docs/final-report/. The formal report must stay handbook-compliant and conservative. Canva, poster, and deck assets may use the richer CyberSim visual style. Never publish secrets, exact solution chains, lab-only passwords, hashes, full payloads, or unsafe instructions. Use local evidence first. Use official sources only for standards and external technology references.

Required behavior:
1. Inspect current docs/final-report status and git status.
2. Work only on the requested documentation phase.
3. Use the relevant tools: local CLI, Browser, Canva, Documents, Presentations, Spreadsheets, Repomix, Mermaid CLI, Node REPL, and skills where they add real value.
4. Verify with exact commands before claiming completion.
5. Append a complete CONTINUOUS_STATE.md entry with status, why, where, what/how, and verification.
6. End by updating docs/final-report/next-phase-proposal.md with the next phase.
```

## 5. Phase Roadmap

The remaining documentation work should be completed in these phases:

| Phase | Name | Primary output |
| --- | --- | --- |
| 5 | Screenshots, Canva Replacement, and Defense Visuals | Current UI screenshots, Canva text replacement, visual asset placement plan |
| 6 | Diagram Expansion and Technical Appendices | UML/state/pipeline/scenario diagrams plus finalized API/database/security appendices |
| 7 | Formal DOCX/PDF Assembly | KASIT-compliant Word/PDF report with front matter, figures, tables, references, appendices |
| 8 | Evidence Bundle and QA Lockdown | Test outputs, screenshots, source evidence, redaction audit, citation audit |
| 9 | Defense Deck, Poster, and Scenario One-Pagers | PPTX/Canva deck, poster, SC-01/SC-02/SC-03 one-pagers |
| 10 | Final Submission Pack and Rehearsal | Final artifact index, rehearsal script, demo checklist, submission readiness |

## 6. Phase 5 Prompt: Screenshots, Canva Replacement, and Defense Visuals

Copy-paste prompt:

```text
PHASE 5: Screenshots, Canva Replacement, and Defense Visuals

Goal:
Capture current CyberSim UI evidence, replace generic Canva report text with verified CyberSim content, and prepare the visual companion assets for the defense package.

Context:
The selected Canva design is `DAHKeHjt8IY`, 17 A4 pages. The rewrite source is docs/final-report/canva-page-rewrite-brief.md. Current diagram exports are under docs/final-report/diagrams/export/. Screenshot requirements are listed in docs/final-report/evidence/screenshots/README.md.

Mandatory pre-flight:
Read PROJECT_UNDERSTANDING.md, .antigravity-rules.md, gemini.md, docs/architecture/MASTER_BLUEPRINT.md, docs/architecture/CONTINUOUS_STATE.md, docs/final-report/README.md, docs/final-report/design-and-canva-direction.md, docs/final-report/canva-page-rewrite-brief.md, and docs/final-report/evidence/screenshots/README.md.

Tool plan:
1. Use local CLI to inspect git status and running stack status.
2. Use `docker compose config --quiet`.
3. If the stack is running, use Browser or Playwright through Node REPL to capture screenshots at consistent viewports.
4. Use Canva connector:
   - Start an editing transaction for design `DAHKeHjt8IY`.
   - Inspect page richtexts and placeholders.
   - Use bulk `find_and_replace_text` or `replace_text` operations to replace generic text.
   - Insert or replace diagram/screenshot fills only after asset IDs are available.
   - Preview every edited page thumbnail.
   - Commit the transaction only after edits are complete.
5. Use canvas-design/color-expert guidance for visual consistency.
6. Use verification-before-completion before closing.

Files to modify:
- docs/final-report/evidence/screenshots/README.md
- docs/final-report/design-and-canva-direction.md
- docs/final-report/canva-page-rewrite-brief.md
- docs/final-report/report-production-checklist.md
- docs/final-report/next-phase-proposal.md
- docs/architecture/CONTINUOUS_STATE.md

Files to create if needed:
- docs/final-report/defense-deck-outline.md
- docs/final-report/academic-poster-outline.md
- docs/final-report/evidence/test-output/documentation-phase-05-verification.md
- docs/final-report/evidence/screenshots/*.png

Screenshot target list:
- Landing page: landing-page.png
- Auth page: auth-page.png
- Scenario dashboard: dashboard-scenarios.png
- Red Team workspace: red-workspace-terminal.png
- Blue Team workspace: blue-workspace-siem.png
- AI Tutor panel: ai-tutor-panel.png
- Debrief timeline: debrief-killchain.png
- Instructor dashboard: instructor-dashboard.png
- Docker services evidence: docker-services.png
- API docs: api-docs.png

Canva page replacement objectives:
1. Cover: CyberSim graduation project report, UJ/KASIT, team/supervisor/date placeholders.
2. Training gap: show offense/defense silo problem.
3. Proposed solution: browser dual workspace and Docker isolation.
4. Architecture: C4 container diagram.
5. Red Team workspace: screenshot and callouts.
6. Blue Team workspace: screenshot and callouts.
7. SC-01 NovaMed: learning objective, services, telemetry.
8. SC-02 Nexora: directory-service scenario, detections.
9. SC-03 Orion: phishing simulation and SOC analysis.
10. Socratic AI: bounded context, redaction, fallback hints.
11. Data and reports: ERD and debrief data.
12. Docker isolation: internal networks and safety boundary.
13. Instructor analytics: dashboard screenshot and grading evidence.
14. Verification evidence: pytest, lint, build, Compose, demo readiness.
15. Security and compliance: OWASP, MITRE, NIST, sandbox controls.
16. Results: verified achievements only.
17. Future work and Q&A.

Acceptance criteria:
- Screenshot README lists captured filenames, viewport, status, and redaction notes.
- Canva design has no generic placeholder business text left in edited pages.
- Visual direction file maps screenshots and diagrams to Canva pages.
- Defense deck and poster outline files exist.
- Continuous state is updated.
- Verification evidence file exists.

Verification commands:
- docker compose config --quiet
- git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
- rg -n "[^\\x00-\\x7F]" docs/final-report
- rg -n "[ \\t]+$" docs/final-report
- If screenshots captured: verify PNGs load with Node or PowerShell image metadata.
- If live stack used: python scripts/demo_check.py or python scripts/demo_check.py --scenarios all if all profiles are active.

End state:
Update docs/final-report/next-phase-proposal.md with Phase 6: Diagram Expansion and Technical Appendices.
```

## 7. Phase 6 Prompt: Diagram Expansion and Technical Appendices

Copy-paste prompt:

```text
PHASE 6: Diagram Expansion and Technical Appendices

Goal:
Finish the missing diagram set and technical appendices so the formal report has a complete architecture, data, API, security, and scenario reference layer.

Inputs:
- docs/final-report/diagrams/catalog.md
- docs/final-report/technical-architecture-atlas.md
- docs/final-report/api-reference.md
- docs/final-report/database-reference.md
- docs/final-report/requirements-traceability-matrix.md
- docs/final-report/scenarios/
- backend/src/main.py
- backend/src/db/database.py
- backend/src/auth/routes.py
- backend/src/sessions/routes.py
- backend/src/ws/routes.py
- backend/src/reports/routes.py
- backend/src/instructor/routes.py
- docs/scenarios/SC-01-webapp-pentest.yaml
- docs/scenarios/SC-02-ad-compromise.yaml
- docs/scenarios/SC-03-phishing.yaml

Tool plan:
1. Use Repomix or targeted `rg` to refresh source inventory for backend routes, DB models, and scenario definitions.
2. Use Mermaid CLI for formal diagrams.
3. Use Node REPL or PowerShell image metadata to verify rendered PNGs.
4. Use academic-paper-reviewer style checking to find unsupported claims.
5. Use color-expert/canvas-design to keep diagrams consistent.

Create diagram source files:
- docs/final-report/diagrams/source/uml-use-case.mmd
- docs/final-report/diagrams/source/auth-sequence.mmd
- docs/final-report/diagrams/source/session-lifecycle-state.mmd
- docs/final-report/diagrams/source/scenario-phase-state-machine.mmd
- docs/final-report/diagrams/source/ai-safety-pipeline.mmd
- docs/final-report/diagrams/source/report-generation-pipeline.mmd
- docs/final-report/diagrams/source/instructor-analytics-flow.mmd
- docs/final-report/diagrams/source/sc01-topology.mmd
- docs/final-report/diagrams/source/sc02-topology.mmd
- docs/final-report/diagrams/source/sc03-topology.mmd

Export:
- docs/final-report/diagrams/export/svg/*.svg
- docs/final-report/diagrams/export/png/*.png

Modify:
- docs/final-report/diagrams/catalog.md
- docs/final-report/technical-architecture-atlas.md
- docs/final-report/api-reference.md
- docs/final-report/database-reference.md
- docs/final-report/requirements-traceability-matrix.md
- docs/final-report/report-production-checklist.md
- docs/final-report/next-phase-proposal.md
- docs/architecture/CONTINUOUS_STATE.md

Appendix goals:
- Finalize API reference with route groups, method, path, auth requirement, request/response purpose, and source file.
- Finalize database reference with table purpose, relationship, persistence policy, and report usage.
- Finalize security and safety case: sandbox isolation, AI safety, secrets handling, scope limitation, evidence redaction.
- Finalize scenario design dossier index with SC-01, SC-02, SC-03 comparison table.

Acceptance criteria:
- At least 10 new diagram sources exist and render to SVG and PNG.
- Diagram catalog lists every figure, source, export, target chapter/appendix, and caption.
- API/database/security appendices are consistent with current source files.
- Requirements matrix maps requirements to implementation files, tests/evidence, and report sections.
- Continuous state is updated.

Verification commands:
- npx --yes @mermaid-js/mermaid-cli --version
- Render every `docs/final-report/diagrams/source/*.mmd`
- Verify all SVG/PNG files exist.
- Verify PNG dimensions/loadability.
- docker compose config --quiet
- git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
- rg -n "[^\\x00-\\x7F]" docs/final-report
- rg -n "[ \\t]+$" docs/final-report

End state:
Update docs/final-report/next-phase-proposal.md with Phase 7: Formal DOCX/PDF Assembly.
```

## 8. Phase 7 Prompt: Formal DOCX/PDF Assembly

Copy-paste prompt:

```text
PHASE 7: Formal DOCX/PDF Assembly

Goal:
Build the official KASIT-compliant formal report as DOCX and PDF from the Markdown source chapters, diagrams, references, and appendices.

Inputs:
- docs/final-report/chapters/
- docs/final-report/references.md
- docs/final-report/diagrams/catalog.md
- docs/final-report/diagrams/export/svg/
- docs/final-report/diagrams/export/png/
- docs/final-report/api-reference.md
- docs/final-report/database-reference.md
- docs/final-report/requirements-traceability-matrix.md
- docs/final-report/scenarios/
- docs/final-report/user-manuals/
- KASIT formatting rules from docs/final-report/README.md

Tool plan:
1. Use Documents plugin for DOCX creation, rendering, and verification.
2. Use local scripts only for deterministic conversion support if needed.
3. Use academic-paper and academic-paper-reviewer skills for chapter structure and examiner-readiness.
4. Use humanizer/beautiful-prose for final readability while preserving technical accuracy.
5. Use official references and local evidence only.

Formal formatting requirements:
- A4 page size.
- Times New Roman.
- 12 pt body text.
- 14 pt centered bold uppercase chapter headings.
- Left margin 3 cm.
- Top, right, bottom margins 2 cm.
- Roman numerals for front matter.
- Arabic numerals for body.
- Table captions above tables.
- Figure captions below figures.
- Consistent reference style.

Create:
- docs/final-report/formal-report/cybersim-graduation-report.docx
- docs/final-report/formal-report/cybersim-graduation-report.pdf
- docs/final-report/formal-report/render-verification.md

Modify:
- docs/final-report/report-production-checklist.md
- docs/final-report/next-phase-proposal.md
- docs/architecture/CONTINUOUS_STATE.md

Required front matter:
- Cover page.
- Title page.
- Abstract.
- Acknowledgments.
- Table of contents.
- List of figures.
- List of tables.
- List of abbreviations.

Required body:
- Chapter 1 Introduction.
- Chapter 2 Related Existing Systems.
- Chapter 3 Requirements Engineering and Analysis.
- Chapter 4 System Design.
- Chapter 5 Implementation.
- Chapter 6 Testing, Installation, and Operations.
- Chapter 7 Conclusions and Future Work.

Required appendices:
- API reference.
- Database reference.
- Requirements traceability matrix.
- Scenario dossiers.
- User manuals.
- Evidence index.

Acceptance criteria:
- DOCX renders without broken images.
- PDF renders from DOCX.
- TOC, list of figures, and list of tables are present.
- Every figure has caption and first in-text reference.
- References are included and consistently formatted.
- No placeholder cover/front-matter labels remain except explicit team/supervisor fields if the user has not supplied names.
- Continuous state is updated.

Verification:
- Open/render DOCX through Documents plugin.
- Export/inspect PDF pages.
- Check image visibility and table layout.
- Run docs QA:
  - git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
  - rg -n "TODO|TBD|Your Text|US\\$ M|hello@reallygreatsite|123-456-7890" docs/final-report
  - rg -n "[ \\t]+$" docs/final-report

End state:
Update docs/final-report/next-phase-proposal.md with Phase 8: Evidence Bundle and QA Lockdown.
```

## 9. Phase 8 Prompt: Evidence Bundle and QA Lockdown

Copy-paste prompt:

```text
PHASE 8: Evidence Bundle and QA Lockdown

Goal:
Create the final evidence bundle and run a rigorous claim, citation, formatting, security, and verification audit before final submission assets are produced.

Inputs:
- docs/final-report/evidence/
- docs/final-report/formal-report/
- docs/final-report/report-production-checklist.md
- backend/tests/
- frontend/
- docker-compose.yml
- scripts/demo_check.py

Tool plan:
1. Use local CLI for all deterministic checks.
2. Use Browser for final visual smoke evidence.
3. Use Repomix for a final compact source inventory snapshot if needed.
4. Use Spreadsheets plugin to create a QA workbook if the matrix becomes large.
5. Use academic-paper-reviewer and balanced skills for review-style critique.
6. Use verification-before-completion before finalizing.

Create:
- docs/final-report/evidence/test-output/git-status.txt
- docs/final-report/evidence/test-output/commit-hash.txt
- docs/final-report/evidence/test-output/docker-compose-config.txt
- docs/final-report/evidence/test-output/backend-pytest.txt
- docs/final-report/evidence/test-output/frontend-lint.txt
- docs/final-report/evidence/test-output/frontend-build.txt
- docs/final-report/evidence/test-output/demo-check.txt
- docs/final-report/evidence/test-output/final-qa-summary.md
- docs/final-report/evidence/redaction-audit.md
- docs/final-report/evidence/citation-audit.md
- docs/final-report/evidence/claim-support-audit.md

Run:
- git status --short
- git rev-parse --short HEAD
- docker compose config --quiet
- cd backend && python -m pytest -q -p no:cacheprovider
- cd frontend && npm run lint
- cd frontend && npm run build
- python scripts/demo_check.py --scenarios all

If a command fails:
- Capture the failure.
- Fix within scope if it is a documentation or environment issue.
- If it is outside documentation scope, document the blocker and do not claim it passed.

Security/redaction audit:
- Search for likely secrets in docs/final-report.
- Search for API keys, bearer tokens, hashes, lab passwords, and exact solution chains.
- Check screenshots manually or with OCR if available.
- Confirm all scenario claims are educational and lab-only.

Acceptance criteria:
- All required evidence files exist.
- Every pass/fail claim in the report maps to evidence.
- No unsupported metrics, fake financial data, or generic Canva placeholders remain.
- Secret/redaction audit passes or documented blockers exist.
- Continuous state is updated.

Verification:
- git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
- rg -n "TODO|TBD|Your Text|US\\$ M|hello@reallygreatsite|reallygreatsite|123-456-7890" docs/final-report
- rg -n "Bearer |OPENROUTER_API_KEY=|JWT_SECRET=|password:|Password123|NexoraAdmin2024|Backup2023" docs/final-report
- rg -n "[ \\t]+$" docs/final-report

End state:
Update docs/final-report/next-phase-proposal.md with Phase 9: Defense Deck, Poster, and Scenario One-Pagers.
```

## 10. Phase 9 Prompt: Defense Deck, Poster, and Scenario One-Pagers

Copy-paste prompt:

```text
PHASE 9: Defense Deck, Poster, and Scenario One-Pagers

Goal:
Produce examiner-facing presentation materials: defense deck, academic poster, and one-page visual summaries for SC-01, SC-02, and SC-03.

Inputs:
- docs/final-report/formal-report/cybersim-graduation-report.pdf
- docs/final-report/design-and-canva-direction.md
- docs/final-report/canva-page-rewrite-brief.md
- docs/final-report/diagrams/export/png/
- docs/final-report/evidence/screenshots/
- docs/final-report/scenarios/
- docs/final-report/evidence/test-output/final-qa-summary.md

Tool plan:
1. Use Presentations plugin for PPTX defense deck with speaker notes.
2. Use Canva for visual companion report, poster, and one-pagers if design assets are already in Canva.
3. Use canvas-design and color-expert for layout and palette.
4. Use humanizer/beautiful-prose to tighten spoken text.
5. Use Browser or rendered previews to inspect final visuals.

Create:
- docs/final-report/defense-deck-outline.md
- docs/final-report/academic-poster-outline.md
- docs/final-report/scenario-one-pagers/sc-01-one-pager.md
- docs/final-report/scenario-one-pagers/sc-02-one-pager.md
- docs/final-report/scenario-one-pagers/sc-03-one-pager.md
- docs/final-report/presentation/cybersim-defense-deck.pptx
- docs/final-report/presentation/speaker-notes.md
- docs/final-report/poster/cybersim-academic-poster.pdf or Canva link record

Deck structure:
1. Title.
2. Problem and motivation.
3. Existing systems gap.
4. CyberSim solution.
5. Architecture.
6. Red Team workspace.
7. Blue Team workspace.
8. Scenario SC-01.
9. Scenario SC-02.
10. Scenario SC-03.
11. AI Tutor and safety.
12. Docker isolation and security.
13. Testing and evidence.
14. Results and contributions.
15. Limitations.
16. Future work.
17. Demo script and Q&A.

Poster structure:
- Title and authors.
- Problem.
- Solution architecture.
- Three scenario cards.
- Red-to-Blue learning loop.
- Safety controls.
- Evidence/testing.
- Contributions.
- QR or repository placeholder if approved.

One-pager structure:
- Scenario story.
- Learning objectives.
- Target topology.
- Red Team tasks, report-safe.
- Blue Team tasks.
- Telemetry and evidence.
- Safety boundary.
- Assessment outputs.

Acceptance criteria:
- Deck outline and speaker notes exist.
- PPTX or Canva deck is created and previewed.
- Poster outline or export exists.
- Three one-pagers exist.
- No unsafe payloads, flags, or lab-only credentials appear.
- Continuous state is updated.

Verification:
- Render/preview all slides.
- Check text fits on slides.
- Check poster export dimensions.
- Run docs QA:
  - git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
  - rg -n "TODO|TBD|Your Text|US\\$ M|hello@reallygreatsite|123-456-7890" docs/final-report
  - rg -n "[^\\x00-\\x7F]" docs/final-report
  - rg -n "[ \\t]+$" docs/final-report

End state:
Update docs/final-report/next-phase-proposal.md with Phase 10: Final Submission Pack and Rehearsal.
```

## 11. Phase 10 Prompt: Final Submission Pack and Rehearsal

Copy-paste prompt:

```text
PHASE 10: Final Submission Pack and Rehearsal

Goal:
Assemble the final submission package and create a rehearsal-ready defense runbook.

Inputs:
- docs/final-report/formal-report/
- docs/final-report/presentation/
- docs/final-report/poster/
- docs/final-report/evidence/
- docs/final-report/report-production-checklist.md
- README.md
- scripts/demo_check.py

Tool plan:
1. Use local CLI for final file inventory and checksums if desired.
2. Use Documents plugin to inspect final PDF.
3. Use Presentations plugin to inspect final deck.
4. Use Browser to rehearse the live app path.
5. Use Canva connector to verify final Canva links if visual report/poster/deck live there.
6. Use GitHub connector only if publishing a PR/release is requested.

Create:
- docs/final-report/final-submission-index.md
- docs/final-report/demo-rehearsal-script.md
- docs/final-report/final-defense-checklist.md
- docs/final-report/evidence/final-artifact-inventory.md
- docs/final-report/evidence/final-risk-register.md
- docs/final-report/evidence/final-readiness-signoff.md

Final submission index must list:
- Formal report DOCX.
- Formal report PDF.
- Canva visual report link.
- Defense deck.
- Academic poster.
- Scenario one-pagers.
- Evidence bundle.
- Source repository commit hash.
- Demo readiness output.
- Known limitations.

Rehearsal script must include:
- 2 minute project introduction.
- 3 minute architecture walkthrough.
- 5 minute live demo path.
- 3 minute testing/evidence explanation.
- 2 minute limitations/future work.
- Backup path if Docker, AI provider, or browser terminal fails.

Acceptance criteria:
- Final artifact inventory exists.
- Every deliverable has a path or link.
- Demo script is executable by a human presenter.
- Final checklist is complete or has explicit remaining blockers.
- Continuous state is updated.

Verification:
- docker compose config --quiet
- python scripts/demo_check.py --scenarios all
- git diff --check -- docs/final-report docs/architecture/CONTINUOUS_STATE.md
- rg -n "TODO|TBD|Your Text|US\\$ M|hello@reallygreatsite|123-456-7890" docs/final-report
- Confirm final PDF opens.
- Confirm final deck opens.
- Confirm screenshots and diagrams render.

End state:
Update docs/final-report/next-phase-proposal.md with "Documentation Complete - Defense Rehearsal and Submission Only" unless new blockers are found.
```

## 12. Specialized Utility Prompts

### 12.1 Browser Screenshot Prompt

```text
Use the Browser plugin or Playwright through Node REPL to capture current CyberSim UI screenshots.

Targets:
- http://localhost:3000
- http://localhost:3000/auth
- http://localhost:3000/dashboard
- Red Workspace for one available session.
- Blue Workspace for one available session.
- Debrief page.
- Instructor Dashboard.
- http://localhost:8001/api/docs

Rules:
- Use a consistent desktop viewport, preferably 1440x1000.
- Capture PNG.
- Redact tokens, private emails, lab passwords, hashes, and exact solution chains.
- Save screenshots under docs/final-report/evidence/screenshots/.
- Update docs/final-report/evidence/screenshots/README.md with status, viewport, file path, and report/Canva usage.
- If login/session setup blocks capture, document the blocker and capture public/API pages that are available.
```

### 12.2 Canva Editing Prompt

```text
Use the Canva connector to edit design `DAHKeHjt8IY`.

Process:
1. Start editing transaction.
2. Inspect richtexts and page list.
3. Map each page to docs/final-report/canva-page-rewrite-brief.md.
4. Replace generic text with CyberSim text using bulk operations.
5. Use find-and-replace for small repeated placeholder strings.
6. Use replace_text for full non-responsive text blocks.
7. If inserting media, use verified diagrams and screenshots only.
8. Preview every edited page thumbnail.
9. Commit the transaction after previews are correct.

Do not:
- Leave `Your Text`, `US$ M`, fake target numbers, fake email, fake phone, or unrelated business language.
- Invent metrics.
- Insert screenshots with secrets.
- Commit before previewing.
```

### 12.3 Mermaid Diagram Prompt

```text
Create or update Mermaid diagrams for the CyberSim final report.

Rules:
- Use service names from repository files.
- Keep labels short enough for PDF.
- Use red for Red Team actions, cyan/blue for Blue Team analysis, green/gold for success or academic identity, gray for background/infrastructure.
- Export SVG and PNG.
- Update docs/final-report/diagrams/catalog.md with source path, export path, target chapter, caption, and verification status.

Command pattern:
npx --yes @mermaid-js/mermaid-cli -c docs/final-report/diagrams/mermaid-theme.json -i <source.mmd> -o <export.svg> -b white
npx --yes @mermaid-js/mermaid-cli -c docs/final-report/diagrams/mermaid-theme.json -i <source.mmd> -o <export.png> -b white -s 2
```

### 12.4 Formal Report Prose Prompt

```text
Review and polish the CyberSim chapter for a university graduation report.

Requirements:
- Preserve technical facts.
- Keep SC-01 through SC-03 as the only MVP scenarios.
- Keep all cybersecurity activity explicitly lab-only.
- Do not include exact solution commands, flags, hashes, lab-only passwords, or unsafe payload details.
- Make every claim traceable to local source files, evidence, diagrams, or official references.
- Use formal academic prose without marketing exaggeration.
- Keep Markdown ASCII-only.
```

### 12.5 Security Redaction Prompt

```text
Audit docs/final-report for secrets and unsafe disclosure.

Search for:
- API keys.
- Bearer tokens.
- JWT secrets.
- Lab passwords.
- Hashes.
- Exact exploit chains.
- Real target domains or public IPs.
- Full offensive payloads.
- Generic Canva placeholders.

Output:
- Pass/fail summary.
- File and line references for each issue.
- Redaction action taken.
- Remaining risk, if any.
```

### 12.6 Continuous State Prompt

```text
Append a CONTINUOUS_STATE.md entry using this structure:

### [YYYY-MM-DD HH:MM:SS +03:00] - Codex (Documentation Phase N - Short Name)
* **Status**: Complete/Pending/Blocked - concise result.
* **Why**: Why the change was needed.
* **Where**:
  - `path` - what changed.
* **What & How**:
  - Technical summary of how the change works.
* **Verification**:
  - Exact commands and outcomes.

Never conclude the phase without this entry.
```

## 13. Final Quality Gates

Before final submission, all of these must be true:

- Formal report DOCX exists.
- Formal report PDF exists.
- Canva visual report has verified CyberSim content.
- Defense deck exists.
- Academic poster exists.
- Scenario one-pagers exist.
- Screenshot evidence exists.
- Test-output evidence exists.
- References are formatted consistently.
- Diagrams have captions and first in-text references.
- No generic Canva placeholders remain.
- No secrets or unsafe payload material appear in docs.
- `docker compose config --quiet` passes.
- Backend tests are captured.
- Frontend lint/build are captured.
- Demo readiness is captured.
- Continuous state has a final entry.

## 14. Immediate Next Prompt

If the user says "continue" or "start the next documentation phase", use the Phase 5 prompt from this file.

