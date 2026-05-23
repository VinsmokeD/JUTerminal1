# Tooling and Skill Usage Log

This file records which newly available plugins, MCP tools, and skills were useful for the CyberSim documentation pass. It is intentionally practical: tools are listed only when they shaped the documentation work or produced evidence.

## Tools Used In This Pass

| Tool or Skill | How it was used | Documentation result |
| --- | --- | --- |
| Canva connector | Confirmed the selected report design `DAHKeHjt8IY`, page count, A4 dimensions, current edit/view URLs, and placeholder text. | Added a Canva rewrite brief so the visual report can be converted from generic business content into CyberSim-specific report pages. |
| Repomix | Packed the main source areas with `npx repomix@latest --compress` into `.tmp/final-report/repomix-cybersim.xml`. | Created a source inventory evidence record with file count, token count, and documentation ownership notes. |
| Node REPL MCP | Checked available Node packages and confirmed Playwright availability while Mermaid was not bundled. | Selected `npx @mermaid-js/mermaid-cli` as the rendering path rather than assuming local Mermaid support. |
| Mermaid CLI | Rendered six Mermaid sources into SVG and PNG exports. | Produced print and Canva-ready diagrams under `docs/final-report/diagrams/export/`. |
| Academic paper skill | Applied report structure discipline: claim support, citation traceability, chapter architecture, and final-review expectations. | Strengthened Chapter 4, reference planning, and production checklist expectations. |
| Academic paper reviewer skill | Used as a documentation QA rubric: evidence-based claims, reviewer-style weaknesses, traceability, and actionability. | Added clearer evidence and review requirements for the final documentation bundle. |
| Canvas design skill | Applied a visual philosophy approach to the Canva companion and diagram package. | Added a page rewrite brief and reinforced the "visual companion, formal report remains handbook-compliant" split. |
| Color expert skill | Used to keep the CyberSim palette role-based and print-friendly. | Added a Mermaid theme file using black, gold, green, navy, red, cyan, amber, and neutral surfaces. |
| Hand-drawn diagrams skill | Used for diagram routing discipline and validation thinking. | Kept Mermaid as the formal vector source for report figures; reserved Excalidraw for later explanatory sketches if needed. |
| Verification-before-completion skill | Applied evidence-before-claim rules. | Added fresh verification commands and kept unrun tests separate from completed checks. |

## Tools Not Used In This Pass

| Tool | Reason |
| --- | --- |
| GitHub connector | No issue, PR, or CI workflow was required for this local documentation pass. |
| Multi-agent spawning | The user asked to use useful tools, but not to delegate work to subagents. The current phase was cohesive and did not need separate agents. |
| Browser automation | No live application screenshots were captured in this pass. Screenshot capture is proposed for the next phase. |
| Skill Seekers skill builder | Existing skills were already installed and verified; creating a new skill from the project would add overhead before the documentation source package is stable. |
| Image generation | Current deliverables needed verified architecture diagrams and Canva layout guidance, not generated raster artwork. |

## Reuse Rule

For later documentation phases, use tools in this order:

1. Local project evidence first: source files, tests, Docker config, screenshots.
2. Canva connector for visual report and presentation content.
3. Mermaid or Excalidraw for diagrams depending on whether the target is formal or explanatory.
4. Official external sources only for standards, frameworks, and technologies.
5. Academic reviewer style checks before finalizing chapters.

