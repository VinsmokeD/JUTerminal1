# Next Phase Proposal

Standing rule: every documentation handoff should include a proposed next phase with a goal, acceptance criteria, files to create or modify, dependencies, and verification. This keeps the final-report effort moving in clear, auditable increments.

## Completed Phase: Documentation Phase 5 - Screenshots, Canva Replacement, and Defense Visuals

Goal:

- Convert the source documentation into examiner-facing visual assets by capturing current UI screenshots, replacing Canva placeholder text with verified CyberSim page content, and preparing the defense deck/poster outline.

Why this phase came next:

- Chapters 4, 5, and 6 now have source text.
- Scenario dossiers and user manuals exist.
- The final report still lacks screenshot evidence.
- The selected Canva design is visually useful but still needs verified CyberSim-specific content.
- Defense deliverables need a consistent figure and screenshot set.

Acceptance criteria:

- Capture or document blockers for screenshots of:
  - Dashboard.
  - Red Workspace.
  - Blue Workspace.
  - Debrief.
  - Instructor Dashboard.
  - Readiness or health view.
- Update `docs/final-report/evidence/screenshots/README.md` with filenames, captions, and redaction notes.
- Replace Canva generic text using `docs/final-report/canva-page-rewrite-brief.md`.
- Update `docs/final-report/design-and-canva-direction.md` with final screenshot and diagram placement.
- Draft defense deck and academic poster outlines.
- Update `docs/architecture/CONTINUOUS_STATE.md`.

Files created or modified:

- `docs/final-report/evidence/screenshots/*.png` (9 screenshots)
- `docs/final-report/evidence/screenshots/README.md`
- `docs/final-report/defense-deck-outline.md`
- `docs/final-report/academic-poster-outline.md`
- `docs/final-report/evidence/test-output/documentation-phase-05-verification.md`
- `docs/final-report/report-production-checklist.md`
- `docs/architecture/CONTINUOUS_STATE.md`
- `frontend/src/components/layout/HudEnvironment.jsx` (Applied fix for boot sequence crash)

Verification:

- Run `docker compose config --quiet`.
- Run `git status` to verify files.
- Screenshots verified manually via script success.

## Proposed Next Phase: Documentation Phase 6 - Diagram Expansion and Technical Appendices

Goal:

- Finish the missing diagram set and technical appendices so the formal report has a complete architecture, data, API, security, and scenario reference layer.

Why this phase comes next:

- The formal report chapters are drafted but need detailed diagrams and appendices to support claims.
- The requirements traceability matrix needs a final mapping pass.
- API and Database references need to be synchronized with current source.

Acceptance criteria:

- At least 10 new diagram sources exist and render to SVG and PNG.
- Diagram catalog lists every figure, source, export, target chapter/appendix, and caption.
- API/database/security appendices are consistent with current source files.
- Requirements matrix maps requirements to implementation files, tests/evidence, and report sections.
- Continuous state is updated.

Files to create or modify:

