# CyberSim Graduation Documentation Master Plan

Status: Draft plan for a commercial-grade graduation documentation package.
Date: 2026-05-22
Primary output: University-compliant final report, professional visual appendix, Canva presentation/poster package, and complete technical documentation pack.

## 1. Objective

Create a full software engineering documentation package for CyberSim that satisfies the University of Jordan KASIT graduation project handbook while also presenting the project at a commercial product-documentation standard.

The documentation must cover the entire CyberSim platform:

- Product vision, problem, motivation, research context, and educational value.
- Full-stack architecture: React, FastAPI, PostgreSQL, Redis, Elasticsearch, Filebeat, Docker, Nginx/Caddy, Kali, and isolated scenario targets.
- Frontend UX/UI, pages, components, workflows, accessibility, usability, and visual design.
- Backend API, WebSocket terminal proxy, scenario lifecycle, scoring, reports, instructor analytics, notes, AI hints, and SIEM.
- Database schema, relationships, migrations, persistence strategy, logs, audit activity, and data retention.
- Docker infrastructure, images, containers, volumes, networks, isolation, readiness checks, resource limits, and deployment.
- Scenario design for SC-01, SC-02, and SC-03, including red-team learning flow, blue-team detection flow, skill mapping, evidence, and scoring.
- AI monitor behavior, prompt architecture, safety rules, context redaction, validation, rate limits, fallback behavior, and educational hint design.
- Security, compliance, OWASP, NIST, MITRE ATT&CK, safe cyber training boundaries, input validation, sanitization, auth, RBAC, and threat model.
- Testing, verification, CI, performance, load testing, browser smoke tests, demo readiness, and deployment evidence.
- User manuals for students, instructors, maintainers, and demo operators.

## 2. Handbook Alignment

The KASIT handbook requires a product-based project report with front matter, seven main chapters, references, and appendices. CyberSim should follow that structure for the formal report.

Required formal report order:

1. Cover and spine.
2. Title page.
3. Abstract.
4. Acknowledgments.
5. Table of contents.
6. List of tables.
7. List of figures.
8. List of symbols and abbreviations.
9. Main body, Chapter 1 through Chapter 7.
10. References.
11. Appendices.

Handbook formatting constraints to preserve:

- A4 paper.
- Times New Roman, 12 pt for body text.
- 10 pt may be used for captions, tables, figures, footnotes, and similar secondary text.
- Chapter headings centered, bold, capital letters, maximum 14 pt.
- Sub-headings left aligned, 12 pt.
- Double spacing for body text.
- Single spacing allowed for abstract, acknowledgments, contents, lists, references, captions, tables, long quotations, and appendices.
- Margins: left 3 cm, top 2 cm, right 2 cm, bottom 2 cm.
- Page numbering: preliminary pages use lower-case Roman numerals; main text uses Arabic numerals.
- Figure captions below figures; table captions above tables.
- Figures and tables numbered by chapter, for example Figure 4.3 or Table 5.2.
- Every cited source must appear in references.

Recommended strategy:

- Produce a formal University-compliant report as the official submission.
- Produce a visual companion atlas in Canva for presentation, poster, diagram-heavy review, and examiner-friendly browsing.
- If the formal report becomes too large, split into two volumes:
  - Volume 1: Main academic report.
  - Volume 2: Technical appendices, diagrams, API references, scenario evidence, user manuals, and test evidence.

## 3. Deliverable Set

### 3.1 Formal University Report

File target:

- `docs/final-report/CyberSim_Final_Report.docx`
- `docs/final-report/CyberSim_Final_Report.pdf`

Purpose:

- Official KASIT graduation project submission.
- Strictly follows the handbook structure.
- Uses formal academic style, numbered figures/tables, references, and appendices.

### 3.2 Technical Documentation Pack

File targets:

- `docs/final-report/technical-architecture-atlas.md`
- `docs/final-report/api-reference.md`
- `docs/final-report/database-reference.md`
- `docs/final-report/deployment-and-operations-manual.md`
- `docs/final-report/security-and-safety-case.md`
- `docs/final-report/scenario-design-dossier.md`
- `docs/final-report/testing-and-verification-evidence.md`
- `docs/final-report/user-manual-student.md`
- `docs/final-report/user-manual-instructor.md`
- `docs/final-report/admin-maintainer-manual.md`

Purpose:

- Give the team, supervisor, and examiners deep technical proof.
- Keep the main report readable while preserving complete technical detail.

### 3.3 Visual Diagram Pack

File targets:

- `docs/final-report/diagrams/source/`
- `docs/final-report/diagrams/export/svg/`
- `docs/final-report/diagrams/export/png/`
- `docs/final-report/diagrams/catalog.md`

Purpose:

- Maintain every diagram as source plus export.
- Support high-resolution report insertion.
- Make diagrams reusable in Canva, defense slides, and poster.

### 3.4 Canva Package

Canva connector status checked on 2026-05-22:

- No Canva brand kits are currently available in the connected account.
- Canva brand-template search requires a paid Canva plan in this account.
- Plan should therefore use a custom University of Jordan inspired visual system and Canva free-form generated/report layouts where available.

Selected Canva direction:

- Candidate 2 was selected on 2026-05-23.
- Editable design id: `DAHKeHjt8IY`
- Edit URL: https://www.canva.com/d/HiO92F8_1b90Umj
- View URL: https://www.canva.com/d/AWvF-sEqVnIMkdU
- Title: `Report - CyberSim Project Report`
- Page count: 17

