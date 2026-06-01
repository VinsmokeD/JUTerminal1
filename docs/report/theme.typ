// ============================================================================
// PARALLAX — Technical Documentation Theme
// Single source of truth for colors, type, spacing, and page setup.
// Import with: #import "theme.typ": *
// ============================================================================

// ---------- Palette (semantic, not decorative) -------------------------------
#let c-red     = rgb("#FF6B7A")  // attack, offensive, danger
#let c-blue    = rgb("#4CC2FF")  // defense, telemetry, info
#let c-violet  = rgb("#9B7DFF")  // chapter marks, AI/mentor, section labels
#let c-green   = rgb("#3DD68C")  // passing tests, verified, success
#let c-amber   = rgb("#F4B740")  // warnings, deprecations
#let c-navy    = rgb("#0A0E17")  // headings, strong body emphasis
#let c-ink     = rgb("#1A1F2E")  // body text
#let c-slate   = rgb("#5B6679")  // captions, metadata, secondary
#let c-rule    = rgb("#E4E7EF")  // hairlines, spine rule
#let c-tint    = rgb("#FAFBFD")  // admonition background
#let c-code-bg = rgb("#F4F6FB")  // code background
#let c-paper   = rgb("#FFFFFF")  // page background

// ---------- Type stack -------------------------------------------------------
// Body is Inter. Display is Orbitron (chapter heads ONLY). Mono is JetBrains Mono.
// Fallbacks chosen for systems that don't have these installed.
#let font-body    = ("Inter", "Helvetica Neue", "Arial", "sans-serif")
#let font-display = ("Orbitron", "Inter", "Helvetica Neue", "sans-serif")
#let font-mono    = ("JetBrains Mono", "SF Mono", "Menlo", "monospace")

// ---------- Page geometry ----------------------------------------------------
// A4, asymmetric margins so the spine side has room for the rule + chapter dots.
#let page-setup(body) = {
  set page(
    paper: "a4",
    margin: (top: 22mm, bottom: 24mm, inside: 28mm, outside: 25mm),
    header-ascent: 12mm,
    footer-descent: 14mm,
    fill: c-paper,
    header: context {
      let pg = counter(page).get().first()
      if pg <= 1 { return none }
      let right-side = calc.even(pg)
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(8pt, font: font-mono, fill: c-slate, tracking: 0.12em)[PARALLAX · TECHNICAL DOCUMENTATION],
        text(8pt, font: font-body, fill: c-slate)[
          #context {
            // Guard: front-matter pages precede the first chapter heading.
            let hs = query(heading.where(level: 1).before(here()))
            if hs.len() > 0 { hs.last().body }
          }
        ]
      )
      v(4pt)
      line(length: 100%, stroke: 0.5pt + c-rule)
    },
    footer: context {
      let pg = counter(page).get().first()
      grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        text(7pt, font: font-mono, fill: c-slate, tracking: 0.12em)[v1.0.0-rc1],
        text(9pt, font: font-body, fill: c-navy)[#pg],
        text(7pt, font: font-mono, fill: c-slate, tracking: 0.12em)[PARALLAX]
      )
    }
  )
  body
}

// ---------- Base text + paragraph rhythm -------------------------------------
// 8pt baseline grid. Body 10.5pt / 16pt leading = 2 baseline units per line.
#let base-text(body) = {
  set text(
    font: font-body,
    size: 10.5pt,
    fill: c-ink,
    lang: "en",
    hyphenate: true,
  )
  set par(
    leading: 0.65em,        // ~16pt at 10.5pt
    spacing: 0.85em,        // ~9pt paragraph gap
    justify: true,
    first-line-indent: 0pt,
  )
  body
}

// ---------- Heading styles ---------------------------------------------------
// H1 = chapter (Orbitron 32pt). H2 = section (Inter 18pt). H3 = subsection.
#let headings(body) = {
  // H1 is rendered via chapter-opener(); this is fallback only.
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    block(spacing: 0pt, {
      text(font: font-mono, size: 9pt, fill: c-violet, tracking: 0.18em)[
        CHAPTER #counter(heading).display()
      ]
      v(6pt)
      text(font: font-display, size: 32pt, fill: c-navy, weight: 800)[#it.body]
      v(8pt)
      line(length: 60%, stroke: 0.5pt + c-rule)
      v(18pt)
    })
  }
  show heading.where(level: 2): it => {
    block(spacing: 0pt, above: 28pt, below: 12pt, {
      text(font: font-body, size: 18pt, fill: c-navy, weight: 700)[#it.body]
    })
  }
  show heading.where(level: 3): it => {
    block(spacing: 0pt, above: 18pt, below: 6pt, {
      text(font: font-body, size: 13pt, fill: c-ink, weight: 600)[#it.body]
    })
  }
  body
}

// ---------- Inline + block code ----------------------------------------------
#let code-styles(body) = {
  show raw.where(block: false): it => {
    box(
      fill: c-code-bg,
      inset: (x: 4pt, y: 1pt),
      outset: (y: 2pt),
      radius: 2pt,
      text(font: font-mono, size: 9.5pt, fill: c-ink, it.text)
    )
  }
  show raw.where(block: true): it => {
    block(
      width: 100%,
      fill: c-code-bg,
      stroke: (left: 3pt + c-violet),
      inset: 12pt,
      radius: (right: 2pt),
      text(font: font-mono, size: 9.5pt, fill: c-ink, it.text)
    )
  }
  body
}

// ---------- Links + emphasis -------------------------------------------------
#let inline-styles(body) = {
  show link: it => text(fill: c-violet, weight: 500, it)
  show strong: it => text(fill: c-navy, weight: 700, it.body)
  show emph: it => text(style: "italic", it.body)
  body
}

// ---------- Master apply ------------------------------------------------------
// Wrap your whole document with: #show: parallax-theme
#let parallax-theme(body) = {
  show: page-setup
  show: base-text
  show: headings
  show: code-styles
  show: inline-styles
  body
}
