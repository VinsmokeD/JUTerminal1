# Report Production Checklist

Use this checklist to drive the remaining documentation work from source freeze to final PDF and Canva deliverables.

## Phase 1: Source Freeze

- [ ] Confirm current project scope: SC-01, SC-02, SC-03 only.
- [ ] Capture current `git status` and commit hash for documentation evidence.
- [ ] Confirm latest backend test count and frontend build status.
- [ ] Export FastAPI OpenAPI JSON from `/api/docs` or `/openapi.json` if available.
- [ ] Export current Docker Compose config with `docker compose config`.
- [ ] Capture database model inventory from SQLAlchemy and migrations.
- [ ] Capture current scenario YAMLs, hint trees, SIEM rules, and playbooks.
- [ ] Capture current application screenshots.

## Phase 2: Formal Report

- [ ] Create DOCX template using KASIT handbook margins, fonts, heading styles, and page numbering.
- [ ] Add cover page and title page placeholders.
- [ ] Add abstract placeholder.
- [ ] Add acknowledgments placeholder.
- [ ] Add table of contents field.
- [ ] Add list of figures field.
- [ ] Add list of tables field.
- [ ] Add list of abbreviations.
- [ ] Draft Chapter 1: Introduction.
- [ ] Draft Chapter 2: Related Existing Systems.
- [ ] Draft Chapter 3: Requirements Engineering and Analysis.
- [ ] Draft Chapter 4: System Design.
- [ ] Draft Chapter 5: Implementation.
- [ ] Draft Chapter 6: Testing and Installation.
- [ ] Draft Chapter 7: Conclusions and Future Work.
- [ ] Add references.
- [ ] Add appendices.

## Phase 3: Technical Appendices

- [ ] Finalize API reference.
- [ ] Finalize database reference.
- [ ] Finalize architecture atlas.
- [ ] Finalize security and safety case.
- [ ] Finalize scenario design dossier.
- [ ] Finalize deployment and operations manual.
- [ ] Finalize student user manual.
- [ ] Finalize instructor user manual.
- [ ] Finalize admin/maintainer manual.

## Phase 4: Diagrams

- [ ] Export C4 context diagram.
- [ ] Export C4 container diagram.
- [ ] Export DFD Level 0.
- [ ] Export ERD.
- [ ] Export Docker topology.
- [ ] Export Red-to-Blue event sequence.
- [ ] Add UML use case diagram.
- [ ] Add UML class/component diagram.
- [ ] Add authentication sequence diagram.
- [ ] Add session lifecycle state machine.
- [ ] Add scenario phase state machine.
- [ ] Add AI safety pipeline.
- [ ] Add report generation pipeline.
- [ ] Add instructor analytics data flow.
- [ ] Add SC-01 topology.
- [ ] Add SC-02 topology.
- [ ] Add SC-03 topology.
- [ ] Verify every diagram has a caption and first in-text reference.

## Phase 5: Canva Visual Package

- [x] Select Canva candidate 2.
- [x] Create editable Canva visual report design.
- [ ] Replace generic Canva text with verified CyberSim content.
- [ ] Import/export polished architecture diagrams.
- [ ] Add current screenshots.
- [ ] Create defense deck.
- [ ] Create academic poster.
- [ ] Create SC-01 one-pager.
- [ ] Create SC-02 one-pager.
- [ ] Create SC-03 one-pager.

## Phase 6: Evidence and QA

- [ ] Run `git diff --check`.
- [ ] Run backend tests selected for final evidence.
- [ ] Run frontend lint and build.
- [ ] Run `docker compose config --quiet`.
- [ ] Run `python scripts/demo_check.py --scenarios all`.
- [ ] Capture browser smoke screenshots.
- [ ] Render final DOCX to PDF.
- [ ] Inspect rendered PDF pages.
- [ ] Check table of contents, list of figures, and list of tables.
- [ ] Check citations and references.
- [ ] Check for accidental credentials or secrets.
- [ ] Check for unsupported claims.
- [ ] Final export: DOCX, PDF, Canva links, poster, deck, evidence bundle.