Canva deliverables:

- Defense slide deck: 18 to 25 slides.
- A0/A1 poster: problem, architecture, scenario flow, results, and demo QR codes.
- Executive visual report: 12 to 20 pages for fast examiner browsing.
- Diagram style board: color palette, typography, icons, diagram components.
- Scenario one-pagers: SC-01, SC-02, SC-03.
- Instructor/admin brochure: deployment, analytics, classroom use.

### 3.5 Evidence Bundle

File targets:

- `docs/final-report/evidence/screenshots/`
- `docs/final-report/evidence/test-output/`
- `docs/final-report/evidence/docker/`
- `docs/final-report/evidence/api/`
- `docs/final-report/evidence/browser-smoke/`

Purpose:

- Preserve empirical proof for claims in Chapter 6.
- Support defense questions with real outputs and screenshots.

## 4. Visual Identity and Layout System

### 4.1 Design Direction

The visual style should feel like a university-grade cybersecurity operations manual: formal, sharp, technical, readable, and premium.

Design principles:

- Formal report stays compliant with the handbook.
- Visual assets can use richer color, icons, and diagrams as figures.
- Avoid decorative clutter.
- Make every diagram explain a real system behavior.
- Use consistent labels, arrows, service names, and colors across all chapters.
- Keep cyber aesthetics controlled: command-line texture, grid logic, topology lines, SIEM color coding, and disciplined dark accents.

### 4.2 Color Palette

Formal report:

- Body text: black.
- Headings: black, with optional restrained dark green or gold rules in generated figures only.
- Tables: light gray header fills, black borders, no loud backgrounds.

Visual companion and Canva:

- University black: `#111111`
- University gold: `#C8A94A`
- Academic green: `#0B5D3B`
- Deep navy: `#102033`
- SIEM red/critical: `#D72638`
- Warning amber: `#F4B942`
- Success green: `#2EAD66`
- Info cyan: `#34AADC`
- Neutral surface: `#F6F7F9`
- Dark surface: `#171A21`

Usage:

- Black/gold/green for University of Jordan identity.
- Red/blue split for Red Team and Blue Team diagrams.
- Amber/cyan/green for status, readiness, and telemetry.
- Gray for background noise and neutral infrastructure.

### 4.3 Typography

Formal report:

- Times New Roman only, matching handbook requirements.
- Body: 12 pt.
- Captions/tables/footnotes: 10 pt.
- Chapter headings: 14 pt, bold, all caps, centered.

Visual companion:

- Use a clean sans-serif available in Canva such as Inter, Aptos, or Montserrat if Canva allows it.
- Keep slide titles short and large.
- Use monospace only for code/API examples.

### 4.4 Page Layout

Formal report:

- A4, left margin 3 cm, other margins 2 cm.
- Main report should use strong hierarchy through headings, numbering, captions, and whitespace, not heavy decoration.
- Chapter opener pages can include a small top rule and chapter number but must not violate font/margin rules.

Commercial visual companion:

- Use section divider spreads.
- Use full-width diagrams.
- Use callout blocks for "Design Decision", "Risk", "Evidence", "Verification", and "Educational Value".
- Use consistent figure legends.
- Use scenario color tags:
  - SC-01: healthcare teal.
  - SC-02: enterprise blue.
  - SC-03: phishing amber.

## 5. Full Report Structure

### Front Matter

Cover page:

- Project title: CyberSim: A Dual-Perspective Cybersecurity Training Platform.
- Student names and registration numbers.
- Department name.
- King Abdullah II School of Information Technology.
- The University of Jordan.
- Month and year.
- UJ logo.

Title page:

- Project title.
- Student names and registration numbers.
- Supervisor name.
- Department, school, university, submission date.

Abstract:

- 250 to 500 words.
- Problem: gap between offensive and defensive cybersecurity learning.
- Method: browser-based Docker-isolated training platform with Red Team terminal, Blue Team SIEM, scenarios, scoring, reports, and AI hints.
- Results: implemented full stack, three high-fidelity scenarios, verified local deployment, safety isolation, and demo readiness.
- Contribution: links attacker actions to defender telemetry in one educational system.

Acknowledgments:

- Supervisor, department, teammates, family, tools/libraries as appropriate.

Lists:

- Table of contents.
- List of figures.
- List of tables.
- List of symbols and abbreviations.

### Chapter 1: Introduction

Goal:

- Explain why CyberSim exists and what problem it solves.

Sections:

1.1 Background.
1.2 Motivation.
1.3 Problem statement.
1.4 Project aim.
1.5 Objectives.
1.6 Project scope.
1.7 Target users and stakeholders.
1.8 Software and hardware requirements.
1.9 Project limitations and assumptions.
1.10 Expected outputs.
1.11 Project schedule and methodology.
1.12 Report outline.

Must cover:

- University cybersecurity education needs.
- Gap between penetration testing practice and SOC visibility.
- Need for safe, isolated labs.
- Dual-perspective learning model.
- AI-assisted Socratic hints.
- Scenarios limited to SC-01, SC-02, SC-03.
- Safety boundary: no real systems, only isolated Docker containers.

Tables:

- Table 1.1 Project objectives and success criteria.
- Table 1.2 Stakeholder needs.
- Table 1.3 Project scope and out-of-scope items.
- Table 1.4 Hardware/software requirements.
- Table 1.5 Project schedule.

Figures:

