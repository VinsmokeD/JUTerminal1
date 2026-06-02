# Changelog: Documentation Synchronization

This document tracks all additions, modifications, and synchronization passes performed on the Parallax graduation documentation package. It records how the written documentation aligns with changes in the code repository.

---

## [2026-06-01] - Final Cleanup, Report Compilation & Full Verification

### Compiled
* `scripts/compile_report_v3.py` — new final-edition compiler. Produces `docs/final-report/formal-report/parallax-graduation-report.docx` (~9.3 MB) and `.pdf` (137 pages). Includes: cover, declaration, acknowledgments, abstract, TOC/LOF/LOT (Word COM updated), abbreviations, 7 body chapters, references, appendices A–M. 22 figures, 52 tables.
* Old `cybersim-graduation-report.*` artifacts (stale project name) permanently removed.

### Updated — Chapters
* `chapter-03-requirements.md` — added Fig 3.1 (UML use-case) reference after functional-requirements table.
* `chapter-04-system-design.md` — new §4.12 "Supplementary Design Models" with Figs 4.7–4.11; renumbered §§4.12–4.15 → 4.13–4.16.
* `chapter-05-implementation.md` — new §5.12 "Implementation Process Models" with Figs 5.1–5.6; summary renumbered §5.13.
* `chapter-06-testing-and-installation.md` — new §6.12 "Scenario Lab Topologies and Attack-Defense Flow" with Figs 6.1–6.4; summary renumbered §6.13.

### Verified — Full App Routes (2026-06-01)
* npm run build: 971 modules, all page chunks — GREEN.
* Live smoke test of every route: Landing (Loop scroll pin holds, completes cleanly), Auth, Onboarding, Dashboard (live data), Settings, Profile, Instructor (student role-redirect), Red workspace (RoE → terminal/PTES/notebook/AI/SIEM), Blue workspace (SIEM/SOC checklist/IR notebook/AI), Debrief (100/100, 6 tabs). Zero console errors.

### Added — Branding
* `frontend/public/brand/` — 7 SVG logo variants + PNG icon. Real Parallax logo replaces all CSS placeholder squares across the app.
* `frontend/public/og-image.svg` — 1200×630 social card.
* `frontend/public/favicon.svg` — Parallax icon mark.

### Removed — Stale Artifacts (2026-06-01)
* All 14 screenshot PNGs from `docs/final-report/evidence/screenshots/` (stale 2026-05-23 Playwright captures — fresh capture required before defense).
* `docs/final-report/evidence/test-output/documentation-phase-04-verification.md` — stale.
* `docs/final-report/evidence/test-output/documentation-phase-05-verification.md` — stale.
* `docs/final-report/evidence/lighthouse-landing-v2.json` — stale Lighthouse audit.
* `docs/final-report/presentation/_poster_preview.png` — placeholder artifact.
* `docs/final-report/presentation/cybersim-defense-deck.pptx` — old CyberSim-branded deck.
* `docs/testing_results/loadtest_*.csv` (8 files) — stale load-test run data.

### Updated — Documentation Index Files
* `docs/final-report/README.md` — deliverables status table updated; formal report marked Complete; stale evidence noted as pending.
* `docs/final-report/report-production-checklist.md` — Phase 2/3/4 fully checked; Phase 5 deck/screenshots pending; Phase 6 DOCX/PDF/QA gates marked complete.
* `docs/final-report/evidence/screenshots/README.md` — all statuses reset to ⏳ Pending new capture.
* `docs/final-report/evidence/test-output/README.md` — fresh evidence run required; known build pass noted.
* `docs/final-report/formal-report/render-verification.md` — rewritten for v3 (22-figure table, QA gates, reproduce steps).

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
