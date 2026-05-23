# Canva Page Rewrite Brief

The selected Canva report currently has a strong visual direction but still contains generic business language, financial chart placeholders, and sample contact details. This brief is the source plan for replacing that content with verified CyberSim material.

## Current Canva Design

| Field | Value |
| --- | --- |
| Design id | `DAHKeHjt8IY` |
| Title | `Report - CyberSim Project Report` |
| Pages | 17 |
| Page size | A4, 794 x 1123 px per page from Canva page inventory |
| Current edit URL | https://www.canva.com/d/8CmCA-8Y41Ms9ML |
| Current view URL | https://www.canva.com/d/pfQr_4wjgUjRfJs |

## Replacement Rules

- Remove all generic labels such as `Your Text`, `US$ M`, `YOY change`, and fake business target numbers.
- Remove sample contact content such as `hello@reallygreatsite.com`, `www.reallygreatsite.com`, and `123-456-7890`.
- Do not publish real API keys, passwords, tokens, or full scenario secrets.
- Use CyberSim's active scope only: SC-01, SC-02, and SC-03.
- Every visual claim must map to a local source, an exported diagram, a screenshot, or an official reference.
- Keep the Canva pages visual and concise. The formal report carries the long prose.

## Page-by-Page Rewrite Plan

| Page | New title | Core content | Visual asset |
| --- | --- | --- | --- |
| 1 | CyberSim Graduation Project Report | University of Jordan, KASIT, project title, team, supervisor, May 2026. | UJ-inspired black, green, and gold cover treatment. |
| 2 | The Training Gap | Students often learn offense and defense separately; CyberSim links one student action to one defensive signal. | Split Red Team / Blue Team learning gap graphic. |
| 3 | Proposed Solution | Browser-based dual workspace with Docker-isolated scenarios, terminal, SIEM, notes, scoring, and AI hints. | Figure 4.1 context diagram or simplified overview. |
| 4 | System Architecture | React frontend, FastAPI backend, PostgreSQL, Redis, Elasticsearch, Filebeat, Docker scenario networks. | `diagrams/export/png/c4-container.png`. |
| 5 | Red Team Workspace | Kali-style terminal, methodology gating, notes, output insights, scoped scenario execution. | Red workspace screenshot plus terminal callouts. |
| 6 | Blue Team Workspace | Live SIEM feed, triage, forensic targets, containment actions, reporting workflow. | Blue workspace screenshot plus SIEM callouts. |
| 7 | SC-01 NovaMed | Web application training scenario with WAF, web app, PHP/service layer, database, and OWASP-oriented learning. | SC-01 topology diagram or Docker slice. |
| 8 | SC-02 Nexora | Active Directory style training scenario with domain controller, file server, Kerberos events, and analyst detections. | SC-02 topology diagram or detection flow. |
| 9 | SC-03 Orion | Phishing and initial-access simulation with mail relay, GoPhish, victim simulator, and SOC analysis. | SC-03 topology diagram or campaign flow. |
| 10 | Socratic AI Guidance | Command-submission trigger, bounded context, redaction, fallback hints, rate limits, hint levels. | AI safety pipeline diagram. |
| 11 | Data and Reports | Users, sessions, notes, commands, SIEM events, triage, AI interactions, activity, containment, debriefs. | `diagrams/export/png/erd-core-schema.png`. |
| 12 | Docker Isolation | Single-node deployment, internal scenario networks, no internet path from scenario containers, resource limits. | `diagrams/export/png/docker-topology.png`. |
| 13 | Instructor Analytics | Session monitoring, class metrics, AI usage, activity, grade export, live inspection. | Instructor dashboard screenshot. |
| 14 | Verification Evidence | Pytest, lint, build, Compose config, demo readiness, browser smoke, screenshots. | Evidence checklist and status badges. |
| 15 | Security and Compliance | OWASP WSTG, MITRE ATT&CK mapping, NIST CSF alignment, sandbox ethics, safe reporting. | Compliance matrix graphic. |
| 16 | Project Results | Completed MVP scope, three scenarios, Red/Blue loop, reports, instructor view, AI guidance, deployment readiness. | Metrics panel based on verified test evidence only. |
| 17 | Future Work | More scenario depth, classroom analytics, packaged deployment, documentation export, and final defense assets. | Roadmap strip and closing Q&A. |

## Canva Replacement Prompts

Use these prompts when updating page copy or generating Canva text blocks.

### Cover Prompt

Write a concise academic cover for a University of Jordan KASIT graduation project report titled CyberSim. Include project type, team/supervisor placeholders, May 2026, and no marketing language.

### Architecture Page Prompt

Rewrite this page into a visual architecture summary for CyberSim. Mention React/Vite, FastAPI, PostgreSQL, Redis, Elasticsearch, Filebeat, Docker, and internal scenario networks. Keep text under 120 words and leave space for a diagram.

### Scenario Page Prompt

Rewrite this page as a one-page scenario card for [SCENARIO]. Include learning objective, target services, Red Team task, Blue Team task, telemetry, safety boundary, and evidence collected. Do not reveal solution commands or flags.

### AI Page Prompt

Rewrite this page about the Socratic AI monitor. Emphasize bounded prompts, command-level triggers, redaction, fallback behavior, rate limits, and educational hints. Do not imply the AI provides exploit steps.

### Evidence Page Prompt

Rewrite this page as a verification evidence summary. Use only results captured in the evidence bundle. Do not invent satisfaction rates, costs, financial metrics, or user numbers.