- Figure 1.1 CyberSim concept overview.
- Figure 1.2 Red Team to Blue Team learning loop.
- Figure 1.3 Project scope boundary.

### Chapter 2: Related Existing Systems

Goal:

- Compare CyberSim with existing training platforms and explain its novelty.

Sections:

2.1 Cybersecurity education platforms.
2.2 Capture-the-flag platforms.
2.3 Cyber ranges.
2.4 SIEM/SOC training tools.
2.5 AI tutoring in cybersecurity education.
2.6 Limitations of existing solutions.
2.7 Proposed solution comparison.

Systems to compare:

- TryHackMe.
- Hack The Box Academy.
- PicoCTF.
- CyberDefenders.
- RangeForce.
- Immersive Labs.
- Splunk Boss of the SOC.
- Security Onion labs.
- Local Docker-based vulnerable apps such as DVWA, Juice Shop, Metasploitable.

Comparison criteria:

- Red Team realism.
- Blue Team visibility.
- Local/offline deployment.
- University classroom suitability.
- Instructor analytics.
- Scenario customization.
- AI guidance.
- Safety isolation.
- Cost and accessibility.
- Reporting and grading.

Tables:

- Table 2.1 Existing platform comparison matrix.
- Table 2.2 CyberSim feature gap analysis.
- Table 2.3 Educational methodology comparison.

Figures:

- Figure 2.1 Market/academic positioning map.
- Figure 2.2 Existing-system limitation model.

### Chapter 3: System Requirements Engineering and Analysis

Goal:

- Define what the system must do, for whom, and under what quality constraints.

Sections:

3.1 Feasibility study.
3.2 Requirement gathering methods.
3.3 Stakeholder analysis.
3.4 User profiles.
3.5 Functional requirements.
3.6 Non-functional requirements.
3.7 Security and safety requirements.
3.8 Usability and UX goals.
3.9 Educational requirements.
3.10 Scenario requirements.
3.11 Data requirements.
3.12 Compliance and ethical constraints.
3.13 Requirements traceability matrix.

User profiles:

- Student as Red Team operator.
- Student as Blue Team analyst.
- Instructor.
- System administrator.
- Demo evaluator/examiner.

Functional requirement groups:

- Authentication and profiles.
- Scenario catalog.
- Session start/end.
- ROE acknowledgment.
- Red Team terminal.
- Blue Team SIEM feed.
- Notes and guided notebook.
- Hints and AI monitor.
- Methodology tracker and gating.
- Scoring and flags.
- Debrief and report generation.
- Instructor dashboard.
- User/session management.
- Activity monitoring.
- Readiness overlay and diagnostics.
- Forensics and simulated containment.
- Deployment and demo checks.

Non-functional requirements:

- Safety and isolation.
- Performance.
- Reliability.
- Usability.
- Maintainability.
- Portability.
- Observability.
- Scalability.
- Privacy and academic integrity.
- Accessibility.

Tables:

- Table 3.1 Functional requirements.
- Table 3.2 Non-functional requirements.
- Table 3.3 User roles and permissions.
- Table 3.4 Requirements traceability matrix.
- Table 3.5 Risk analysis and mitigation.

Figures:

- Figure 3.1 Stakeholder map.
- Figure 3.2 User journey map.
- Figure 3.3 Requirements taxonomy.
- Figure 3.4 Threat and safety boundary diagram.

### Chapter 4: System Design

Goal:

- Fully describe the system architecture, data design, UI/UX design, and interaction design.

Sections:

4.1 Design overview.
4.2 Architecture style and rationale.
4.3 C4 system context diagram.
4.4 C4 container diagram.
4.5 Backend component design.
4.6 Frontend component design.
4.7 Database design.
4.8 API design.
4.9 WebSocket design.
4.10 Terminal proxy design.
4.11 SIEM pipeline design.
4.12 AI monitor design.
4.13 Scenario engine design.
4.14 Scoring and report generation design.
4.15 Instructor analytics design.
4.16 Docker infrastructure design.
4.17 Network isolation design.
4.18 Security design.
4.19 UI/UX design.
4.20 Design decisions and tradeoffs.

Required handbook diagrams:

- Context diagram.
- Data flow diagrams.
- Entity relationship diagram.
- UML use case diagram.
- UML sequence diagrams.
- UML class diagram.
- GUI design / low fidelity prototype.
- Database design.

Additional commercial-grade diagrams:

- C4 context, container, component, and selected code-level diagrams.
- Deployment diagram.
- Docker network topology.
- Docker volume map.
- Container lifecycle state machine.
- Session state machine.
- Scenario phase state machine.
- WebSocket protocol sequence.
- Auth/JWT sequence.
- AI context-redaction pipeline.
- SIEM event lifecycle.
- Terminal command lifecycle.
- Report generation lifecycle.
- Instructor analytics data flow.
- Readiness check and self-healing flow.
- Threat model trust-boundary diagram.
- Data retention flow.
- CI/CD and verification pipeline.

Tables:

- Table 4.1 Architecture decisions.
- Table 4.2 Backend module responsibilities.
- Table 4.3 Frontend page/component responsibilities.
- Table 4.4 API route catalog.
- Table 4.5 Database table catalog.
- Table 4.6 Docker services and resources.
- Table 4.7 Security controls by layer.

### Chapter 5: System Implementation

Goal:

- Explain how the design was implemented in code and infrastructure.

Sections:

