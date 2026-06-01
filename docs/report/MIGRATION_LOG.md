# MIGRATION LOG — PARALLAX Report → Typst Design System

Tracks the migration of the PARALLAX graduation report from the DOCX/PDF package
(`docs/final-report/formal-report/parallax-graduation-report.pdf`, 137 pp.) into the
new Typst design system at `docs/report/`. Records the section map, figure
dispositions, **every technical claim corrected against the code**, and open
questions for the authors (Mahmoud Allabadi, Rashed Alkurdi).

> **Source of truth:** the running code in `backend/`, `frontend/`, `infrastructure/`,
> `docker-compose.yml`, and `backend/tests/`. Where the old report (or the template's
> placeholder prose) disagreed with the code, the **code wins** and the claim was rewritten.

---

## Phase 0 — Template install + toolchain (done)

- Installed the five handoff files into `docs/report/` (`.typ.txt` → `.typ`), plus `HANDOFF.md`.
- Installed Typst **0.14.2** (winget).
- Fonts: Typst 0.14.2 does **not** support variable fonts, so static weight instances of
  **Inter** (400/500/600/700), **Orbitron** (700/800/900), and **JetBrains Mono** (400/500/600/700)
  are vendored in `docs/report/fonts/` (SIL OFL, redistributable). Build with `--font-path fonts`.
- **Template compile fixes** (Typst 0.14 / cetz API drift — *not* design changes):
  - `components.typ` `toc()`: removed the `fill:` argument from `outline()` (moved to
    `outline.entry` in Typst 0.12+; the default entry fill is already a dotted leader).
  - `components.typ` `chapter()`: guarded `int(num)` so appendix letters ("A","B") don't crash;
    added optional `label:` parameter for cross-references.
  - `components.typ` `fig()`: added optional `label:` parameter for cross-references.
  - `theme.typ` header: guarded the `query(... level 1 ...).last()` against the empty array
    on front-matter pages (before Chapter 1). Visual design unchanged.
  - `diagrams.typ`: pinned **cetz 0.3.4** (the authored 0.3.1 has a `bezier` coordinate-resolution
    panic; 0.3.2+ fixes it). Replaced one unsupported side-keyed `stroke: (left: …)` on a cetz
    `rect` in `mentor-pipeline()` with a uniform fill + a thin filled left accent bar.
- Skeleton compiles clean (exit 0). Remaining warnings are benign: cross-platform font-fallback
  names (`Helvetica Neue`, `SF Mono`, `Menlo`, generic `monospace`/`sans-serif`) absent on Windows
  but present on macOS, and one `layout did not converge` notice from the introspective running header.

---

## Section map: current report → new template

The current package has a 7-chapter KASIT structure + 13 appendices. The Typst template uses a
tighter 9-chapter structure. Mapping:

| Current (DOCX) | New (Typst `main.typ`) |
| --- | --- |
| Abstract | Cover / Abstract block |
| Ch 1 Introduction | Chapter 01 — Introduction |
| Ch 2 Related Existing Systems | Chapter 02 — Background and Related Work |
| Ch 3 Requirements (FR/NFR, use cases) | **Folded into Chapter 03 — Architecture** (opening "Requirements" sections + use-case figure) |
| Ch 4 System Design | Chapter 03 — Architecture (design body) + Chapter 06 — Implementation (module detail) |
| Ch 4 §Security & Safety + Appendix E | Chapter 04 — Threat Model |
| Ch 4 §Scenario Design + Ch 5 §Scenario Impl | Chapter 05 — Scenarios |
| Ch 5 Implementation | Chapter 06 — Implementation |
| Ch 6 Testing/Installation/Operations | Chapter 07 — Evaluation + Appendix B (reproduce) |
| Ch 7 Conclusions & Future Work | Chapter 08 — Discussion |
| References | Chapter 09 — References (`refs.bib`, IEEE) |
| Appendix (repo layout) | Appendix A — Repository layout |
| Ch 6 readiness/install steps | Appendix B — Reproduce the evaluation |

### Decisions on content that did not map 1:1

