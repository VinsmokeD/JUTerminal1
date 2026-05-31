# Design and Canva Direction

## Selected Direction

The selected Canva candidate is the editable visual report:

- Design id: `DAHKeHjt8IY`
- Edit URL: https://www.canva.com/d/8CmCA-8Y41Ms9ML
- View URL: https://www.canva.com/d/pfQr_4wjgUjRfJs
- Page count: 17

This design should be treated as the visual companion style for Parallax. It should influence the deck, poster, scenario one-pagers, and visual executive report. The official Word/PDF submission should preserve the KASIT handbook layout and use the richer visual style only inside figures, diagrams, and visual appendices.

## Canva Audit Notes

The selected Canva design has the right visual direction, but its text still includes generic business content. Replace all placeholder financial labels, fake metric values, generic contact details, and repeated `Your Text` fields before using it in the defense package.

The page-by-page replacement source is `canva-page-rewrite-brief.md`. Use that file as the control document when editing Canva so the visual report stays aligned with verified Parallax content.

## Visual Identity

Parallax documentation should feel like a university-grade cybersecurity operations manual:

- Formal enough for an academic committee.
- Technical enough for software engineers.
- Visual enough for examiners to understand a large system quickly.
- Safe and ethical in how it describes cybersecurity content.

## Palette

| Role | Color | Use |
| --- | --- | --- |
| University black | `#111111` | Titles, cover blocks, high-contrast sections |
| University gold | `#C8A94A` | Rules, section numbers, highlights |
| Academic green | `#0B5D3B` | University identity, success states, headings in visual assets |
| Deep navy | `#102033` | Technical backgrounds and architecture bands |
| Red Team red | `#D72638` | Red Team flow, attack-side events, critical alerts |
| Blue Team cyan | `#34AADC` | Blue Team flow, SIEM, detection, analysis |
| Warning amber | `#F4B942` | Warnings, risk, readiness degraded |
| Success green | `#2EAD66` | Healthy checks, completed milestones |
| Neutral surface | `#F6F7F9` | Light report panels and table backgrounds |
| Dark surface | `#171A21` | Visual companion panels and screenshots |

## Typography

Formal report:

- Times New Roman only.
- Body: 12 pt.
- Captions and tables: 10 pt.
- Chapter headings: 14 pt, bold, all caps, centered.

Canva and presentation assets:

- Preferred title font: Montserrat, Aptos Display, or Inter.
- Preferred body font: Inter, Aptos, or Open Sans.
- Code/API snippets: a monospace font such as JetBrains Mono or Consolas.

## Canva Page Adaptation Plan

The selected Canva design should be revised into the following sections:

| Page | Target Content | Visual Direction |
| --- | --- | --- |
| 1 | Cover: Parallax, UJ/KASIT, team/supervisor/date | Black/gold/green title treatment |
| 2 | Project problem and motivation | Split red/blue learning-gap graphic |
| 3 | Proposed solution | Dual-perspective platform overview |
| 4 | Full-stack architecture | C4 container diagram |
| 5 | Red Team workspace | Screenshot plus terminal workflow callouts |
| 6 | Blue Team workspace | Screenshot plus SIEM/triage callouts |
| 7 | Scenario SC-01 | NovaMed network and learning objectives |
| 8 | Scenario SC-02 | Nexora AD topology and detection goals |
| 9 | Scenario SC-03 | Orion phishing flow and SOC analysis |
| 10 | AI Socratic monitor | Context, redaction, rate limit, hint ladder |
| 11 | Database and reports | ERD excerpt plus debrief/report pipeline |
| 12 | Docker isolation | Network topology and safety boundary |
| 13 | Instructor analytics | Dashboard metrics and grading exports |
| 14 | Testing evidence | Test pyramid and verification badges |
| 15 | Security and compliance | OWASP/NIST/MITRE/sandbox controls |
| 16 | Contributions and results | Achievements and project value |
| 17 | Future work and Q&A | Roadmap and closing slide/report page |

## Current Export Assets

| Asset | Path | Use |
| --- | --- | --- |
| C4 context | `diagrams/export/png/c4-context.png` | Canva page 3 or overview slide |
| C4 container | `diagrams/export/png/c4-container.png` | Canva page 4 |
| DFD Level 0 | `diagrams/export/png/dfd-level-0.png` | Architecture appendix or data flow callout |
| ERD | `diagrams/export/png/erd-core-schema.png` | Canva page 11 |
| Docker topology | `diagrams/export/png/docker-topology.png` | Canva page 12 |
| Red-to-Blue sequence | `diagrams/export/png/red-blue-event-sequence.png` | Learning loop or testing evidence page |

## Diagram Style Rules

- Keep diagram labels identical to repository service names where possible.
- Use red for student offensive actions and blue/cyan for defender analysis.
- Use green/gold only for academic identity and success states.
- Use gray for background noise, infrastructure, and neutral storage.
- Keep arrows directional and label every cross-boundary data flow.
- Place captions below figures in the formal report.
- Export diagrams as SVG for print and PNG for Canva when needed.

## Screenshot Rules

- Capture screenshots from the current application, not from old reports.
- Remove or blur real tokens, `.env` values, and user passwords.
- Prefer full-page screenshots for page anatomy and cropped screenshots for feature callouts.
- Use consistent browser size for all UI screenshots.
