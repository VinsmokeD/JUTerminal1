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

## Render Verification

| Export | Count | Verification |
| --- | --- | --- |
| SVG | 6 | Files exist under `export/svg/` and contain rendered `<svg>` output. |
| PNG | 6 | Files exist under `export/png/` and load as valid PNG images. |

PNG dimensions after themed export:

| File | Width | Height |
| --- | ---: | ---: |
| `c4-container.png` | 1568 | 1076 |
| `c4-context.png` | 1568 | 774 |
| `dfd-level-0.png` | 1568 | 404 |
| `docker-topology.png` | 1568 | 1112 |
| `erd-core-schema.png` | 1568 | 920 |
| `red-blue-event-sequence.png` | 1568 | 400 |

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
