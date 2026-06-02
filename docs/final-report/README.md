# Parallax Final Report Workspace

This folder is the production workspace for the Parallax graduation documentation package. It turns the master documentation plan into concrete report sources, diagram sources, references, and visual-design guidance.

## Selected Canva Direction

Candidate 2 was selected and converted into an editable Canva design.

| Item | Value |
| --- | --- |
| Canva design id | `DAHKeHjt8IY` |
| Title | `Report - Parallax Project Report` |
| Pages | 17 |
| Edit URL | https://www.canva.com/d/HiO92F8_1b90Umj |
| View URL | https://www.canva.com/d/AWvF-sEqVnIMkdU |

Use the Canva design as the visual companion direction, not as the official formal report. The official report must still follow the KASIT handbook formatting rules.

## Documentation Outputs

| Output | Purpose | Status |
| --- | --- | --- |
| Formal report DOCX | University-compliant submission document | ✅ Complete — `parallax-graduation-report.docx` (~9.3 MB, 137 pages) |
| Formal report PDF | PDF export of above | ✅ Complete — `parallax-graduation-report.pdf` (137 pages, 22 figures, 52 tables) |
| Canva visual report | Examiner-friendly visual companion | ⏳ Design selected; content replacement pending |
| Defense deck | Presentation for final defense | ⏳ Outline drafted; new deck pending (old CyberSim artifact removed) |
| Academic poster | Poster submission and demo-day display | ⏳ Outline drafted; production pending |
| Technical architecture atlas | Commercial-grade diagram and architecture reference | ✅ Complete (Appendix D) |
| API reference | Backend route documentation | ✅ Complete (Appendix B) |
| Database reference | Schema and data lifecycle documentation | ✅ Complete (Appendix C) |
| Requirements matrix | Requirements, implementation, tests, and evidence mapping | ✅ Complete (Appendix A) |
| Diagram catalog | Source, export, and caption registry for figures | ✅ Complete — 22 diagrams (PNG + SVG + .mmd sources) |
| Evidence bundle — screenshots | 10 application screenshots | ⏳ Pending fresh capture (stale images removed 2026-06-01) |
| Evidence bundle — test output | Command evidence files | ⏳ Pending fresh run |
| Canva rewrite brief | Page-by-page Parallax replacement plan for selected Canva design | ✅ Complete |
| Tooling and skill log | Record of useful MCP, plugin, and skill usage | ✅ Complete |
| Documentation master prompt pack | Detailed context, phase prompts, tool plans, and remaining-roadmap prompts | ✅ Complete |
| Scenario dossiers | SC-01 (NovaMed), SC-02 (Nexora), SC-03 (Orion) report-safe summaries | ✅ Complete (Appendix F + scenarios/) |
| Student manual | Student-facing workflow documentation | ✅ Complete (Appendix I) |
| Instructor manual | Instructor-facing workflow documentation | ✅ Complete (Appendix J) |
| Maintainer operations manual | Installation, readiness, recovery, and evidence guidance | ✅ Complete (Appendix K) |
| Security and safety case | STRIDE threat model, sandbox isolation, prompt injection mitigations | ✅ Complete (Appendix E) |
| Known limitations and future work | Technical limitations and roadmap (SC-04/SC-05, Kubernetes, LMS LTI) | ✅ Complete (Appendix M + Chapter 7) |
| Accessibility and usability notes | WCAG AA compliance, resizable panels, workspace UX | ✅ Complete (Appendix L) |

## Formal Report — Compiled Deliverables

| File | Location | Pages | Notes |
| --- | --- | --- | --- |
| `parallax-graduation-report.docx` | `formal-report/` | 137 | Final edition — KASIT compliant. Compiled 2026-06-01. |
| `parallax-graduation-report.pdf` | `formal-report/` | 137 | Word COM export. TOC/LOF/LOT updated. |

Reproduce with:
```powershell
backend\.venv\Scripts\python.exe scripts\compile_report_v3.py
```

## Folder Map

```text
docs/final-report/
├── README.md
├── CHANGELOG-DOCS.md
├── report-production-checklist.md
├── design-and-canva-direction.md
├── canva-page-rewrite-brief.md
├── documentation-master-prompt-pack.md
├── tooling-and-skill-usage.md
├── requirements-traceability-matrix.md
├── technical-architecture-atlas.md
├── api-reference.md
├── database-reference.md
├── references.md
├── security-and-safety-case.md
├── deployment-and-operations-manual.md
├── scenario-design-dossier.md
├── testing-and-verification-evidence.md
├── known-limitations-and-future-work.md
├── accessibility-and-usability-notes.md
├── examiner-qa-sheet.md
├── defense-deck-outline.md
├── academic-poster-outline.md
├── next-phase-proposal.md
├── chapters/
│   ├── chapter-01-introduction.md
│   ├── chapter-02-related-existing-systems.md
│   ├── chapter-03-requirements.md
│   ├── chapter-04-system-design.md
│   ├── chapter-05-implementation.md
│   ├── chapter-06-testing-and-installation.md
│   └── chapter-07-conclusions-and-future-work.md
├── formal-report/
│   ├── parallax-graduation-report.docx   ← final compiled DOCX
│   ├── parallax-graduation-report.pdf    ← final compiled PDF
│   └── render-verification.md
├── scenarios/
│   ├── sc01-walkthrough.md
│   ├── sc02-walkthrough.md
│   └── sc03-walkthrough.md
├── diagrams/
│   ├── catalog.md
│   ├── mermaid-theme.json
│   ├── source/   ← .mmd source files
│   └── export/
│       ├── svg/
│       └── png/  ← 22 embedded figures
├── presentation/
│   ├── defense-deck-outline.md    ← outline only; deck pending
│   └── academic-poster-outline.md
└── evidence/
    ├── screenshots/
    │   └── README.md   ← 10 captures pending (stale removed 2026-06-01)
    └── test-output/
        └── README.md   ← fresh evidence run pending
```

## Formal Report Rule

The formal report remains conservative and handbook-compliant:

- A4 page size.
- Times New Roman.
- 12 pt body text.
- 14 pt centered, bold, capitalized chapter headings.
- Left margin 3 cm; top, right, and bottom margins 2 cm.
- Roman numerals for front matter; Arabic numerals for body.
- Table captions above tables.
- Figure captions below figures.
- References for every external claim.

The visual companion, poster, and defense deck may use the richer University of Jordan inspired black/gold/green style defined in `design-and-canva-direction.md`.
