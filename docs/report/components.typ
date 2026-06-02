// ============================================================================
// PARALLAX — Reusable Document Components
// Chapter openers, admonitions, figures, tables, cover.
// Import with: #import "components.typ": *
// ============================================================================

#import "theme.typ": *

// Figure numbering state. `_chap` holds the current chapter label as it should
// PRINT ("3", "A"); `_fig` is the per-chapter figure counter, reset by chapter().
// (Replaces an earlier get()+update() pattern inside `context`, which produced
// identical numbers on every figure and caused layout non-convergence.)
#let _chap = state("px-chap", "0")
#let _fig  = counter("px-fig")

// ---------- Chapter opener ---------------------------------------------------
// Use INSTEAD of "= Heading". Renders the violet label + Orbitron title block.
// Usage:
//   #chapter(num: "03", title: "Architecture", lead: "This chapter describes…")
#let chapter(num: "01", title: "", lead: "", label: none) = {
  pagebreak(weak: true)
  // Manually update the level-1 heading counter so headers/TOC stay in sync.
  // Appendices use letter nums ("A", "B") — only numeric chapters drive the counter.
  let numeric = num.match(regex("^[0-9]+$")) != none
  if numeric {
    counter(heading).update(int(num))
  }
  // Record how this chapter's figures should be prefixed ("3", "A") and reset
  // the per-chapter figure counter so numbering restarts at 1 each chapter.
  _chap.update(if numeric { str(int(num)) } else { num })
  _fig.update(0)
  // Invisible H1 anchor so the running header picks up the title.
  heading(level: 1, outlined: true, bookmarked: true, title)
  // Optional reference target so prose can use @label instead of hard numbers.
  if label != none { [#metadata(num) #label] }

  // Visible block (replaces the default H1 render)
  block(spacing: 0pt, {
    text(font: font-mono, size: 10pt, fill: c-violet, tracking: 0.22em, weight: 500)[
      CHAPTER #num
    ]
    v(10pt)
    text(font: font-display, size: 34pt, fill: c-navy, weight: 800, tracking: -0.01em, hyphenate: false)[#title]
    v(14pt)
    line(length: 100%, stroke: 0.5pt + c-rule)
    v(16pt)
    if lead != "" {
      text(size: 12pt, fill: c-slate, style: "italic")[#lead]
      v(18pt)
    }
  })
}

// ---------- Admonitions ------------------------------------------------------
// Single component, color-keyed. 3pt left bar, no other border.
//   #admonition(kind: "note", title: "On naming")[body…]
//   #note[…]  #info[…]  #warn[…]  #danger[…]  #verified[…]
#let admonition(kind: "note", title: none, body) = {
  let palette = (
    note:     (c-slate,  "NOTE"),
    info:     (c-blue,   "INFO"),
    warn:     (c-amber,  "WARNING"),
    danger:   (c-red,    "DANGER"),
    verified: (c-green,  "VERIFIED"),
    insight:  (c-violet, "INSIGHT"),
  )
  let (accent, label) = palette.at(kind)
  block(
    width: 100%,
    fill: c-tint,
    stroke: (left: 3pt + accent),
    inset: 14pt,
    spacing: 12pt,
    {
      text(font: font-mono, size: 8.5pt, fill: accent, tracking: 0.2em, weight: 500)[
        #label#if title != none [ · #upper(title)]
      ]
      v(8pt)
      body
    }
  )
}

#let note(body)     = admonition(kind: "note",     body)
#let info(body)     = admonition(kind: "info",     body)
#let warn(body)     = admonition(kind: "warn",     body)
#let danger(body)   = admonition(kind: "danger",   body)
#let verified(body) = admonition(kind: "verified", body)
#let insight(body)  = admonition(kind: "insight",  body)

// ---------- Figure with caption ----------------------------------------------
// Use instead of #figure for consistent framing.
//   #fig(caption: "Causal loop between attacker and defender")[
//     #image("diagrams/loop.svg", width: 90%)
//   ]
#let fig(caption: "", label: none, body) = {
  align(center, {
    block(stroke: 0.5pt + c-rule, inset: 8pt, body)
    v(6pt)
    // Step the per-chapter figure counter, then display "Figure <chap> · <n>".
    _fig.step()
    text(font: font-body, size: 8.5pt, fill: c-slate, style: "italic")[
      #context [Figure #_chap.get() · #_fig.display() — #caption]
    ]
    // Optional reference target so prose can use @fig-key.
    if label != none { [#metadata("figure") #label] }
  })
}

// ---------- Code block with filename -----------------------------------------
//   #codefile(name: "docker-compose.yml", lang: "yaml")[
//     ```yaml
//     services:
//       red:
//         image: parallax/kali
//     ```
//   ]
#let codefile(name: "", lang: "", body) = {
  let lang-accent = (
    sh: c-red, bash: c-red, shell: c-red,
    py: c-violet, python: c-violet,
    yaml: c-blue, yml: c-blue, json: c-blue, toml: c-blue,
    js: c-amber, ts: c-amber, tsx: c-amber, jsx: c-amber,
    sql: c-green,
    "": c-slate,
  ).at(lang, default: c-slate)
  block(spacing: 0pt, {
    if name != "" {
      block(
        fill: lang-accent.lighten(85%),
        inset: (x: 10pt, y: 4pt),
        radius: (top-left: 2pt, top-right: 2pt),
        text(font: font-mono, size: 8pt, fill: lang-accent, weight: 600)[#name]
      )
    }
    block(
      width: 100%,
      fill: c-code-bg,
      stroke: (left: 3pt + lang-accent),
      inset: 12pt,
      radius: (bottom-right: 2pt, top-right: if name == "" { 2pt } else { 0pt }),
      body
    )
  })
}

// ---------- Stat tile (for evidence chapter) ---------------------------------
//   #grid(columns: 3, gutter: 12pt,
//     stat("358", "Tests passing", c-green),
//     stat("<2s",  "Attack→SIEM latency", c-violet),
//     stat("100%", "Network isolation", c-green))
#let stat(value, label, color: c-navy) = {
  block(
    width: 100%,
    fill: c-tint,
    stroke: 0.5pt + c-rule,
    inset: 16pt,
    radius: 2pt,
    {
      text(font: font-display, size: 36pt, fill: color, weight: 800, tracking: -0.02em)[#value]
      v(4pt)
      text(font: font-mono, size: 8.5pt, fill: c-slate, tracking: 0.18em, weight: 500)[
        #upper(label)
      ]
    }
  )
}

// ---------- Inline tags (for MITRE techniques, tech badges) ------------------
//   #tag("T1190", color: c-red)  #tag("Suricata", color: c-blue)
#let tag(label, color: c-slate) = box(
  fill: color.lighten(88%),
  stroke: 0.5pt + color,
  inset: (x: 6pt, y: 2pt),
  outset: (y: 1pt),
  radius: 2pt,
  text(font: font-mono, size: 8pt, fill: color, weight: 600, tracking: 0.08em)[#label]
)

// ---------- Cover page -------------------------------------------------------
//   #cover(
//     title: "PARALLAX",
//     subtitle: "A Dual-Perspective Cybersecurity Training Platform",
//     authors: (("Mahmoud Allabadi", "2221558"), ("Rashed Alkurdi", "0221992")),
//     institution: "University of Jordan · KASIT",
//     date: "May 2026",
//     version: "v1.0.0-rc1",
//   )
#let cover(
  title: "",
  subtitle: "",
  authors: (),
  institution: "",
  date: "",
  version: "",
  mark: none,        // optional image() for ParallaxMark
) = {
  page(
    margin: (top: 40mm, bottom: 30mm, x: 30mm),
    header: none,
    footer: none,
    {
      align(center, {
        if mark != none { mark; v(28pt) }
        // Keep the product name on one line (no mid-word hyphenation of "PARALLAX").
        text(font: font-display, size: 64pt, fill: c-navy, weight: 800, tracking: 0.06em, hyphenate: false)[#title]
        v(10pt)
        line(length: 80pt, stroke: 1pt + c-violet)
        v(20pt)
        text(font: font-body, size: 16pt, fill: c-slate, weight: 400)[#subtitle]
        v(1fr)
        block(width: 80%, {
          for (name, id) in authors {
            grid(
              columns: (1fr, auto),
              align: (left, right),
              text(font: font-body, size: 11pt, fill: c-navy, weight: 600)[#name],
              text(font: font-mono, size: 10pt, fill: c-slate)[#id]
            )
            v(4pt)
          }
        })
        v(24pt)
        text(font: font-body, size: 11pt, fill: c-navy)[#institution]
        v(8pt)
        text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.2em)[
          #upper(date) · #version
        ]
      })
    }
  )
}

// ---------- TOC --------------------------------------------------------------
#let toc() = {
  page({
    text(font: font-mono, size: 10pt, fill: c-violet, tracking: 0.22em, weight: 500)[
      CONTENTS
    ]
    v(8pt)
    line(length: 100%, stroke: 0.5pt + c-rule)
    v(20pt)
    // Typst 0.14: `fill` moved from `outline` to `outline.entry`.
    // The default entry fill is already a dotted leader, matching the
    // original design intent. `indent` accepts a length in 0.14.
    outline(
      title: none,
      indent: 16pt,
      depth: 2,
    )
  })
}
