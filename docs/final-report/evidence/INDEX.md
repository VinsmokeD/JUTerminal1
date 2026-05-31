# Evidence Index â€” Parallax Phase 8 QA Lock

**Generated:** 2026-05-26  
**Phase:** 8 â€” Evidence Bundle & QA Lockdown  
**Compiled by:** Antigravity Agent  
**Status:** âœ… LOCKED

---

## 1. Primary Deliverables

| # | Artifact | Path | Size | SHA-256 (first 16 chars) |
|---|----------|------|------|--------------------------|
| 1 | Graduation Report (DOCX) | `docs/final-report/formal-report/parallax-graduation-report.docx` | 1,229,155 B | `5406D1FE718D4D63` |
| 2 | Graduation Report (PDF) | `docs/final-report/formal-report/parallax-graduation-report.pdf` | 1,794,941 B | `102E77D4C34987C9` |
| 3 | Render Verification | `docs/final-report/formal-report/render-verification.md` | 3,793 B | `2FFE5BD4B27959` |
| 4 | MANIFEST.sha256 | `MANIFEST.sha256` (project root) | 30 entries | self-referential |

Full hashes: see [`MANIFEST.sha256`](../../../MANIFEST.sha256).

---

## 2. Chapter Source Files

| Chapter | File | Lines | Size |
|---------|------|-------|------|
| Ch. 1 â€” Introduction | `chapters/chapter-01-introduction.md` | 74 | 6,904 B |
| Ch. 2 â€” Related Systems | `chapters/chapter-02-related-existing-systems.md` | 65 | 8,431 B |
| Ch. 3 â€” Requirements | `chapters/chapter-03-requirements.md` | 117 | 7,007 B |
| Ch. 4 â€” System Design | `chapters/chapter-04-system-design.md` | 197 | 20,085 B |
| Ch. 5 â€” Implementation | `chapters/chapter-05-implementation.md` | 118 | 10,943 B |
| Ch. 6 â€” Testing & Installation | `chapters/chapter-06-testing-and-installation.md` | 104 | 6,003 B |
| Ch. 7 â€” Conclusions | `chapters/chapter-07-conclusions-and-future-work.md` | 68 | 6,957 B |
| References | `references.md` | 49 | 2,726 B |

---

## 3. Technical Diagrams (16 figures embedded in report)

All exported from Mermaid source under `docs/final-report/diagrams/`.

| Figure # | Caption | PNG File | Size |
|----------|---------|----------|------|
| Fig 4.1 | Parallax System Context | `diagrams/export/png/c4-context.png` | 89,839 B |
| Fig 4.2 | Parallax Container Architecture | `diagrams/export/png/c4-container.png` | 69,511 B |
| Fig 4.3 | Parallax DFD Level 0 | `diagrams/export/png/dfd-level-0.png` | 46,256 B |
| Fig 4.4 | Parallax Core ERD | `diagrams/export/png/erd-core-schema.png` | 176,843 B |
| Fig 4.5 | Docker Network & Service Topology | `diagrams/export/png/docker-topology.png` | 59,984 B |
| Fig 4.6 | Red-to-Blue Event Sequence | `diagrams/export/png/red-blue-event-sequence.png` | 37,963 B |
| Fig 4.7 | UML Use Case Diagram | `diagrams/export/png/uml-use-case.png` | 160,172 B |
| Fig 4.8 | Authentication Sequence | `diagrams/export/png/auth-sequence.png` | 85,924 B |
| Fig 4.9 | Session Lifecycle State Machine | `diagrams/export/png/session-lifecycle-state.png` | 79,869 B |
| Fig 4.10 | Scenario Phase State Machine | `diagrams/export/png/scenario-phase-state-machine.png` | 96,091 B |
| Fig 5.1 | AI Safety Pipeline | `diagrams/export/png/ai-safety-pipeline.png` | 71,575 B |
| Fig 5.2 | Report Generation Pipeline | `diagrams/export/png/report-generation-pipeline.png` | 30,922 B |
| Fig 5.3 | Instructor Analytics Data Flow | `diagrams/export/png/instructor-analytics-flow.png` | 67,786 B |
| Fig 5.4 | SC-01 Scenario Topology | `diagrams/export/png/sc01-topology.png` | 59,207 B |
| Fig 5.5 | SC-02 Scenario Topology | `diagrams/export/png/sc02-topology.png` | 59,777 B |
| Fig 5.6 | SC-03 Scenario Topology | `diagrams/export/png/sc03-topology.png` | 67,740 B |

