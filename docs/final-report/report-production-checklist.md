# Report Production Checklist

Use this checklist to drive the remaining documentation work from source freeze to final PDF and Canva deliverables.

## Phase 1: Source Freeze

- [x] Confirm current project scope: SC-01, SC-02, SC-03 only.
- [x] Capture current `git status` and commit hash for documentation evidence.
- [x] Create detailed documentation master prompt pack for remaining phases.
- [x] Confirm latest backend test count and frontend build status. (npm run build: 971 modules, all green — 2026-06-01)
- [ ] Export FastAPI OpenAPI JSON from `/api/docs` or `/openapi.json` if available.
- [x] Export current Docker Compose config with `docker compose config`.
- [x] Capture database model inventory from SQLAlchemy and migrations.
- [x] Capture current scenario YAMLs, hint trees, SIEM rules, and playbooks.
- [ ] Capture current application screenshots. (previous captures removed — pending fresh capture with final Parallax branding)

## Phase 2: Formal Report

- [x] Create DOCX template using KASIT handbook margins, fonts, heading styles, and page numbering. (`scripts/compile_report_v3.py`)
- [x] Add cover page and title page placeholders.
- [x] Add declaration page.
- [x] Add abstract.
- [x] Add acknowledgments.
- [x] Add table of contents field (updated via Word COM).
- [x] Add list of figures field (updated via Word COM).
- [x] Add list of tables field (updated via Word COM).
- [x] Add list of abbreviations.
- [x] Draft Chapter 1: Introduction.
- [x] Draft Chapter 2: Related Existing Systems.
- [x] Draft Chapter 3: Requirements Engineering and Analysis.
- [x] Draft Chapter 4: System Design.
- [x] Draft Chapter 5: Implementation.
- [x] Draft Chapter 6: Testing and Installation.
- [x] Draft Chapter 7: Conclusions and Future Work.
- [x] Add references.
- [x] Add appendices (A–M wired into the compiled DOCX).

## Phase 3: Technical Appendices

- [x] Finalize API reference. (Appendix B)
- [x] Finalize database reference. (Appendix C)
- [x] Finalize architecture atlas. (Appendix D)
- [x] Finalize security and safety case. (Appendix E)
- [x] Finalize scenario design dossier. (Appendix F)
- [x] Draft deployment and operations manual.
- [x] Draft student user manual.
- [x] Draft instructor user manual.
- [x] Draft admin/maintainer manual.

## Phase 4: Diagrams

- [x] Export C4 context diagram.
- [x] Export C4 container diagram.
- [x] Export DFD Level 0.
- [x] Export ERD.
- [x] Export Docker topology.
- [x] Export Red-to-Blue event sequence.
- [x] Add UML use case diagram. (Fig 3.1)
- [x] Add UML class/component diagram. (Fig 4.11 component interaction)
- [x] Add authentication sequence diagram. (Fig 4.7)
- [x] Add session lifecycle state machine. (Fig 4.8)
- [x] Add scenario phase state machine. (Fig 4.9)
- [x] Add AI safety pipeline. (Fig 5.3)
- [x] Add report generation pipeline. (Fig 5.5)
- [x] Add instructor analytics data flow. (Fig 5.6)
- [x] Add SC-01 topology. (Fig 6.1)
- [x] Add SC-02 topology. (Fig 6.2)
- [x] Add SC-03 topology. (Fig 6.3)
- [x] Verify every diagram has a caption and first in-text reference. (22/22 embedded and referenced — see render-verification.md)

## Phase 5: Canva Visual Package

- [x] Select Canva candidate 2.
- [x] Create editable Canva visual report design.
- [x] Create verified Canva page rewrite brief.
- [ ] Replace generic Canva text with verified Parallax content.
- [ ] Import/export polished architecture diagrams into Canva.
- [ ] Add new screenshots to Canva visual package. (screenshots pending capture)
- [ ] Create defense deck (Parallax-branded — old CyberSim deck removed).
- [ ] Create academic poster.
- [ ] Create SC-01 one-pager.
- [ ] Create SC-02 one-pager.
- [ ] Create SC-03 one-pager.

## Phase 6: Evidence and QA

- [ ] Run `git diff --check`.
- [ ] Run backend tests and save output to `docs/final-report/evidence/test-output/backend-pytest.txt`.
- [ ] Run frontend lint and save output to `docs/final-report/evidence/test-output/frontend-lint.txt`.
- [ ] Run `npm run build` and save output to `docs/final-report/evidence/test-output/frontend-build.txt`. (confirmed passing 2026-06-01)
- [ ] Run `docker compose config --quiet` and save to `docs/final-report/evidence/test-output/docker-compose-config.txt`.
- [ ] Run `python scripts/demo_check.py --scenarios all`.
- [ ] Capture browser smoke screenshots (10 views — see evidence/screenshots/README.md).
- [x] Render final DOCX to PDF. (`parallax-graduation-report.pdf` — 137 pages — 2026-06-01)
- [x] Inspect rendered PDF pages (137 pages, 22 figures, 52 tables verified).
- [x] Check table of contents, list of figures, and list of tables (Word COM updated).
- [ ] Check citations and references.
- [x] Check for accidental credentials or secrets. (0 hits — regex scan 2026-06-01)
- [x] Check for unsupported claims. (0 TODO/TBD/FIXME/Lorem markers — 2026-06-01)
- [ ] Final export: DOCX ✅, PDF ✅, Canva links, poster, deck, evidence bundle.