5.1 Implementation overview.
5.2 Development environment.
5.3 Repository structure.
5.4 Frontend implementation.
5.5 Backend implementation.
5.6 Database implementation and migrations.
5.7 WebSocket and terminal proxy implementation.
5.8 Docker sandbox implementation.
5.9 SIEM and detection implementation.
5.10 AI monitor implementation.
5.11 Scenario implementation.
5.12 Notes, reports, and debrief implementation.
5.13 Instructor dashboard implementation.
5.14 Security controls implementation.
5.15 Deployment implementation.
5.16 Implementation challenges and resolutions.

Frontend coverage:

- React 18, Vite, Tailwind, Zustand.
- App routing and auth gating.
- Dashboard.
- Landing/onboarding/profile/settings.
- RedWorkspace.
- BlueWorkspace.
- Debrief.
- InstructorDashboard.
- Terminal components.
- SIEM components.
- Notebook components.
- Hints and methodology components.
- Workspace layout, readiness overlay, command palette, visual effects.

Backend coverage:

- FastAPI app setup.
- Auth.
- Sessions.
- WebSocket routing.
- Sandbox manager.
- Scenario loader/engine/gatekeeper.
- AI monitor, context builder, security.
- SIEM engine, routes, forensics, response.
- Notes.
- Scoring.
- Reports and learning insights.
- Instructor analytics.
- Activity service.
- Cache/Redis.
- Database and Alembic.

Infrastructure coverage:

- Root Docker Compose.
- Demo Docker Compose.
- Nginx and Caddy.
- PostgreSQL.
- Redis.
- Elasticsearch.
- Filebeat.
- Kali image.
- Scenario images and profiles.
- Volumes.
- Internal networks.
- Resource limits.
- Health checks.

Tables:

- Table 5.1 Implementation tools and versions.
- Table 5.2 Source code module map.
- Table 5.3 API implementation map.
- Table 5.4 Scenario implementation map.
- Table 5.5 Environment variables.
- Table 5.6 Docker images and containers.

Figures:

- Figure 5.1 Repository implementation map.
- Figure 5.2 Backend module dependency graph.
- Figure 5.3 Frontend component hierarchy.
- Figure 5.4 Docker service implementation map.
- Figure 5.5 Scenario container layouts.

### Chapter 6: System Testing and Installation

Goal:

- Prove the system works, document installation, and provide user manuals.

Sections:

6.1 Testing strategy.
6.2 Unit testing.
6.3 Integration testing.
6.4 End-to-end testing.
6.5 WebSocket and terminal testing.
6.6 SIEM testing.
6.7 AI safety and fallback testing.
6.8 Scenario testing.
6.9 UI/UX evaluation.
6.10 Heuristic evaluation.
6.11 Cooperative evaluation.
6.12 Performance and load testing.
6.13 Security testing.
6.14 Installation guide.
6.15 User manual.
6.16 Demo readiness and recovery.
6.17 Test results and discussion.

Testing evidence to include:

- `python -m pytest`.
- Backend coverage report.
- `npm run lint`.
- `npm run build`.
- `docker compose config --quiet`.
- `python scripts/demo_check.py --scenarios all`.
- Browser smoke tests.
- API curl tests.
- Scenario startup checks.
- Load test results from Locust CSVs.
- Elasticsearch/Filebeat health.
- Readiness endpoint output.
- Manual xterm keyboard check.

Tables:

- Table 6.1 Test plan.
- Table 6.2 Unit test results.
- Table 6.3 Integration and E2E test results.
- Table 6.4 Browser smoke test results.
- Table 6.5 Performance/load test results.
- Table 6.6 Installation troubleshooting matrix.
- Table 6.7 Usability evaluation findings.

Figures:

- Figure 6.1 Testing pyramid.
- Figure 6.2 CI/local verification flow.
- Figure 6.3 Demo readiness workflow.
- Figure 6.4 Load test result charts.

### Chapter 7: Conclusions and Future Work

Goal:

- Summarize achievements, strengths, weaknesses, lessons, and future directions.

Sections:

7.1 Project summary.
7.2 Objectives achieved.
7.3 Technical contributions.
7.4 Educational contributions.
7.5 Strengths.
7.6 Limitations.
7.7 Lessons learned.
7.8 Future work.
7.9 Final conclusion.

Future work candidates:

- More scenarios.
- Multi-class deployment.
- Kubernetes support.
- Advanced instructor grading exports.
- More SIEM rules.
- More AI debrief modes.
- Scenario randomization.
- Accessibility improvements.
- LMS integration.
- Realistic enterprise telemetry enrichment.
- Plugin ecosystem for new scenarios.

Tables:

- Table 7.1 Objectives achieved.
- Table 7.2 Limitations and mitigation.
- Table 7.3 Future work roadmap.

Figures:

- Figure 7.1 Future product evolution roadmap.

## 6. Appendix Plan

Appendix A: Anti-plagiarism declaration.
Appendix B: Full requirements specification.
Appendix C: Complete API reference.
Appendix D: Database schema and migrations.
Appendix E: Full diagram catalog.
Appendix F: Scenario dossiers.
Appendix G: AI system prompt and safety rules.
Appendix H: Docker Compose and infrastructure reference.
Appendix I: Security and threat model.
Appendix J: Test evidence.
Appendix K: User manual.
Appendix L: Instructor manual.
Appendix M: Admin and deployment manual.
Appendix N: Source code map.
Appendix O: Meeting minutes and progress reports if required.
Appendix P: Poster and defense slide thumbnails.

## 7. Diagram Master Catalog