- **Requirements chapter (no dedicated slot in the 9-chapter template).** Folded the functional /
  non-functional requirements and the use-case model into the opening of **Chapter 03 (Architecture)**,
  since the architecture is the response to those requirements. Nothing dropped.
- **The 13 DOCX technical appendices** (API reference, DB reference, architecture atlas, security case,
  scenario dossier, testing evidence, deployment manual, student/instructor/maintainer manuals,
  accessibility notes, limitations) are **not** all reproduced inside the Typst report — that document
  is intentionally tighter ("clarity per page; air over density"). The Typst report keeps **Appendix A**
  (repo layout) and **Appendix B** (reproduce the evaluation), and points readers to the full technical
  reference set under `docs/final-report/`. The DOCX package remains the exhaustive reference.

---

## Figure catalog and disposition

The DOCX embedded 22 Mermaid-rendered raster PNGs. The Typst report draws **only** vector cetz
macros (no raster). Mapping of concepts:

| DOCX figure (concept) | Disposition | Typst |
| --- | --- | --- |
| C4 context / container; component interaction | **Adapt → redraw** | `architecture-stack()` (Ch 03) |
| Red-to-Blue event sequence | **Keep & redraw** | `causal-loop()` (Ch 03) — Suricata node corrected (see below) |
| Docker topology / deployment / network isolation | **Keep & redraw** | `network-isolation()` (Ch 03) |
| Use case model | **Adapt → new macro** | `use-case()` (Ch 03) |
| Session lifecycle / scenario phase state machines | **Adapt → new macro** | `phase-ladder()` (Ch 05) |
| AI safety pipeline / mentor request flow | **Keep & redraw** | `mentor-pipeline()` (Ch 04) — stages + token cap corrected |
| Threat / trust boundaries | **Keep & redraw** | `threat-swim-lane()` (Ch 04) |
| Red methodology / Blue IR / scoring / report / instructor analytics flows | **Adapt / drop** | Folded into prose + `evidence-bar()`; per-flow PNGs dropped as redundant |
| Test results / latency | **Keep & redraw** | `evidence-bar()` + `stat()` tiles (Ch 07) |
| DFD level 0; ERD (11 tables) | **Drop from main report** | Described in prose; full ERD remains in `docs/final-report/` |
| SC-01/02/03 topology PNGs | **Adapt** | `network-isolation()` + scenario prose (Ch 05) |

All six canonical macros are used at least once. Two new macros (`use-case`, `phase-ladder`) were
added to `diagrams.typ` in the same visual language (thin strokes, palette tokens, mono labels).

---

## Technical claims CORRECTED to match the code  ⚑ (author review)

These are the places where the template's placeholder prose or the old report drifted from the
actual implementation. **Code won in every case.**

1. **AI model.** Template said "DeepSeek via OpenRouter". Code: `OPENROUTER_MODEL` defaults to
   **`google/gemini-2.0-flash-001`** (`docker-compose.yml:129`); the model is env-configurable and
   OpenAI-compatible. Report now says "an OpenRouter-hosted model (default `google/gemini-2.0-flash-001`)".
2. **Mentor token cap.** Template said "≤150 token response". Code (`backend/src/ai/monitor.py:307-309`):
   the cap is **mode-dependent — 300 (learn) / 400 (procedural) / `OPENROUTER_MAX_TOKENS` default 500**.
   Debrief coaching uses 150–800 (`debrief_coach.py`). Corrected in prose and in `mentor-pipeline()`.
3. **Telemetry stack — no Suricata.** Template's `causal-loop`, `architecture-stack`, and latency
   budget all named **Suricata**. There is **no Suricata service** in `docker-compose.yml`. Real
   detection/telemetry: **ModSecurity (owasp/modsecurity-crs WAF, SC-01)** + container/app logs
   (Apache, Samba) shipped by **Filebeat 8.13.2** into **Elasticsearch 8.13.2**, plus the backend's
   own SIEM event engine (`backend/src/siem/`). Suricata appears only as a *named log source inside
   simulated SIEM event fixtures*, not as a deployed sensor. All three diagrams corrected.
