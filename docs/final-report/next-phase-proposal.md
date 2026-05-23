# Next Phase Proposal

Standing rule: every documentation handoff should include a proposed next phase with a goal, acceptance criteria, files to create or modify, dependencies, and verification. This keeps the final-report effort moving in clear, auditable increments.

## Proposed Next Phase: Documentation Phase 2 - Evidence Capture and Architecture Diagram Export

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