### 7.1 Academic Required Diagrams

1. Context diagram:
   - Shows students, instructors, admin, browser, CyberSim platform, Docker host, and external AI provider.
2. DFD Level 0:
   - Browser, backend, database, Redis, SIEM, Docker sandbox.
3. DFD Level 1 - Authentication:
   - Register/login, JWT creation, protected route access.
4. DFD Level 1 - Session lifecycle:
   - Start session, provision Kali, attach scenario, persist state.
5. DFD Level 1 - Terminal and SIEM:
   - Command submission, Docker exec, logs, Filebeat, Elasticsearch, WebSocket event.
6. DFD Level 1 - AI hints:
   - Command metadata, context builder, redaction, rate limit, AI call, hint response.
7. DFD Level 1 - Reports:
   - Commands, notes, events, scores, timeline, Markdown/PDF report.
8. ERD:
   - Users, sessions, notes, command_log, siem_events, siem_triage, auto_evidence, ai_interactions, user_activity, containment_actions.
9. UML use case diagram:
   - Student, instructor, admin, AI service, Docker engine.
10. UML class diagram:
   - Backend domain classes and service modules.
11. UML sequence diagrams:
   - Login.
   - Start scenario.
   - Terminal command to SIEM alert.
   - Request AI hint.
   - Save note.
   - Submit flag.
   - Generate report.
   - Instructor exports grades.
12. GUI low-fidelity prototype:
   - Dashboard, RedWorkspace, BlueWorkspace, Debrief, InstructorDashboard.
13. Database design diagram:
   - Physical schema with primary keys, foreign keys, indexes.

### 7.2 Commercial Architecture Diagrams

1. C4 system context.
2. C4 container diagram.
3. C4 backend component diagram.
4. C4 frontend component diagram.
5. Deployment diagram.
6. Docker Compose service topology.
7. Docker network isolation diagram.
8. Docker volume and log flow diagram.
9. Kali/session container lifecycle.
10. Scenario target lifecycle.
11. Core service health and readiness diagram.
12. Local development topology.
13. Demo VPS/Caddy topology.
14. Data persistence and cache ownership diagram.
15. WebSocket frame lifecycle.
16. Redis key usage diagram.
17. Elasticsearch/Filebeat ingestion diagram.
18. Nginx/Caddy routing diagram.
19. Trust boundaries and security zones.
20. Failure modes and recovery flow.

### 7.3 Product and UX Diagrams

1. Information architecture/site map.
2. Student journey map.
3. Instructor journey map.
4. Red Team workspace anatomy.
5. Blue Team workspace anatomy.
6. Debrief page anatomy.
7. Instructor dashboard anatomy.
8. User onboarding flow.
9. Scenario selection flow.
10. Notes workflow.
11. Hint interaction flow.
12. Scoring feedback loop.
13. Usability evaluation matrix.
14. Accessibility checklist diagram.
15. UI component taxonomy.

### 7.4 Cybersecurity and Learning Diagrams

1. Dual-perspective learning loop.
2. PTES methodology mapping.
3. NIST CSF mapping.
4. MITRE ATT&CK mapping per scenario.
5. OWASP Top 10 mapping for SC-01.
6. Cyber Kill Chain mapping.
7. Red action to Blue detection causality.
8. Detection latency timeline.
9. Hint ladder model.
10. Score deduction and reward model.
11. Instructor analytics model.
12. Scenario difficulty progression.
13. Knowledge base and guidance flow.
14. Safe cyber training boundary.
15. AI refusal and safe coaching model.

### 7.5 Scenario Diagrams

SC-01 NovaMed:

- Network topology.
- Web request flow through WAF to PHP/Apache and database.
- OWASP vulnerability learning path.
- WAF/ModSecurity log flow.
- Red-to-Blue event correlation.
- Expected evidence map.

SC-02 Nexora:

- AD domain topology.
- Samba4 DC and file server layout.
- Kerberos event flow.
- User/service account relationship map.
- Lateral movement learning path.
- Defender event chain.

SC-03 Orion:

- Phishing infrastructure topology.
- GoPhish, mail relay, victim simulator flow.
- Email delivery and victim interaction sequence.
- Endpoint telemetry flow.
- Blue Team investigation path.
- Persona simulation map.

## 8. Tooling Plan

Already available in this Codex environment:

- Canva plugin: useful for presentation, poster, visual report, and design exploration.
- Documents skill: useful for DOCX creation, rendering, visual QA, page layout, tables, captions, TOC, and final PDF production.
- Presentations skill: useful for PPTX defense deck creation and slide rendering.
- Spreadsheets skill: useful for test matrices, comparison matrices, grade/export tables, and chart generation.
- Browser plugin: useful for UI screenshots, browser smoke tests, and visual verification.
- GitHub plugin: useful for repository references, issues, PRs, and release notes if needed.
- graphify skill: useful for converting the codebase/docs into a knowledge graph and discovering module relationships.

Recommended local diagram/document tools:

- Mermaid CLI for flowcharts, sequences, ERD, state diagrams, and C4-style diagrams.
- PlantUML for UML use case, class, component, deployment, and sequence diagrams.
- Graphviz for dependency graphs and knowledge graphs.
- D2 for polished architecture diagrams.
- Draw.io or diagrams.net for final manual polish where needed.
- DBML/dbdiagram-style generation for ERD exports.
- OpenAPI export from FastAPI for API reference.
- SQLAlchemy/Alembic schema extraction for database reference.
- Docker Compose config export for service topology validation.
- Locust for load testing and charts.

