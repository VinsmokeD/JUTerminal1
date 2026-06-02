# Render Verification — Parallax Graduation Report v3 (Final Edition)

**Compiled:** 2026-06-01
**Compiler:** `scripts/compile_report_v3.py` (Final Edition — supersedes v2)
**Status:** VERIFIED

---

## 1. Compiled Deliverables

| Format | File | Size |
| --- | --- | --- |
| Microsoft Word (DOCX) | `parallax-graduation-report.docx` | ~9.3 MB |
| Adobe PDF | `parallax-graduation-report.pdf` | ~3.1 MB |
| Pages (PDF) | 137 | — |

Both files are generated in a single pipeline run. The Word COM step opens the DOCX,
updates all fields plus the Table of Contents / List of Figures / List of Tables, saves
the DOCX with populated fields, and exports the PDF.

> The previous `cybersim-graduation-report.*` artifacts (old project name) were removed;
> they are fully superseded by the `parallax-graduation-report.*` build.

---

## 2. Document Structure (Final)

| Section | Content |
| --- | --- |
| Front matter | Cover, Declaration, Acknowledgments, Abstract, Table of Contents, List of Figures, List of Tables, List of Abbreviations |
| Body | Chapter 1 Introduction; Chapter 2 Related Existing Systems; Chapter 3 Requirements; Chapter 4 System Design; Chapter 5 Implementation; Chapter 6 Testing, Installation, and Operations; Chapter 7 Conclusions and Future Work |
| References | Numbered reference list compiled from `references.md` |
| Appendices | A Requirements Traceability Matrix; B System API Reference; C Database Reference; D Technical Architecture Atlas; E Security and Safety Case; F Scenario Design Dossier; G Testing and Verification Evidence; H Deployment and Operations Manual; I Student User Manual; J Instructor User Manual; K Maintainer Operations Manual; L Accessibility and Usability Notes; M Known Limitations and Future Work |

---

## 3. KASIT Compliance Audit

| Rule | Requirement | Status |
| --- | --- | --- |
| Page Size | A4 (21.0 × 29.7 cm) | Verified |
| Typography | Times New Roman | Verified (body + headings) |
| Body Text Size | 12 pt | Verified |
| Line Spacing | 1.5 lines | Verified |
| Alignment | Justified | Verified |
| Chapter Headings | 14 pt, centered, bold, uppercase | Verified |
| H2 Headings | 13 pt, bold, left-aligned | Verified |
| H3 Headings | 12 pt, bold, left-aligned | Verified |
| Left Margin | 3 cm | Verified |
| Top / Right / Bottom Margins | 2 cm | Verified |
| Table Captions | Above tables, numbered (e.g. Table 1.1, Table A.1) | Verified |
| Figure Captions | Below figures, numbered (e.g. Figure 4.1) | Verified |
| Page Numbers | Roman front matter, Arabic body restart, centered footer | Verified |

---

## 4. Figures Embedded (22 total, all referenced in-text)

| # | Caption | Chapter |
|---|---------|---------|
| Fig 3.1 | Parallax Use Case Model | Ch 3 |
| Fig 4.1 | Parallax System Context (C4 L1) | Ch 4 |
| Fig 4.2 | Parallax Container Architecture (C4 L2) | Ch 4 |
| Fig 4.3 | Parallax Data Flow Diagram (Level 0) | Ch 4 |
| Fig 4.4 | Parallax Core Entity-Relationship Diagram | Ch 4 |
| Fig 4.5 | Docker Network and Service Topology | Ch 4 |
| Fig 4.6 | Red-to-Blue Event Sequence | Ch 4 |
| Fig 4.7 | Authentication Sequence | Ch 4 |
| Fig 4.8 | Session Lifecycle State Machine | Ch 4 |
| Fig 4.9 | Scenario Phase State Machine | Ch 4 |
| Fig 4.10 | Deployment Architecture | Ch 4 |
| Fig 4.11 | System Component Interaction Map | Ch 4 |
| Fig 5.1 | Red Team Methodology Flow | Ch 5 |
| Fig 5.2 | Blue Team Incident Response Workflow | Ch 5 |
| Fig 5.3 | AI Tutor Safety Pipeline | Ch 5 |
| Fig 5.4 | Scoring and Debrief Generation Flow | Ch 5 |
| Fig 5.5 | Report Generation Pipeline | Ch 5 |
| Fig 5.6 | Instructor Analytics Data Flow | Ch 5 |
| Fig 6.1 | SC-01 (NovaMed) Scenario Topology | Ch 6 |
| Fig 6.2 | SC-02 (Nexora) Scenario Topology | Ch 6 |
| Fig 6.3 | SC-03 (Orion) Scenario Topology | Ch 6 |
| Fig 6.4 | SC-01 NovaMed Attack and Defense Correlation | Ch 6 |

All 22 source PNGs in `diagrams/export/png/` are embedded; `word/media/` contains 22 images.

---

## 5. Tables and Fields

- 52 styled tables embedded (chapter tables + appendix tables), each with a numbered caption.
- Word field codes inserted and updated for `TOC`, `TOC \c "Figure"`, and `TOC \c "Table"`.
- To re-update after manual edits: **Word > References > Update Table**, or re-run the compiler.

---

## 6. QA Gates

| Gate | Result |
| --- | --- |
| Placeholder text (TODO/TBD/FIXME/Lorem) | PASS — 0 hits |
| Missing-figure / missing-source markers | PASS — 0 hits |
| SC-04 / SC-05 scope leakage | PASS — Chapter 7 Future Work only |
| Leaked credentials / secrets | PASS — 0 hits (regex scan of `docs/final-report`) |
| Diagram count match | PASS — 22/22 embedded |
| All figures referenced in body text | PASS |

---

## 7. Reproduce

```powershell
# from repo root, using the backend venv (python-docx installed there)
backend\.venv\Scripts\python.exe scripts\compile_report_v3.py
```

Outputs `parallax-graduation-report.docx` and `parallax-graduation-report.pdf` into
`docs/final-report/formal-report/`. The PDF step requires Microsoft Word (COM); if Word is
unavailable, the DOCX is still produced and the TOC/LOF/LOT can be updated manually.
