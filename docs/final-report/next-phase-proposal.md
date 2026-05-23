# Next Phase Proposal

Standing rule: every documentation handoff should include a proposed next phase with a goal, acceptance criteria, files to create or modify, dependencies, and verification. This keeps the final-report effort moving in clear, auditable increments.

## Completed Phase: Documentation Phase 4 - Implementation, Testing, Installation, and Operations

Goal:

- Extend the report package from architecture and scenario documentation into implementation, verification, installation, and operations material.

Why this phase came next:

- Phase 3 already added the scenario dossiers and initial user manuals.
- The formal report still needed Chapter 5 and Chapter 6 source text.
- The evidence bundle needed clearer test-output expectations.
- The operations material needed a maintainer-facing checklist for demos and labs.
- The Phase 3 manuals contained non-ASCII symbols that conflicted with the ASCII-only final-report check.

Acceptance criteria:

- Create `docs/final-report/chapters/chapter-05-implementation.md`.
- Create `docs/final-report/chapters/chapter-06-testing-and-installation.md`.
- Create a maintainer/operations manual.
- Clean scenario dossiers and user manuals to report-safe ASCII Markdown.
- Update the report README, checklist, architecture atlas, and continuous state.
- Run documentation formatting checks and `docker compose config --quiet`.

Files created or modified:

- `docs/final-report/chapters/chapter-05-implementation.md`
- `docs/final-report/chapters/chapter-06-testing-and-installation.md`
- `docs/final-report/user-manuals/maintainer-operations-manual.md`
- `docs/final-report/scenarios/sc-01-novamed-dossier.md`
- `docs/final-report/scenarios/sc-02-nexora-dossier.md`
- `docs/final-report/scenarios/sc-03-orion-dossier.md`
- `docs/final-report/user-manuals/student-manual.md`
- `docs/final-report/user-manuals/instructor-manual.md`
- `docs/final-report/README.md`
- `docs/final-report/report-production-checklist.md`
- `docs/final-report/technical-architecture-atlas.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Verification:

- Run `docker compose config --quiet`.
- Run `git diff --check` on final-report and state files.
- Run ASCII and trailing-whitespace checks on `docs/final-report`.
- Capture the verification summary under `docs/final-report/evidence/test-output/`.

## Proposed Next Phase: Documentation Phase 5 - Screenshots, Canva Replacement, and Defense Visuals

Goal:

- Convert the source documentation into examiner-facing visual assets by capturing current UI screenshots, replacing Canva placeholder text with verified CyberSim page content, and preparing the defense deck/poster outline.

Why this phase comes next:

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
- Replace Canva generic text using `docs/final-report/canva-page-rewrite-brief.md`, or create a page-ready replacement script if direct editing is unreliable.
- Update `docs/final-report/design-and-canva-direction.md` with final screenshot and diagram placement.
- Draft defense deck and academic poster outlines.
- Update `docs/architecture/CONTINUOUS_STATE.md`.

Files to create or modify:

- `docs/final-report/evidence/screenshots/README.md`
- `docs/final-report/design-and-canva-direction.md`
- `docs/final-report/canva-page-rewrite-brief.md`
- `docs/final-report/defense-deck-outline.md`
- `docs/final-report/academic-poster-outline.md`
- `docs/final-report/report-production-checklist.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Dependencies:

- Running frontend/backend for browser screenshots.
- Instructor account or seeded instructor access.
- Existing diagram exports under `docs/final-report/diagrams/export/`.
- Selected Canva design `DAHKeHjt8IY`.

Verification:

- Confirm screenshot files exist and do not expose secrets.
- Run documentation ASCII/trailing-whitespace checks.
- Run `git diff --check` on modified documentation.
- If the live stack is used, run `python scripts/demo_check.py` before screenshots.