Plugin installation policy:

- Do not install random paid or unnecessary tools.
- Install only exact tools that are required for the documentation build.
- Prefer free/open-source tools.
- Avoid Gamma because it is paid.
- Canva can be used, but paid-only brand templates are not assumed.

## 9. Production Workflow

Phase 0: Documentation source freeze.

- Read current maintained docs.
- Read architecture state.
- Export route list.
- Export database schema.
- Export Docker Compose config.
- Capture screenshots.
- Capture test outputs.
- Gather scenario YAMLs, hint trees, playbooks, SIEM rules, AI prompt, and deployment scripts.

Phase 1: Report skeleton.

- Create DOCX template with UJ-compliant margins, page numbering, heading styles, captions, TOC fields, lists of figures/tables, and appendix styles.
- Create Markdown source outline for all chapters.
- Create references file.
- Create figure/table numbering registry.

Phase 2: Content inventory and traceability.

- Build a master matrix mapping:
  - Requirement -> feature -> source files -> tests -> screenshots -> report section -> diagram.
- Build scenario matrix.
- Build security control matrix.
- Build API route matrix.
- Build database table matrix.
- Build Docker service matrix.

Phase 3: Diagram factory.

- Generate diagrams from source where possible.
- Manually polish key visual diagrams.
- Export SVG and PNG.
- Insert diagrams into the report with proper captions.
- Reuse selected diagrams in Canva deck/poster.

Phase 4: Chapter drafting.

- Draft Chapter 1 to Chapter 7.
- Draft appendices.
- Keep formal report readable and put excessive detail in appendices.
- Every technical claim must map to source code, docs, tests, or screenshot evidence.

Phase 5: Canva and visual package.

- Build a University of Jordan inspired design system.
- Create defense deck.
- Create poster.
- Create visual executive report.
- Create scenario one-pagers.
- Keep source diagrams consistent between Word/PDF and Canva.

Phase 6: Review and QA.

- Technical review.
- Academic compliance review.
- Plagiarism and citation review.
- Diagram consistency review.
- Layout render review.
- Accessibility/readability review.
- Final PDF export.

Phase 7: Defense rehearsal package.

- Create demo script.
- Create examiner Q&A sheet.
- Create backup screenshots.
- Create risk/recovery runbook.
- Create short, medium, and long presentation versions.

## 10. Evidence Inventory Checklist