---

## 4. UI Screenshots (System Evidence)

All screenshots captured from live Parallax frontend. Located under `evidence/screenshots/`.

| Screenshot | Description | Size |
|-----------|-------------|------|
| `landing-page.png` | Parallax login/splash screen | 1,563,181 B |
| `auth-page.png` | Authentication flow UI | 1,879,266 B |
| `dashboard-scenarios.png` | Scenario selection dashboard | 2,222,604 B |
| `red-workspace-terminal.png` | Red Team terminal workspace (xterm.js) | 2,132,215 B |
| `blue-workspace-siem.png` | Blue Team SIEM event feed | 1,705,719 B |
| `ai-tutor-panel.png` | AI Monitor hint panel | 529,712 B |
| `debrief-killchain.png` | Post-mission debrief report | 1,730,565 B |
| `instructor-dashboard.png` | Instructor analytics view | 1,692,996 B |
| `api-docs.png` | FastAPI /docs Swagger UI | 227,530 B |
| `docker-services.png` | `docker compose ps` output | 42,104 B |
| `debug-auth-fail.png` | Auth failure flow for QA testing | 1,884,563 B |

---

## 5. Build & Test Output

| File | Description |
|------|-------------|
| `evidence/test-output/documentation-phase-04-verification.md` | Phase 4 chapter verification log |
| `evidence/test-output/documentation-phase-05-verification.md` | Phase 5 implementation chapter log |
| `evidence/source-inventory.md` | Repomix pack summary (210 source files, 175,785 tokens) |

---

## 6. QA Audit Results

**Audit Date:** 2026-05-26  
**Auditor:** Antigravity Phase 8 Agent

| Check | Result | Notes |
|-------|--------|-------|
| Placeholder text (TODO/TBD/Lorem) | âœ… PASS | Zero matches across all 7 chapters |
| SC-04/SC-05 scope leakage | âœ… PASS | Only in Ch. 7 future work (correct) |
| Leaked credentials / hardcoded secrets | âœ… PASS | Zero matches; `NexoraAdmin` in scenario dossier is fictional training account |
| Inline citation markers `[N]` | âœ… N/A | Report uses end-of-document bibliography style; no numeric inline cites |
| Diagram count vs embedded count | âœ… PASS | 16 PNGs on disk, 16 figures in report |
| DOCX file integrity | âœ… PASS | 1,229,155 bytes, SHA-256 locked |
| PDF file integrity | âœ… PASS | 1,794,941 bytes, SHA-256 locked |
| KASIT formatting compliance | âœ… PASS | See `render-verification.md` |

---

## 7. Integrity Verification Command

To re-verify any artifact after this lock:

```powershell
# Re-hash the report files and compare to MANIFEST.sha256
(Get-FileHash "docs\final-report\formal-report\parallax-graduation-report.docx" -Algorithm SHA256).Hash
# Expected: 5406D1FE718D4D63C39A96D4DCE8B1D02120DA04894555D24165FC48552FC57D

(Get-FileHash "docs\final-report\formal-report\parallax-graduation-report.pdf" -Algorithm SHA256).Hash
# Expected: 102E77D4C34987C9E1211E7BE0307A5F2B8526E64F77F4F076B22D3ED6116DF6
```

---

*Phase 8 lockdown complete. No further modifications to formal-report artifacts without incrementing the version and regenerating MANIFEST.sha256.*