4. **Python version.** Template said Python 3.12. `backend/Dockerfile`: **`python:3.11-slim`**.
5. **Frontend dependencies.** Template's `package.json` excerpt was stale. Real (`frontend/package.json`):
   React **18.3.1**, Vite **5.2**, **framer-motion 12.40** (not 11), **`xterm` 5.3** + addons (not the
   scoped `@xterm/xterm` 5.5), Zustand 4.5.2, react-router-dom 6.23, **three.js 0.169** (3-D background —
   omitted by the template), Lenis 1.3, axios, jspdf (client-side PDF export), lucide-react, tailwindcss 3.4.
6. **Backend stack specifics.** FastAPI **0.111.0**, Uvicorn 0.29, SQLAlchemy **2.0.30 (async)** + asyncpg +
   Alembic, Redis **5.0.4**, python-jose JWT + passlib/bcrypt. (Confirmed `backend/requirements.txt`.)
7. **Mentor guardrail tests.** Template cited `tests/mentor/test_guardrails.py` and "47 known-malicious
   prompts" — **neither exists**. Real coverage: `backend/tests/ai/test_credential_redaction.py` and
   `backend/tests/ai/test_response_sanitization.py` (18 cases) exercise `security.redact_text()` and
   `security.sanitize_tutor_response()`. Corrected the `#verified` admonition in Chapter 04.
8. **Test count.** **359 tests collected**; per the latest run (CONTINUOUS_STATE 2026-05-31, WS10)
   **358 pass / 1 skip**. Report states "358 passing (359 collected, 1 skipped)".
9. **Ports.** Frontend host **3000 → 80**, backend host **8001 → 8000**, Nginx 80, Elasticsearch 9200,
   Postgres/Redis bound to 127.0.0.1. (Confirmed `docker-compose.yml`.)
10. **Scenario networks (template was CORRECT — verified).** SC-01 NovaMed `172.20.1.0/24`,
    SC-02 Nexora `172.20.2.0/24`, SC-03 Orion `172.20.3.0/24`, all `internal: true`; core net `172.30.0.0/24`.
11. **Scenario targets (verified, refined).** SC-01: Apache vuln app + PHP + **MariaDB 11** behind a
    **ModSecurity** WAF. SC-02: **Samba AD DC** (`nexora.local`) + member fileserver. SC-03: **GoPhish** +
    **Postfix** mail relay + Python victim simulator. Lab-only passwords in the compose file are **not**
    reproduced in the report (safety).
12. **Lighthouse.** Perf **91** / a11y **100** — evidence `docs/final-report/evidence/lighthouse-landing.json`
    (WS10). Matches the template figures.

---

## Open questions / flagged for authors

- **`~8s` scenario reset.** Documented in `CLAUDE.md` ("docker-compose down && up … ~8s") but not
  independently benchmarked in this migration. Stated as an approximate, documented figure. *Confirm with
  a wall-clock measurement before final submission.* `// TODO: confirm reset benchmark`.
- **Latency budget per-stage numbers** (`evidence-bar` in Ch 07) originate from the template and are
  illustrative; the aggregate "<2 s attack→SIEM" is the supported claim. *Flagged — replace per-stage
  values with measured numbers if a benchmark exists, otherwise present only the aggregate.*
- **Student IDs on the cover** (`2221558`, `0221992`) carried from the template — confirm they are correct.
- The DOCX `debrief_coach` "OpenRouter/DeepSeek" comment is stale in the source code too (it uses
  `OPENROUTER_MODEL`). Not a report issue; noted for the authors. *Not fixed — documentation task only.*

---

## Expansion pass (2026-06-01, requested) — full depth restored

The first migration was deliberately tight (25 pp). On request, the report was
expanded to carry the full depth of the 137-page package, expressed in the design
system:

- **Restructured** into per-chapter files under `chapters/*.typ` (each re-imports
  the design modules); `main.typ` is now a shell (front matter + `#include`s +
  bibliography) and adds a **List of Abbreviations**.
