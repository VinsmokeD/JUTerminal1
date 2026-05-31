# Changelog: Documentation Synchronization

This document tracks all additions, modifications, and synchronization passes performed on the Parallax graduation documentation package. It records how the written documentation aligns with changes in the code repository.

---

## [2026-05-26] - Documentation Completion & Technical Appendices

### Added
* Created `docs/final-report/security-and-safety-case.md` containing the threat model (STRIDE), air-gapped sandboxing details, prompt injection mitigations, and industry mappings (MITRE ATT&CK / NIST CSF).
* Created `docs/final-report/deployment-and-operations-manual.md` providing prerequisites, environment keys, local setup, production Caddy proxy configs, and health verification steps.
* Created `docs/final-report/scenario-design-dossier.md` explaining the pedagogical dual-perspective learning loop, scenario blueprints, Docker network topologies, and scoring rules.
* Created `docs/final-report/testing-and-verification-evidence.md` documenting the testing pyramid, unit test outputs (pytest), Alembic database migrations, ESLint status, and Locust load testing metrics.
* Created `docs/final-report/known-limitations-and-future-work.md` detailing technical limitations (memory overhead, AD startup latency, AI context limits) and future roadmap items (Kubernetes, LMS LTI, forensics).
* Created `docs/final-report/accessibility-and-usability-notes.md` detailing usability workspace layouts, resizable panels, and accessibility WCAG AA compliance features.
* Created `docs/architecture/DOCUMENTATION_CONTINUATION_PROMPT.md` for continuation orchestration.

### Synchronized
* Aligned all scenario configurations and implementation sections to state that the GoPhish container in SC-03 runs at `172.20.3.10` instead of the stale `.40` IP.
* Updated AI monitoring specifications across all chapters to reflect the transition from the native Google Gemini SDK to the OpenRouter DeepSeek API completions endpoint.
* Aligned active session database schema documentation to match the `Session.started_at` attribute instead of the historical `created_at` field.
* Documented the removal of CRT overlays, welcome screen popups, and scanline sweeps from the default Red/Blue workspaces for enhanced usability.

---

## [2026-05-23] - Diagram Expansion and Catalog

### Added
* Drafted and exported 10 new architecture diagrams (UML use case, Component, Auth sequence, State machines, AI pipeline, Topology views) to PNG and SVG formats under `docs/final-report/diagrams/`.
* Updated `docs/final-report/diagrams/catalog.md` with dimensions, captions, and references.
* Created the scenario dossier comparison index (`docs/final-report/scenarios/INDEX.md`).

---

## [2026-05-22] - Visual Evidence & Chapter Drafts

### Added
* Captured 12 current high-resolution screenshots from the live application and placed them under `docs/final-report/evidence/screenshots/`.
* Updated screenshot catalog `docs/final-report/evidence/screenshots/README.md`.
* Drafted Chapter 1 through Chapter 7 Markdown sources.
* Drafted student, instructor, and maintainer manuals.
