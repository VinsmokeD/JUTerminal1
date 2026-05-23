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
