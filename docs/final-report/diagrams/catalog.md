# Diagram Catalog

This catalog registers the architecture diagrams for the CyberSim final report. SVG exports are for the formal report and PNG exports are for Canva, screenshots, and quick review.

## Rendering Setup

| Item | Value |
| --- | --- |
| Mermaid CLI | `npx --yes @mermaid-js/mermaid-cli` |
| Verified version | `11.15.0` |
| Theme config | `mermaid-theme.json` |
| SVG export path | `docs/final-report/diagrams/export/svg/` |
| PNG export path | `docs/final-report/diagrams/export/png/` |
| Background | White for print and Canva readability |

## Figure Register

| Figure | Title | Source | SVG export | PNG export | Target |
| --- | --- | --- | --- | --- | --- |
| Figure 4.1 | CyberSim System Context | `source/c4-context.mmd` | `export/svg/c4-context.svg` | `export/png/c4-context.png` | Chapter 4, Canva page 3 |
| Figure 4.2 | CyberSim Container Architecture | `source/c4-container.mmd` | `export/svg/c4-container.svg` | `export/png/c4-container.png` | Chapter 4, Canva page 4 |
| Figure 4.3 | CyberSim DFD Level 0 | `source/dfd-level-0.mmd` | `export/svg/dfd-level-0.svg` | `export/png/dfd-level-0.png` | Chapter 4 |
| Figure 4.4 | CyberSim Core ERD | `source/erd-core-schema.mmd` | `export/svg/erd-core-schema.svg` | `export/png/erd-core-schema.png` | Chapter 4, Appendix D, Canva page 11 |
| Figure 4.5 | Docker Network and Service Topology | `source/docker-topology.mmd` | `export/svg/docker-topology.svg` | `export/png/docker-topology.png` | Chapter 4, Chapter 5, Canva page 12 |
| Figure 4.6 | Red-to-Blue Event Sequence | `source/red-blue-event-sequence.mmd` | `export/svg/red-blue-event-sequence.svg` | `export/png/red-blue-event-sequence.png` | Chapter 4, Chapter 6 |
| Figure 4.7 | UML Use Case Diagram | `source/uml-use-case.mmd` | `export/svg/uml-use-case.svg` | `export/png/uml-use-case.png` | Chapter 4 |
| Figure 4.8 | Authentication Sequence | `source/auth-sequence.mmd` | `export/svg/auth-sequence.svg` | `export/png/auth-sequence.png` | Chapter 4, Chapter 5 |
| Figure 4.9 | Session Lifecycle State Machine | `source/session-lifecycle-state.mmd` | `export/svg/session-lifecycle-state.svg` | `export/png/session-lifecycle-state.png` | Chapter 4 |
| Figure 4.10 | Scenario Phase State Machine | `source/scenario-phase-state-machine.mmd` | `export/svg/scenario-phase-state-machine.svg` | `export/png/scenario-phase-state-machine.png` | Chapter 4, Chapter 6 |
| Figure 5.1 | AI Safety Pipeline | `source/ai-safety-pipeline.mmd` | `export/svg/ai-safety-pipeline.svg` | `export/png/ai-safety-pipeline.png` | Chapter 5 |
| Figure 5.2 | Report Generation Pipeline | `source/report-generation-pipeline.mmd` | `export/svg/report-generation-pipeline.svg` | `export/png/report-generation-pipeline.png` | Chapter 5 |
| Figure 5.3 | Instructor Analytics Data Flow | `source/instructor-analytics-flow.mmd` | `export/svg/instructor-analytics-flow.svg` | `export/png/instructor-analytics-flow.png` | Chapter 5, Canva page 13 |
| Figure 5.4 | SC-01 Scenario Topology | `source/sc01-topology.mmd` | `export/svg/sc01-topology.svg` | `export/png/sc01-topology.png` | Appendix E |
| Figure 5.5 | SC-02 Scenario Topology | `source/sc02-topology.mmd` | `export/svg/sc02-topology.svg` | `export/png/sc02-topology.png` | Appendix E |
| Figure 5.6 | SC-03 Scenario Topology | `source/sc03-topology.mmd` | `export/svg/sc03-topology.svg` | `export/png/sc03-topology.png` | Appendix E |

## Render Verification

| Export | Count | Verification |
| --- | --- | --- |
| SVG | 16 | Files exist under `export/svg/` and contain rendered `<svg>` output. |
| PNG | 16 | Files exist under `export/png/` and load as valid PNG images. |

PNG dimensions after themed export:

| File | Width | Height |
| --- | ---: | ---: |
| `ai-safety-pipeline.png` | 1156 | 1808 |
| `auth-sequence.png` | 1568 | 1042 |
| `c4-container.png` | 1568 | 1076 |
| `c4-context.png` | 1568 | 774 |
| `dfd-level-0.png` | 1568 | 404 |
| `docker-topology.png` | 1568 | 1112 |
| `erd-core-schema.png` | 1568 | 920 |
| `instructor-analytics-flow.png` | 1528 | 1232 |
| `red-blue-event-sequence.png` | 1568 | 400 |
| `report-generation-pipeline.png` | 1568 | 458 |
| `sc01-topology.png` | 1276 | 1040 |
| `sc02-topology.png` | 984 | 1040 |
| `sc03-topology.png` | 1058 | 1088 |
| `scenario-phase-state-machine.png` | 1456 | 1912 |
| `session-lifecycle-state.png` | 748 | 1752 |
| `uml-use-case.png` | 1002 | 2312 |


## Export Command

```powershell
$sources = Get-ChildItem -LiteralPath 'docs/final-report/diagrams/source' -Filter '*.mmd'
foreach ($src in $sources) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($src.Name)
  npx --yes @mermaid-js/mermaid-cli -c 'docs/final-report/diagrams/mermaid-theme.json' -i $src.FullName -o (Join-Path 'docs/final-report/diagrams/export/svg' ($name + '.svg')) -b white
  npx --yes @mermaid-js/mermaid-cli -c 'docs/final-report/diagrams/mermaid-theme.json' -i $src.FullName -o (Join-Path 'docs/final-report/diagrams/export/png' ($name + '.png')) -b white -s 2
}
```

## Next Diagram Batch

The next formal diagram batch should add:

- UML use case diagram.
- Authentication sequence diagram.
- Session lifecycle state machine.
- Scenario phase state machine.
- AI safety pipeline.
- Report generation pipeline.
- Instructor analytics data flow.
- SC-01, SC-02, and SC-03 scenario topology diagrams.