Project docs:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURES.md`
- `docs/AI_SYSTEM.md`
- `docs/SETUP.md`
- `docs/DEPLOYMENT.md`
- `docs/ROADMAP.md`
- `docs/product/PRODUCT_EVOLUTION_PLAN.md`
- `docs/scenarios/INDEX.md`
- `docs/architecture/MASTER_BLUEPRINT.md`
- `docs/architecture/CONTINUOUS_STATE.md`

Frontend source:

- `frontend/src/App.jsx`
- `frontend/src/pages/*.jsx`
- `frontend/src/components/**`
- `frontend/src/hooks/**`
- `frontend/src/store/**`
- `frontend/src/styles/v3-design.css`

Backend source:

- `backend/src/main.py`
- `backend/src/auth/**`
- `backend/src/sessions/**`
- `backend/src/ws/**`
- `backend/src/sandbox/**`
- `backend/src/scenarios/**`
- `backend/src/siem/**`
- `backend/src/ai/**`
- `backend/src/notes/**`
- `backend/src/scoring/**`
- `backend/src/reports/**`
- `backend/src/instructor/**`
- `backend/src/db/**`
- `backend/migrations/**`

Infrastructure:

- `docker-compose.yml`
- `docker-compose.demo.yml`
- `frontend/Dockerfile`
- `backend/Dockerfile`
- `infrastructure/docker/kali/Dockerfile`
- `infrastructure/docker/scenarios/**`
- `infrastructure/nginx/nginx.conf`
- `infrastructure/caddy/Caddyfile`
- `infrastructure/docker/siem/filebeat.yml`
- `.env.example`
- `.env.demo.example`

Scenario evidence:

- `docs/scenarios/SC-01-webapp-pentest.yaml`
- `docs/scenarios/SC-02-ad-compromise.yaml`
- `docs/scenarios/SC-03-phishing.yaml`
- `backend/src/scenarios/hints/sc01_hints.json`
- `backend/src/scenarios/hints/sc02_hints.json`
- `backend/src/scenarios/hints/sc03_hints.json`
- `backend/src/scenarios/playbooks/*.md`
- `backend/src/siem/rules/*.yaml`
- `backend/src/scenarios/patterns/*.json`

Testing:

- `backend/tests/**`
- `docs/testing/**`
- `docs/testing_results/*.csv`
- `scripts/demo_check.py`
- `scripts/demo-*.sh`
- `scripts/demo-local-rehearsal.ps1`

## 11. Prompt Library

Use these prompts to generate draft text. Every output must be checked against source files and evidence before insertion into the report.

### 11.1 Chapter 1 Prompt

```text
Write Chapter 1: Introduction for the CyberSim graduation project report.
Follow the University of Jordan KASIT product-based project structure.
Use a formal academic tone.
Cover background, motivation, problem statement, aim, objectives, scope, stakeholders, software/hardware requirements, limitations, expected output, schedule, and report outline.
Project facts:
- CyberSim is a dual-perspective cybersecurity training platform.
- It links Red Team terminal activity to Blue Team SIEM telemetry.
- It runs only against isolated Docker scenario containers.
- Active scenarios are SC-01 NovaMed web app pentest, SC-02 Nexora Active Directory, and SC-03 Orion phishing.
- Stack: React, Vite, Tailwind, Zustand, FastAPI, PostgreSQL, Redis, Elasticsearch, Filebeat, Docker, Nginx/Caddy, Kali, OpenRouter/AI hints.
Do not claim unsupported results.
Add table suggestions and figure references.
```

### 11.2 Chapter 2 Prompt

```text
Write Chapter 2: Related Existing Systems for CyberSim.
Compare CyberSim with CTF platforms, cyber ranges, SOC labs, and vulnerable-app labs.
Include TryHackMe, Hack The Box Academy, PicoCTF, CyberDefenders, RangeForce, Immersive Labs, Splunk Boss of the SOC, Security Onion, DVWA, Juice Shop, and Metasploitable where relevant.
Use comparison criteria: offensive realism, defensive visibility, local deployment, AI guidance, instructor analytics, reporting, cost/accessibility, classroom suitability, and safety isolation.
End with a gap analysis explaining why CyberSim combines Red Team execution, Blue Team telemetry, AI Socratic hints, reports, and instructor analytics in one university-ready platform.
```

### 11.3 Chapter 3 Prompt

```text
Write Chapter 3: System Requirements Engineering and Analysis for CyberSim.
Include feasibility, requirement gathering, target users, functional requirements, non-functional requirements, security/safety requirements, usability goals, educational requirements, scenario requirements, data requirements, and traceability.
Functional groups must include auth, scenario catalog, session lifecycle, ROE, Red Team terminal, Blue Team SIEM, notes, AI hints, methodology gating, scoring, debrief reports, instructor dashboard, readiness checks, simulated containment, forensics, and deployment checks.
Create formal requirement IDs such as FR-AUTH-01 and NFR-SEC-01.
Include a requirements traceability matrix template mapping requirement, feature, source files, tests, and report section.
```

### 11.4 Chapter 4 Prompt

```text
Write Chapter 4: System Design for CyberSim.
Use a software architecture documentation style.
Cover C4 architecture, DFDs, ERD, UML use cases, sequence diagrams, class/component diagrams, database design, API design, WebSocket protocol, terminal proxy, SIEM pipeline, AI monitor, scenario engine, scoring/reporting, instructor analytics, Docker infrastructure, network isolation, security design, and UI/UX design.
For every major subsystem, explain design rationale, responsibilities, inputs, outputs, dependencies, failure modes, and diagrams to include.
Keep exploit details educational and bounded to isolated Docker scenarios.
```

### 11.5 Chapter 5 Prompt

```text
Write Chapter 5: System Implementation for CyberSim.
Use the actual repository structure.
Explain frontend implementation, backend implementation, database/migrations, WebSockets, Docker sandboxing, SIEM, AI monitor, scenarios, notes, reports, scoring, instructor analytics, security controls, and deployment scripts.
Mention source file paths as implementation evidence.
Include implementation challenges and how they were resolved.
Do not paste large source code blocks; summarize modules and include short examples only when necessary.
```

### 11.6 Chapter 6 Prompt

```text
Write Chapter 6: System Testing and Installation for CyberSim.
Cover unit tests, integration tests, e2e tests, browser smoke tests, Docker Compose validation, frontend lint/build, backend coverage, SIEM verification, AI fallback verification, scenario readiness checks, load testing, security testing, usability evaluation, installation steps, user manual, and demo readiness.
Use actual evidence from test output files and commands.
Include test result tables and explain failures/fixes where relevant.
Add installation commands for Windows/local Docker and demo deployment.
```

### 11.7 Chapter 7 Prompt

```text
Write Chapter 7: Conclusions and Future Work for CyberSim.
Summarize the achieved objectives, technical contributions, educational contributions, strengths, limitations, lessons learned, and future work.
Future work should include additional scenarios, multi-class deployment, Kubernetes support, LMS integration, advanced SIEM content, enhanced AI debriefing, scenario randomization, accessibility improvements, and instructor grading exports.
Keep the tone honest, reflective, and professional.
```

### 11.8 Scenario Dossier Prompt

```text
Create a scenario dossier for {SCENARIO_ID} {SCENARIO_NAME}.
Include purpose, story, target audience, difficulty, duration, learning objectives, Red Team objectives, Blue Team objectives, network topology, containers, services, flags/milestones, methodology phases, expected evidence, SIEM detections, hint design, scoring rules, safety boundaries, reset behavior, and testing evidence.
Use these sources: scenario YAML, Docker files, hint JSON, SIEM rules, playbook, and tests.
Do not include real-world exploit instructions outside the isolated lab framing.
```

### 11.9 Diagram Prompt

```text
Create a {DIAGRAM_TYPE} diagram for CyberSim.
Audience: university examiners and software engineers.
Style: formal, readable, black/gold/green University of Jordan palette, with Red Team in red and Blue Team in blue.
Include only real components from the repository.
Use consistent labels for frontend, backend, PostgreSQL, Redis, Elasticsearch, Filebeat, Docker socket, Kali, SC-01, SC-02, SC-03, Nginx/Caddy, AI provider, student, instructor, and admin.
Return Mermaid or PlantUML source plus a short caption.
Caption format: Figure X.Y: concise description.
```

### 11.10 API Reference Prompt

```text
Generate an API reference section for CyberSim from the FastAPI routes.
For each endpoint include method, path, purpose, auth requirements, request body, response shape, errors, source file, and related frontend consumer.
Group endpoints by auth, scenarios, sessions, notes, scoring, reports, AI, SIEM, instructor, and playbooks.
Do not invent endpoints; use only the route list extracted from backend/src.
```

### 11.11 Database Reference Prompt

```text
Generate a database documentation section for CyberSim.
Use SQLAlchemy models and Alembic migrations as the source of truth.
For each table include purpose, columns, primary key, foreign keys, indexes, data retention concerns, related backend module, and report usage.
Explain relationships among users, sessions, notes, command_log, siem_events, siem_triage, auto_evidence, ai_interactions, user_activity, and containment_actions.
Include an ERD caption and table catalog.
```

### 11.12 Security and Compliance Prompt

```text
Write the security and compliance documentation for CyberSim.
Cover sandbox isolation, Docker internal networks, no internet access from scenario containers, JWT auth, RBAC, input validation, command scope/methodology gating, AI prompt safety, context redaction, rate limiting, secrets handling, logging boundaries, data retention, OWASP mapping, NIST mapping, MITRE ATT&CK mapping, and academic ethics.
Distinguish clearly between educational simulation and real-world offensive use.
Include a STRIDE threat model table and mitigation matrix.
```

### 11.13 UI/UX Prompt

```text
Write the UI/UX documentation for CyberSim.
Cover information architecture, page map, user journeys, RedWorkspace, BlueWorkspace, Dashboard, Debrief, InstructorDashboard, Profile, Settings, Onboarding, terminal ergonomics, SIEM triage controls, note taking, hints, methodology trail, readiness overlay, visual language, accessibility, usability goals, and evaluation methods.
Include wireframe/figure descriptions and a component responsibility table.
```

### 11.14 Testing Evidence Prompt

```text
Turn the following raw command output into a formal testing evidence section.
For each command, state purpose, environment, command, expected result, actual result, status, and interpretation.
Commands may include pytest, coverage, npm lint, npm build, docker compose config, demo_check, API curl, browser smoke, and Locust.
Do not hide failures; explain fixes or residual risk.
```

### 11.15 Canva Deck Prompt

```text
Create a professional University of Jordan styled defense presentation for CyberSim.
Audience: KASIT graduation project examiners.
Visual style: black, gold, academic green, deep navy, sharp technical diagrams, restrained cybersecurity aesthetic.
Slide count: 18 to 25.
Narrative arc:
1. Title.
2. Problem.
3. Motivation.
4. Existing systems gap.
5. CyberSim solution.
6. Architecture overview.
7. Red Team workspace.
8. Blue Team workspace.
9. Scenario SC-01.
10. Scenario SC-02.
11. Scenario SC-03.
12. AI Socratic hint system.
13. SIEM and telemetry.
14. Database and reports.
15. Instructor analytics.
16. Security and isolation.
17. Testing and verification.
18. Demo flow.
19. Results and contributions.
20. Future work.
21. Q&A.
Use clean diagrams, screenshots, and concise bullets.
```

### 11.16 Poster Prompt

```text
Design an A0/A1 academic poster for CyberSim.
Use University of Jordan inspired black/gold/green styling.
Sections: Problem, Objectives, Architecture, Scenarios, AI Guidance, Red/Blue Learning Loop, Testing Results, Contributions, Future Work, QR codes for repository/demo if available.
Use a large central architecture diagram and three scenario cards.
Keep text concise and visual hierarchy strong.
```

## 12. Quality Gates

Content gates:

- Every chapter maps to the handbook.
- Every major project subsystem appears at least once in the main report and once in the technical appendix.
- Every diagram has source, export, caption, and first reference in text.
- Every table has caption and first reference in text.
- Every requirement maps to implementation and test evidence.
- No unsupported claims.
- No real credentials in the report.
- No real exploit payloads outside safe educational descriptions.

Design gates:

- Formal report follows A4, margins, Times New Roman, heading sizes, numbering, and caption rules.
- Visual companion uses consistent palette and iconography.
- Diagrams are readable at printed size.
- Screenshots are high resolution and cropped cleanly.
- No page has overlapping text, broken tables, or blurry figures.

Verification gates:

- Render DOCX to PDF and inspect pages.
- Run spelling/grammar review.
- Check table of contents and cross-references.
- Check list of figures and list of tables.
- Check references.
- Run final command evidence collection.
- Confirm all screenshots match current application state.

## 13. Recommended Immediate Next Steps

1. Create `docs/final-report/` working directory structure.
2. Generate the formal DOCX style template.
3. Export the current FastAPI route list and database schema.
4. Generate the first diagram batch: C4 context, C4 container, DFD Level 0, ERD, Docker topology, and Red-to-Blue event sequence.
5. Capture application screenshots from the running browser.
6. Draft Chapter 1 and Chapter 3 first because they define scope and requirements.
7. Build the full traceability matrix.
8. Draft Chapter 4 and Chapter 5 from verified code/source maps.
9. Collect fresh test outputs for Chapter 6.
10. Build Canva deck/poster from finalized diagrams and screenshots.

## 14. Standing Handoff Rule

Every documentation handoff should propose the next phase before stopping. The proposal should include:

- Goal.
- Why the phase comes next.
- Acceptance criteria.
- Files to create or modify.
- Dependencies.
- Verification.
- The next likely phase after that.

Current proposed next phase lives in `docs/final-report/next-phase-proposal.md`.
