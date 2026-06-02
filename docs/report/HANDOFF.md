# PARALLAX Graduation Report — Migration Handoff

This is a prompt for the Claude Code instance that has access to the local
PARALLAX repo (`C:\Users\mmjal\Documents\JUTerminal1`) and the current PDF
(`src/imports/parallax-graduation-report.pdf` or wherever it lives in `docs/`).

Paste everything below (between the rules) as a single message to that Claude
Code. It assumes the four template files from this handoff are already saved
locally at `docs/report/`:

- `docs/report/theme.typ`
- `docs/report/components.typ`
- `docs/report/diagrams.typ`
- `docs/report/main.typ`

(Rename the `.typ.txt` files from `src/imports/typst-report/` by stripping the
`.txt` extension when you save them.)

---

# Migrate the PARALLAX graduation report to the new Typst design system

## Context

The current graduation report lives at `docs/final/parallax-graduation-report.pdf`
(or similar — search `docs/` for the most recent PDF). It is functional but
visually inconsistent: the diagrams are AI-generated and feel templated, the
typography drifts between sections, the code blocks are unreadable in print,
and the cover page does not match the rest of the PARALLAX brand identity.

A new Typst design system has been authored and is in place at `docs/report/`:

- **`theme.typ`** — global page setup, fonts (Orbitron / Inter / JetBrains Mono),
  semantic color palette (red attack, blue defense, violet AI/chapter,
  green verified, amber warning, navy ink), heading rhythm, code styling.
- **`components.typ`** — `cover()`, `chapter()`, `admonition()` (with
  `note/info/warn/danger/verified/insight` shortcuts), `fig()`, `codefile()`,
  `stat()`, `tag()`, `toc()`.
- **`diagrams.typ`** — six canonical diagrams built with `cetz`:
  `causal-loop()`, `mentor-pipeline()`, `architecture-stack()`,
  `threat-swim-lane()`, `evidence-bar(rows)`, `network-isolation()`.
- **`main.typ`** — entry point with a chapter skeleton (1 Intro, 2 Background,
  3 Architecture, 4 Threat Model, 5 Scenarios, 6 Implementation, 7 Evaluation,
  8 Discussion, 9 References, A/B Appendices).

Your job is to take the current PDF's prose, the design notes scattered in
`docs/` and the actual implementation in `frontend/` + `backend/` +
`infrastructure/`, and rebuild the report inside this new template — so the
final output is the same content (corrected, tightened, and brought up to date)
expressed in the new design language.

## Pre-flight

1. Install Typst locally if not present:
   - macOS: `brew install typst`
   - Windows: `winget install --id Typst.Typst`
   - Linux: download from <https://github.com/typst/typst/releases>
2. From `docs/report/`, run `typst compile main.typ parallax-report.pdf` and
   confirm the skeleton renders without errors. The cover, abstract, TOC, and
   chapter shells should appear with the PARALLAX branding.
3. Read the four template files end-to-end before writing any content — the
   primitives (`chapter`, `admonition`, `fig`, `codefile`, `stat`, `tag`,
   and the six diagram macros) are the only vocabulary you should use to express
   structure. Do not invent new components. If you find yourself needing
   something the template doesn't have, ADD it to `components.typ` rather than
   inlining it in `main.typ`.

## Migration phases

### Phase 1 — Content extraction (READ-ONLY)

1. Open the current PDF and extract the full text + section structure. Use
   `pdftotext -layout docs/final/parallax-graduation-report.pdf -` for plain
   text, or read it with your PDF tooling.
2. Build a map: `current section → target chapter in main.typ`. Most things
   will land naturally; flag anything that doesn't fit and propose where to
   move it. Do **not** force content into the wrong chapter.
3. Catalog every figure and diagram in the current PDF. For each, decide:
   - **Keep & redraw** — replace with the matching `diagrams.typ` macro
     (`causal-loop`, `mentor-pipeline`, `architecture-stack`,
     `threat-swim-lane`, `evidence-bar`, `network-isolation`).
   - **Adapt** — the concept is right but needs a new diagram. Add a new macro
     to `diagrams.typ` following the same visual language (thin strokes,
     palette-only colors, JetBrains Mono labels, semantic color use).
   - **Drop** — the diagram is decorative or redundant; remove it.
4. Cross-check every technical claim against the actual repo. If the report
   says "FastAPI" but `backend/` uses Flask, the **code** is the source of
   truth — fix the report. Common drift points: dependency versions, port
   numbers, scenario CIDR ranges, container names, test counts.

### Phase 2 — Content migration (chapter by chapter)

Migrate one chapter at a time. After each chapter, recompile and visually
verify before moving on.

For every chapter:

1. Read the corresponding section of the current PDF.
2. Tighten the prose. Cut throat-clearing ("In this chapter we will discuss…"),
   collapse passive voice, remove repetition. The target reader is a busy
   examiner who has read fifty of these — clarity per page is the metric.