- **8 new diagram macros** added to `diagrams.typ` (total ~16): a `seq-diagram`
  helper, `auth-sequence`, `red-blue-sequence`, `session-lifecycle`, `dfd-level0`,
  `erd-core`, `report-pipeline`, `instructor-analytics`, and a parametric
  `sc-topology` (used for SC-01/02/03). Still **zero raster** figures.
- **Folded in the full technical reference** as Appendices A–F: repository layout,
  reproduce-the-evaluation, **full API surface** (~60 endpoints / 13 groups),
  **full database schema** (all 10 tables with columns), **requirements
  traceability** (FR + NFR), and **deployment & operations** (prereqs, env vars,
  Caddy production). Chapters 3–7 expanded with requirements tables, STRIDE,
  isolation guarantees, scenario topologies + MITRE techniques + scoring model,
  load/latency evidence, and demo-readiness output.
- **Result: 45 pp**, compiles exit 0, all drift terms still absent, all corrected
  claims present, ~31 figures/tables. Additional corrections folded in from the
  source docs (code wins): `CONTAINER_CPU_LIMIT` default **1.0** (deployment doc
  said 0.5) and `OPENROUTER_MODEL` default **google/gemini-2.0-flash-001**
  (deployment doc said deepseek-chat-v3); testing-evidence figures reconciled to
  the latest run (358/359, 971 frontend modules) rather than the stale 78/544.

## Final status (initial migration — superseded by the expansion above)

**Build:** `typst compile --font-path fonts main.typ parallax-report.pdf` → exit 0.

- **Pages: 25** (initial tight migration; now 45 after the expansion pass). This is a **deliberate** reduction, not lost content,
  and therefore exceeds the ±20% guard. The 137-page package was inflated by 13 exhaustive
  technical appendices, 22 full-page raster diagrams, and large reference tables. Per the design
  brief ("clarity per page; air over density; do not pad"), the Typst report is a tight primary
  document: every chapter and section of the old report is represented (see the section map),
  diagrams are compact vector macros instead of full-page rasters, and the exhaustive technical
  manuals remain available in `docs/final-report/`. No section was dropped silently. **Flagged for
  author awareness:** if KASIT requires a minimum page count, fold selected `docs/final-report/`
  manuals back in as appendices C+.
- **Diagrams: 8 vector macros, 0 raster.** Six canonical (`causal-loop`, `mentor-pipeline`,
  `architecture-stack`, `threat-swim-lane`, `evidence-bar`, `network-isolation`) all used at least
  once; two added (`use-case`, `phase-ladder`). 13 `#fig` blocks total (8 diagrams + 5 tables).
- **Citations:** all external references resolve through `refs.bib` (IEEE). No inline "Smith 2023".
- **Cross-references:** chapter/figure references in prose use stable names rather than Typst `@`
  refs. The template renders chapter headings via manual counter updates inside `chapter()`, which
  makes `@`-refs to those headings fragile; `label:` parameters were added to `chapter()`/`fig()`
  for future use, but prose references were kept name-based for reliability. *Deliberate.*
- **Document metadata** set via `#set document(title, author, date)`.
- **CI:** `.github/workflows/report.yml` compiles the report (with `--font-path docs/report/fonts`)
  on PRs touching `docs/report/**` and uploads the PDF artifact.

**Remaining warnings (benign, documented):**
- `unknown font family` for `Helvetica Neue` / `SF Mono` / `Menlo` / generic `monospace` /
  `sans-serif` — these are the cross-platform *fallbacks* in the theme's font stacks; the primary
  Inter / Orbitron / JetBrains Mono all resolve from `fonts/`. The theme font stacks were left
  unedited per the hard constraint.
- One `layout did not converge within 5 attempts` from the introspective running header
  (`query(heading…)` + page counter). Output is correct (headers, TOC, figure numbers all render);
  resolving it would require editing the theme header, which the constraints forbid.

**Build instructions (for the authors):**
```
cd docs/report
typst compile --font-path fonts main.typ parallax-report.pdf
# live preview:
typst watch --font-path fonts main.typ
```