- `docs/final-report/diagrams/catalog.md`
- `docs/final-report/technical-architecture-atlas.md`
- `docs/final-report/api-reference.md`
- `docs/final-report/database-reference.md`
- `docs/final-report/requirements-traceability-matrix.md`
- `docs/final-report/report-production-checklist.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Dependencies:

- Existing diagram exports and catalog.
- Fresh source inventory for backend routes and DB models.

Verification:

- Render every Mermaid diagram.
- Verify all SVG/PNG files exist.
- Run documentation ASCII/trailing-whitespace checks.

---

## Completed Phase: Phase 9A — Report Quality, Format, and Theme Redesign

**Completed:** 2026-05-27

Goal:
- Redesign the DOCX report compiler (v2) to produce a premium-quality, KASIT-compliant
  document with CyberSim brand theming, rich table/figure formatting, styled chapter
  title blocks, sidebar accent rules, and improved readability at every level.

Why this phase came next:
- The v1 report used plain python-docx defaults: no color, flat tables, minimal
  structure differentiation. The examiner expects a polished professional document.
- Brand consistency across cover page, chapter headers, tables, and code blocks
  signals project quality before the examiner reads a single line of content.

Approach and improvements delivered:

1. BRAND THEME (CyberSim palette applied throughout):
   - Cover: dark navy (#0D1B2A) title bar, cyan (#00B4D8) project name, near-white blue subtitle.
   - Chapter title blocks: navy shaded label bar ("CHAPTER N") + light-blue title band + bottom accent rule.
   - H2 headings: left cyan border rule (18pt) + 0.4cm indent — visually separates major sections.
   - H3 headings: left mid-navy border rule (10pt) + 0.3cm indent.

2. TABLE REDESIGN (alternating rows + navy header):
   - Header row: #0D1B2A fill, white bold centered text, 11pt Times New Roman.
   - Odd data rows: alice-blue (#F0F8FF) background.
   - First data column: bold. Caption above table (italic, slate, 10pt).
   - Equal column widths auto-distributed across 15cm content area.

3. FIGURE EMBEDDING AND CAPTIONS:
   - All 16 PNGs embedded at anchor points at 13.5cm width, centered.
   - Captions below figures: italic, 10pt, slate (#445566), centered, 10pt space after.
   - Caption line from MD (e.g. "Figure 4.1: ...") skipped if image was embedded above it.

4. CODE BLOCK STYLING:
   - Courier New 9pt, very dark navy text, light-grey (#F5F5F5) shading.
   - Left cyan border (6pt) for visual distinction from body text.

5. FRONT MATTER REDESIGN:
   - Branded cover page: university + school + department + CyberSim title block.
   - Abstract page with bold keyword list.
   - TOC / LOF / LOT pages with Word field codes for auto-population via COM.

6. REFERENCES SECTION:
   - Numbered [1], [2] ... format with hanging indent, 11pt, 4pt spacing.

7. MARKDOWN PARSER (robust):
   - Handles H1/H2/H3, paragraphs, bullets, numbered lists, code fences, tables, and figures.
   - Skips duplicate caption lines already rendered below images.
   - Per-chapter table numbering (N.1, N.2 ...) for KASIT compliance.

Files created or modified:
- `scripts/compile_report_v2.py` — new premium compiler (replaces v1 approach)
- `docs/final-report/formal-report/cybersim-graduation-report.docx` — regenerated
- `docs/final-report/formal-report/cybersim-graduation-report.pdf` — regenerated
- `docs/architecture/CONTINUOUS_STATE.md` — updated

Acceptance criteria achieved:
- [x] DOCX compiles without error.
- [x] PDF generated via Word COM.
- [x] All 16 figures embedded.
- [x] All tables styled with navy header + alternating rows.
- [x] Chapter title blocks use CyberSim brand palette.
- [x] H2/H3 headings have accent left-border rules.
- [x] Code blocks use monospace + grey fill + cyan border.
- [x] KASIT margins (L 3cm), A4, Times New Roman 12pt body maintained.

---

## Proposed Phase: Phase 10 — Defense Preparation & Examiner Pack

Goal:
- Produce the complete defense-day package using the now-polished formal report
  as the source of truth.

Acceptance criteria:
- Finalize defense slide deck (12-15 slides) with embedded CyberSim-branded diagrams
  and UI screenshots. Export as PPTX and PDF.
- Update `defense-rehearsal-script.md` with timed speaker notes (<=18 minutes total).
- Produce `docs/final-report/examiner-qa-pack.md` with predicted examiner questions
  and model answers covering: architecture choices, isolation guarantees, AI safety
  design, scenario authenticity, KASIT compliance, and future scalability.
- Produce `docs/final-report/one-page-abstract.md` (max 300 words, KASIT bulletin format).
- Verify all Phase 8 QA gates still pass (no new placeholders, no scope leakage).
- Re-run MANIFEST.sha256 after any new edits to lock the artifact bundle.

Files to create or modify:
- `docs/final-report/examiner-qa-pack.md` (new)
- `docs/final-report/one-page-abstract.md` (new)
- `docs/final-report/defense-rehearsal-script.md` (update with timing breakdown)
- `MANIFEST.sha256` (regenerate to include new artifacts)
- `docs/architecture/CONTINUOUS_STATE.md`

Next agent continuation prompt:
  Read `docs/final-report/next-phase-proposal.md` and `docs/architecture/CONTINUOUS_STATE.md`.
  Phase 10 is the current active phase. Build the examiner-qa-pack, one-page-abstract,
  and update the defense-rehearsal-script with per-slide timing. The defense must be
  completable in 18 minutes with 5 minutes for examiner Q&A. Use the formal report DOCX
  as content source, not memory. Do not modify the DOCX; only create the support documents.
