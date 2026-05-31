# Diagram Catalog â€” Parallax Final Report

> **Updated 2026-05-31 (WS9):** All 22 diagrams re-rendered with updated Parallax dark theme.

This catalog registers all 22 architecture diagrams for the Parallax graduation report.

## Rendering Setup

| Item | Value |
| --- | --- |
| Mermaid CLI | `@mermaid-js/mermaid-cli` v11.15.0 (npx cache) |
| Render Script | `scripts/render-diagrams.ps1` |
| Theme config | `docs/final-report/diagrams/mermaid-theme.json` |
| PNG Resolution | 2400 px width, scale 2.5 (high-DPI print quality) |
| SVG export path | `docs/final-report/diagrams/export/svg/` (22 files) |
| PNG export path | `docs/final-report/diagrams/export/png/` (22 files) |
| Last rendered | 2026-05-31 â€” all 22/22 OK |

## Parallax Dark Theme Palette (WS9 update)

- **Background**: `#0A0F1C` (void navy)
- **Primary fill**: `#0D1423` with `#EAF1FB` text
- **Cyan accent**: `#00F0FF` (borders, lines)
- **Gold accent**: `#C8A94A` (secondary nodes, notes)
- **Green highlight**: `#1FA268` (success states)
- **Font**: Rajdhani / Segoe UI

---

## Original Diagrams (Redesigned)

| # | Figure | Title | Source MMD | PNG | Chapter |
|---|--------|-------|-----------|-----|---------|
| 1 | Fig 4.1 | Parallax System Context (C4 L1) | `c4-context.mmd` | `c4-context.png` | Ch 4 |
| 2 | Fig 4.2 | Parallax Container Architecture (C4 L2) | `c4-container.mmd` | `c4-container.png` | Ch 4 |
| 3 | Fig 4.3 | Data Flow Diagram Level 0 | `dfd-level-0.mmd` | `dfd-level-0.png` | Ch 4 |
| 4 | Fig 4.4 | Core Entity-Relationship Diagram | `erd-core-schema.mmd` | `erd-core-schema.png` | Ch 4, Appendix |
| 5 | Fig 4.5 | Docker Network & Service Topology | `docker-topology.mmd` | `docker-topology.png` | Ch 4 |
| 6 | Fig 4.6 | Red-to-Blue Event Sequence | `red-blue-event-sequence.mmd` | `red-blue-event-sequence.png` | Ch 4 |
| 7 | Fig 4.7 | UML Use Case Diagram (Full) | `uml-use-case.mmd` | `uml-use-case.png` | Ch 3 |
| 8 | Fig 4.8 | Authentication Sequence | `auth-sequence.mmd` | `auth-sequence.png` | Ch 5 |
| 9 | Fig 4.9 | Session Lifecycle State Machine | `session-lifecycle-state.mmd` | `session-lifecycle-state.png` | Ch 4 |
| 10 | Fig 4.10 | Scenario Phase State Machine | `scenario-phase-state-machine.mmd` | `scenario-phase-state-machine.png` | Ch 4 |
| 11 | Fig 5.1 | AI Safety Pipeline | `ai-safety-pipeline.mmd` | `ai-safety-pipeline.png` | Ch 5 |
| 12 | Fig 5.2 | Report Generation Pipeline | `report-generation-pipeline.mmd` | `report-generation-pipeline.png` | Ch 5 |
| 13 | Fig 5.3 | Instructor Analytics Flow | `instructor-analytics-flow.mmd` | `instructor-analytics-flow.png` | Ch 5 |
| 14 | Fig 5.4 | SC-01 NovaMed Scenario Topology | `sc01-topology.mmd` | `sc01-topology.png` | Ch 5 |
| 15 | Fig 5.5 | SC-02 Nexora Scenario Topology | `sc02-topology.mmd` | `sc02-topology.png` | Ch 5 |
| 16 | Fig 5.6 | SC-03 Orion Scenario Topology | `sc03-topology.mmd` | `sc03-topology.png` | Ch 5 |

---

## New Diagrams Added (Phase 9A)

| # | Figure | Title | Source MMD | PNG | Chapter |
|---|--------|-------|-----------|-----|---------|
| 17 | Fig 4.11 | Deployment Architecture | `deployment-architecture.mmd` | `deployment-architecture.png` | Ch 4 |
| 18 | Fig 5.7 | Red Team Methodology Flow | `red-team-methodology-flow.mmd` | `red-team-methodology-flow.png` | Ch 5 |
| 19 | Fig 5.8 | Blue Team IR Workflow | `blue-team-ir-workflow.mmd` | `blue-team-ir-workflow.png` | Ch 5 |
| 20 | Fig 5.9 | Scoring and Debrief Flow | `scoring-and-debrief-flow.mmd` | `scoring-and-debrief-flow.png` | Ch 5 |
| 21 | Fig 5.10 | SC-01 NovaMed Attack+Defense Flow | `scenario-sc01-flow.mmd` | `scenario-sc01-flow.png` | Ch 6 |
| 22 | Fig 5.11 | System Component Interaction | `system-component-interaction.mmd` | `system-component-interaction.png` | Ch 4 |

---

## Total: 22 Diagrams (6 New + 16 Redesigned)

| Diagram Type | Count |
|---|---|
| Architecture / C4 | 3 (context, container, deployment) |
| Data Flow | 2 (DFD level 0, instructor analytics) |
| Entity-Relationship | 1 (ERD with 11 tables) |
| Sequence | 3 (auth, red-blue event, report pipeline) |
| State Machine | 2 (session lifecycle, scenario phases) |
| Use Case | 1 (full use case: 4 actors, 28 use cases) |
| Network Topology | 4 (Docker, SC-01, SC-02, SC-03) |
| Process Flow | 6 (DFD, AI pipeline, red methodology, blue IR, scoring, SC-01 attack+defense) |

---

## Render Command

```powershell
# Render all diagrams
.\scripts\render-diagrams.ps1

# Render single diagram
.\scripts\render-diagrams.ps1 -Only "c4-context"

# PNG only (skip SVG for speed)
.\scripts\render-diagrams.ps1 -SkipSvg

# Higher resolution
.\scripts\render-diagrams.ps1 -Width 3200 -Height 2000 -Scale 3.0
```

---

## Quality Specifications

| Setting | Value | Rationale |
|---------|-------|-----------|
| PNG Width | 2400 px | Sufficient for A4 print at 200 DPI |
| PNG Height | 1600 px | Landscape-aspect headroom |
| Scale factor | 2.5 | 2x Retina-quality rendering |
| Font | Segoe UI / Arial | Fallback sans-serif for all OS |
| Background | White (#FFFFFF) | KASIT print compliance |
| Primary theme | Parallax brand (inline init) | Consistent with report brand |
