# CyberSim Final Report Workspace

This folder is the production workspace for the CyberSim graduation documentation package. It turns the master documentation plan into concrete report sources, diagram sources, references, and visual-design guidance.

## Selected Canva Direction

Candidate 2 was selected and converted into an editable Canva design.

| Item | Value |
| --- | --- |
| Canva design id | `DAHKeHjt8IY` |
| Title | `Report - CyberSim Project Report` |
| Pages | 17 |
| Edit URL | https://www.canva.com/d/HiO92F8_1b90Umj |
| View URL | https://www.canva.com/d/AWvF-sEqVnIMkdU |

Use the Canva design as the visual companion direction, not as the official formal report. The official report must still follow the KASIT handbook formatting rules.

## Documentation Outputs

| Output | Purpose | Status |
| --- | --- | --- |
| Formal report DOCX/PDF | University-compliant submission document | Planned |
| Canva visual report | Examiner-friendly visual companion | Selected design created |
| Defense deck | Presentation for final defense | Planned |
| Academic poster | Poster submission and demo-day display | Planned |
| Technical architecture atlas | Commercial-grade diagram and architecture reference | Started |
| API reference | Backend route documentation | Started |
| Database reference | Schema and data lifecycle documentation | Started |
| Requirements matrix | Requirements, implementation, tests, and evidence mapping | Started |
| Diagram catalog | Source, export, and caption registry for figures | Six diagrams rendered |
| Evidence bundle | Test output, screenshots, Docker/API evidence | Started |
| Canva rewrite brief | Page-by-page CyberSim replacement plan for the selected Canva design | Started |
| Tooling and skill log | Record of useful MCP, plugin, and skill usage | Started |
| Documentation master prompt pack | Detailed context, phase prompts, tool plans, and remaining-roadmap prompts | Added |
| Scenario dossiers | SC-01, SC-02, and SC-03 report-safe scenario summaries | Drafted |
| Student and instructor manuals | User-facing workflow documentation | Drafted |
| Maintainer operations manual | Installation, readiness, recovery, and evidence guidance | Drafted |

## Folder Map

```text
docs/final-report/
+-- README.md
+-- design-and-canva-direction.md
+-- report-production-checklist.md
+-- requirements-traceability-matrix.md
+-- technical-architecture-atlas.md
+-- api-reference.md
+-- database-reference.md
+-- references.md
+-- canva-page-rewrite-brief.md
+-- documentation-master-prompt-pack.md
+-- tooling-and-skill-usage.md
+-- evidence/
+|   +-- README.md
+|   +-- source-inventory.md
+|   +-- screenshots/
+|   +-- test-output/
+-- chapters/
|   +-- chapter-01-introduction.md
|   +-- chapter-03-requirements.md
|   +-- chapter-04-system-design.md
|   +-- chapter-05-implementation.md
|   +-- chapter-06-testing-and-installation.md
+-- scenarios/
|   +-- sc-01-novamed-dossier.md
|   +-- sc-02-nexora-dossier.md
|   +-- sc-03-orion-dossier.md
+-- user-manuals/
|   +-- student-manual.md
|   +-- instructor-manual.md
|   +-- maintainer-operations-manual.md
+-- diagrams/
    +-- catalog.md
    +-- mermaid-theme.json
    +-- source/
        +-- c4-context.mmd
        +-- c4-container.mmd
        +-- dfd-level-0.mmd
        +-- erd-core-schema.mmd
        +-- docker-topology.mmd
        +-- red-blue-event-sequence.mmd
    +-- export/
        +-- svg/
        +-- png/
```

## Formal Report Rule

The formal report should remain conservative and handbook-compliant:

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
