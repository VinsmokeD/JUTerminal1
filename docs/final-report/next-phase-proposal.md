# Next Phase Proposal

Standing rule: every documentation handoff should include a proposed next phase with a goal, acceptance criteria, files to create or modify, dependencies, and verification. This keeps the final-report effort moving in clear, auditable increments.

## Completed Phase: Documentation Phase 2 - Evidence Capture and Architecture Diagram Export

Goal:

- Convert the first documentation scaffold into evidence-backed architecture material by exporting verified diagrams, collecting current platform evidence, and drafting the System Design chapter from the actual repository.

Why this phase comes next:

- Batch 1 created the report workspace, references, API/database summaries, initial chapters, and Mermaid diagram sources.
- The final report now needs proof artifacts before deeper prose expands.
- Chapter 4 depends on reliable architecture diagrams and source evidence.
- Canva should be updated with diagrams/screenshots only after those assets are verified.

Acceptance criteria:

- At least six diagram sources render successfully to SVG or PNG:
  - C4 context.
  - C4 container.
  - DFD Level 0.
  - ERD.
  - Docker topology.
  - Red-to-Blue event sequence.
- `docs/final-report/chapters/chapter-04-system-design.md` exists and references those diagrams.
- `docs/final-report/evidence/` contains current evidence placeholders or captured outputs for:
  - `git status --short`.
  - `docker compose config --quiet`.
  - backend tests command target.
  - frontend lint/build command target.
  - demo readiness command target.
- `docs/final-report/diagrams/catalog.md` is updated with export status.
- `docs/architecture/CONTINUOUS_STATE.md` is updated with the phase work and verification.

Files to create or modify:

- `docs/final-report/chapters/chapter-04-system-design.md`
- `docs/final-report/evidence/README.md`
- `docs/final-report/evidence/test-output/README.md`
- `docs/final-report/evidence/screenshots/README.md`
- `docs/final-report/diagrams/catalog.md`
- `docs/final-report/technical-architecture-atlas.md`
- `docs/final-report/report-production-checklist.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Optional files if rendering tools are available:

- `docs/final-report/diagrams/export/svg/*.svg`
- `docs/final-report/diagrams/export/png/*.png`

Dependencies:

- Existing Mermaid sources in `docs/final-report/diagrams/source/`.
- Current route and database references from Batch 1.
- Current Docker Compose topology.
- Current project verification commands.

Verification:

- Run `git diff --check` on documentation files.
- Run ASCII/trailing-whitespace checks for new final-report docs.
- If diagram tooling is available, render the Mermaid sources and confirm generated files exist.
- If diagram tooling is unavailable, record the blocker and keep source diagrams ready for export.

Suggested execution order:

1. Create evidence folder scaffolding.
2. Check for Mermaid rendering support.
3. Render diagrams if tooling exists; otherwise document export instructions.
4. Draft Chapter 4 around the verified diagrams.
5. Update architecture atlas and checklist.
6. Update continuous state.
7. End with the next proposed phase: Documentation Phase 3 - Scenario Dossiers and UX/User Manual.

## Proposed Next Phase: Documentation Phase 3 - Scenario Dossiers, UX Evidence, and Canva Replacement

Goal:

- Expand the documentation from system architecture into scenario-level, user-level, and visual-report material by drafting SC-01/SC-02/SC-03 dossiers, capturing current UI screenshots, and replacing generic Canva text with verified CyberSim content.

Why this phase comes next:

- Chapter 4 now has rendered architecture diagrams and evidence-backed source text.
- The final report still needs detailed scenario documentation and user experience evidence.
- Canva candidate 2 is visually ready, but its content must be replaced before it can support a defense presentation.

Acceptance criteria:

- Create scenario dossier files for:
  - SC-01 NovaMed Healthcare.
  - SC-02 Nexora Financial.
  - SC-03 Orion Logistics.
- Create initial student and instructor user manual source files.
- Capture or prepare the required screenshot inventory under `docs/final-report/evidence/screenshots/`.
- Update the Canva visual report text according to `docs/final-report/canva-page-rewrite-brief.md` or produce a page-ready replacement script if direct editing is not reliable.
- Update the diagram catalog with the next diagram batch requirements:
  - AI safety pipeline.
  - Scenario phase state machine.
  - Authentication/session lifecycle.
  - Report generation pipeline.
  - Instructor analytics flow.
- Update `docs/architecture/CONTINUOUS_STATE.md`.

Files to create or modify:

- `docs/final-report/scenarios/sc-01-novamed-dossier.md`
- `docs/final-report/scenarios/sc-02-nexora-dossier.md`
- `docs/final-report/scenarios/sc-03-orion-dossier.md`
- `docs/final-report/user-manuals/student-manual.md`
- `docs/final-report/user-manuals/instructor-manual.md`
- `docs/final-report/evidence/screenshots/`
- `docs/final-report/canva-page-rewrite-brief.md`
- `docs/final-report/diagrams/catalog.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Dependencies:

- Running local frontend and backend for screenshots.
- Active Docker stack if live scenario screenshots are required.
- Existing Chapter 4 diagrams and source inventory.
- Current scenario specs, hint trees, event maps, and playbooks.

Verification:

- Run documentation formatting checks.
- Verify screenshots exist and do not expose secrets.
- Verify Canva text no longer contains generic placeholders.
- If no code changes occur, run `docker compose config --quiet` plus documentation checks. If screenshots require live workflows, run the relevant smoke/demo command.

Next likely phase after Phase 3:

- Documentation Phase 4 - Implementation, Testing, Installation, and Operations Chapters.