3. Express structure with the template primitives:
   - `== Section` / `=== Subsection` for hierarchy.
   - `#fig(caption: "...")[ #diagram-name() ]` for every figure.
   - `#codefile(name: "path/to/file.ext", lang: "ext")[ \`\`\`ext ... \`\`\` ]`
     for code samples. Inline code uses single backticks.
   - `#stat("value", "label", color: c-...)` for numbers in the evaluation
     chapter (grid them 3-wide).
   - `#tag("LABEL", color: c-...)` for MITRE techniques, tech badges,
     difficulty levels.
   - Admonitions: `#note[…]` `#info[…]` `#warn[…]` `#danger[…]`
     `#verified[…]` `#insight[…]`. Use sparingly — one or two per chapter,
     never as decoration.
4. Re-cite every external reference into `refs.bib` (BibTeX) so
   `#bibliography("refs.bib", style: "ieee")` resolves them. If references are
   currently inline ("Smith 2023"), find the original source and add a proper
   entry.
5. Run `typst compile main.typ`. Fix any errors before moving on — Typst
   errors are usually informative and localized.

### Phase 3 — Diagram pass

After all chapters are migrated:

1. Review every figure in the rendered PDF. Each diagram must:
   - Use only palette colors (`c-red`, `c-blue`, `c-violet`, `c-green`,
     `c-amber`, `c-navy`, `c-slate`). No raw hex codes inline.
   - Use mono labels (`font: font-mono`) for technical identifiers
     (component names, technique IDs, CIDR ranges).
   - Have a numbered caption beneath in slate italic.
   - Sit inside a 0.5pt slate frame (handled by `#fig`).
2. For any new diagram added during migration, document the macro at the top
   of `diagrams.typ` with a 2-line comment explaining its intent and a usage
   example.

### Phase 4 — Polish pass

1. **Typography audit:** scan every page for orphans, widows, awkward line
   breaks. Fix with `~` (non-breaking space) or by tightening the surrounding
   sentence.
2. **Consistency audit:** product names (PARALLAX vs Parallax vs parallax),
   capitalization of section names (SIEM not Siem), code spans for every
   filename / command / identifier.
3. **Cross-references:** every "see Chapter X" or "as shown in Figure Y.Z"
   must use Typst references (`@chap-arch`, `@fig-loop`), not hard-coded
   numbers. Add `<chap-arch>` labels to chapter calls and `<fig-loop>` labels
   to `#fig` calls as needed (modify `components.typ` to accept an optional
   `label` parameter on `chapter` and `fig`).
4. **Accessibility:** verify the PDF passes `pdftotext` cleanly (no garbled
   text), set document metadata via `#set document(title: ..., author: ...)`
   at the top of `main.typ`.
5. **Print check:** export the final PDF, view at 100% on a 24" monitor, then
   print page 1, 3 (a chapter opener), 7 (a diagram-heavy page), and the back
   cover. Walk the print at arm's length — if anything is illegible, fix it.

## Constraints (do not violate)

- **Do not** edit the report by changing `theme.typ` colors or fonts. The
  design system is intentional. If a chapter feels wrong, the prose is wrong.
- **Do not** import or include the old PDF's images or diagrams as raster.
  Every figure is either a `diagrams.typ` macro, a freshly rendered SVG
  exported from the code (architecture/flow), or a screenshot of the actual
  running UI (use `frontend/` in dev mode).
- **Do not** use Tailwind-style ad-hoc colors. Use `c-*` tokens only.
- **Do not** ship a report that fails to compile. CI: add a GitHub Action
  that runs `typst compile docs/report/main.typ /tmp/out.pdf` on every PR
  touching `docs/`.

## Verification protocol

Before considering the migration done, the following must all be true:

- [ ] `typst compile docs/report/main.typ docs/report/parallax-report.pdf`
  exits 0 with no warnings.
- [ ] Page count is within ±20% of the current PDF (significant deviation
  means content was lost or padded — investigate).
- [ ] Every chapter in the current PDF is represented (or the migration log
  explains why it was dropped).
- [ ] Every numeric claim in the report matches the current repo state
  (run `pytest -q` and compare the count; check `lighthouse` JSON in
  `docs/evidence/` for the latest scores).
- [ ] All six canonical diagrams are used at least once, in their intended
  chapters.
- [ ] No raster diagrams remain.
- [ ] The references compile and resolve.
- [ ] The new PDF prints cleanly on A4.

## Deliverables

1. `docs/report/parallax-report.pdf` — the rendered report.
2. `docs/report/main.typ` and any new chapter files under `docs/report/chapters/`
   (if split out).
3. `docs/report/refs.bib` — the bibliography.
4. `docs/report/MIGRATION_LOG.md` — short notes on what was changed, what was
   dropped, what was added, and any decisions you made that the authors should
   review.
5. A single commit:
   `docs(report): migrate to PARALLAX design system; redraw all diagrams`
6. The corresponding PR description should link to the rendered PDF in the
   artifacts and call out any places where you altered a technical claim to
   match the current code (those deserve author review).

## When in doubt

- If the current PDF says one thing and the code says another, **the code
  wins** and the report is updated to match.
- If a diagram looks busy, remove elements until it's calm; the design system
  prefers air over information density.
- If a chapter feels weak, flag it in `MIGRATION_LOG.md` rather than
  inventing content. The authors will write it.

Report back when phases 1–4 are complete with: page count, number of diagrams
redrawn, number of technical claims corrected, and any open questions.

---

That's the prompt. Save the four template files, save this `HANDOFF.md`, then
paste the section between the rules into the other Claude Code instance.
