// ============================================================================
// PARALLAX — Diagram Macros
// All diagrams in the report draw from this file. One visual language.
// Built on Typst's built-in `cetz` package: `#import "@preview/cetz:0.3.1"`
// ============================================================================

#import "@preview/cetz:0.3.4": canvas, draw
#import "theme.typ": *

// ---------- Shared draw primitives -------------------------------------------

// A node-dot with optional label above and accent ring.
#let node(pos, label: "", color: c-violet, ring: true) = {
  import draw: *
  if ring { circle(pos, radius: 0.28, stroke: 0.5pt + color.transparentize(60%), fill: none) }
  circle(pos, radius: 0.10, fill: color, stroke: none)
  if label != "" {
    content(
      (pos.at(0), pos.at(1) + 0.45),
      text(font: font-mono, size: 8pt, fill: color, tracking: 0.18em)[#label],
      anchor: "south",
    )
  }
}

// Thin labeled arrow between two anchors.
#let flow(from, to, label: "", color: c-slate, dashed: false) = {
  import draw: *
  line(
    from, to,
    mark: (end: ">"),
    stroke: (paint: color, thickness: 1pt, dash: if dashed { "dashed" } else { "solid" }),
  )
  if label != "" {
    let mid = ((from.at(0) + to.at(0)) / 2, (from.at(1) + to.at(1)) / 2 + 0.25)
    content(mid, text(font: font-mono, size: 7.5pt, fill: color)[#label])
  }
}

// ============================================================================
// 1. CAUSAL LOOP — attacker top arc, defender bottom arc, AI mark in center.
//    This is THE signature diagram. Use once per major architecture chapter.
//    Detection layer is ModSecurity (WAF) + Filebeat → Elasticsearch + the
//    backend SIEM engine — there is no Suricata sensor in PARALLAX.
// ============================================================================
#let causal-loop() = canvas(length: 1cm, {
  import draw: *
  // Red top arc (Kali → Exploit → Payload → target/WAF)
  bezier((-5, 0), (5, 0), (-2.5, 3.5), (2.5, 3.5),
    stroke: 1.2pt + c-red)
  // Blue bottom arc (WAF logs → Filebeat/Elastic → SIEM → back to the analyst)
  bezier((5, 0), (-5, 0), (2.5, -3.5), (-2.5, -3.5),
    stroke: 1.2pt + c-blue)

  // Nodes
  node((-5, 0),    label: "KALI",     color: c-red)
  node((-2, 2.5),  label: "EXPLOIT",  color: c-red)
  node(( 2, 2.5),  label: "PAYLOAD",  color: c-red)
  node(( 5, 0),    label: "WAF/LOGS", color: c-blue)
  node(( 2, -2.5), label: "ELASTIC",  color: c-blue)
  node((-2, -2.5), label: "SIEM",     color: c-blue)

  // Center mark — overlapping squares motif
  rect((-0.45, -0.15), (0.35, 0.65), fill: c-red.transparentize(20%), stroke: none)
  rect((-0.35, -0.65), (0.45, 0.15), fill: c-blue.transparentize(20%), stroke: none)
  rect((-0.35, -0.15), (0.35, 0.15), fill: c-violet, stroke: none)
})

// ============================================================================
// 2. MENTOR PIPELINE — vertical flow of the AI mentor request path.
// ============================================================================
#let mentor-pipeline() = canvas(length: 1cm, {
  import draw: *
  // Real pipeline: backend/src/ai/{context_builder,security,monitor}.py.
  // Token cap is mode-dependent (300 learn / 400 procedural / 500 default).
  let stages = (
    ("Command Submitted",          c-slate,  "cooldown 10s"),
    ("Context Builder",            c-violet, "bounded"),
    ("Redact + Sanitize Input",    c-amber,  "scrub secrets"),
    ("OpenRouter · gemini-2.0",    c-blue,   "model call"),
    ("Sanitize Response",          c-green,  "≤500 tok"),
  )
  for (i, stage) in stages.enumerate() {
    let y = -i * 1.4
    let (label, color, ms) = stage
    // box (cetz rect takes a uniform stroke only; the left accent bar is
    // drawn as a separate filled rect to mimic a 2pt left border)
    rect(
      (-5.5, y - 0.45), (5.5, y + 0.45),
      fill: color.transparentize(92%),
      stroke: none,
      radius: 1pt,
    )
    rect((-5.5, y - 0.45), (-5.42, y + 0.45), fill: color, stroke: none)
    // dot
    circle((-5.0, y), radius: 0.12, fill: color, stroke: none)
    // label
    content((-4.5, y), text(font: font-body, size: 10pt, fill: c-navy, weight: 600)[#label], anchor: "west")
    // timing
    content((5.2, y), text(font: font-mono, size: 8pt, fill: color, tracking: 0.15em)[#ms], anchor: "east")
    // connector to next
    if i < stages.len() - 1 {
      line((-5.0, y - 0.5), (-5.0, y - 0.9), stroke: 0.8pt + color.transparentize(50%))
    }
  }
})

// ============================================================================
// 3. ARCHITECTURE STACK — layered system diagram.
//    Layers (top→bottom): Browser, API Gateway, Workspace Services, Sandbox, Telemetry.
// ============================================================================
#let architecture-stack() = canvas(length: 1cm, {
  import draw: *
  let layers = (
    ("Browser",              "React 18 · xterm.js · framer-motion · three.js", c-violet),
    ("API Gateway",          "FastAPI · WebSocket · JWT",                      c-blue),
    ("Workspace Services",   "Red (Kali) · Blue (SIEM) · Mentor (LLM)",        c-navy),
    ("Sandbox",              "Docker Compose · internal networks",             c-amber),
    ("Telemetry",            "ModSecurity · Filebeat · Elasticsearch",         c-green),
  )
  for (i, layer) in layers.enumerate() {
    let y = -i * 1.4
    let (name, stack, color) = layer
    rect(
      (-7, y - 0.55), (7, y + 0.55),
      fill: color.transparentize(94%),
      stroke: 0.5pt + color.transparentize(40%),
      radius: 2pt,
    )
    content((-6.7, y + 0.20),
      text(font: font-display, size: 11pt, fill: color, weight: 800)[#upper(name)],
      anchor: "west")
    content((-6.7, y - 0.22),
      text(font: font-mono, size: 8.5pt, fill: c-slate)[#stack],
      anchor: "west")
    if i < layers.len() - 1 {
      line((0, y - 0.6), (0, y - 0.8), stroke: 0.6pt + c-slate, mark: (end: ">"))
    }
  }
})

// ============================================================================
// 4. THREAT-MODEL SWIM-LANE — attacker | system | defender columns.
// ============================================================================
#let threat-swim-lane() = canvas(length: 1cm, {
  import draw: *
  let cols = (("ATTACKER", c-red, -4.5), ("SYSTEM", c-violet, 0), ("DEFENDER", c-blue, 4.5))
  // Column headers
  for (label, color, x) in cols {
    rect((x - 1.8, 4), (x + 1.8, 4.7), fill: color.transparentize(85%), stroke: none, radius: 1pt)
    content((x, 4.35), text(font: font-mono, size: 9pt, fill: color, weight: 700, tracking: 0.2em)[#label])
    // vertical lane rule
    line((x - 1.8, 3.8), (x - 1.8, -4), stroke: 0.3pt + c-rule)
    line((x + 1.8, 3.8), (x + 1.8, -4), stroke: 0.3pt + c-rule)
  }
  // Sample flow steps (override with real ones per chapter)
  let steps = (
    (0, 3,   "ATTACKER", "Recon scan",    c-red),
    (1, 2,   "SYSTEM",   "Request logged", c-violet),
    (2, 1,   "DEFENDER", "Signature hit",  c-blue),
    (3, 0,   "DEFENDER", "Alert raised",   c-blue),
    (4, -1,  "SYSTEM",   "Mentor nudge",   c-violet),
    (5, -2,  "ATTACKER", "Strategy pivot", c-red),
  )
  for (i, y, lane, label, color) in steps {
    let x = (cols.find(c => c.at(0) == lane)).at(2)
    circle((x, y), radius: 0.18, fill: color, stroke: none)
    content((x + 0.4, y), text(font: font-body, size: 9pt, fill: c-navy)[#label], anchor: "west")
    // arrow to next step (down + sideways)
    if i < steps.len() - 1 {
      let next = steps.at(i + 1)
      let nx = (cols.find(c => c.at(0) == next.at(2))).at(2)
      line((x, y - 0.25), (nx, next.at(1) + 0.25),
        stroke: 0.8pt + c-slate.transparentize(40%),
        mark: (end: ">"))
    }
  }
})

// ============================================================================
// 5. EVIDENCE BAR — horizontal bars for metrics (tests, coverage, latency).
//    Pass data as (label, value 0..1, color, display-text).
// ============================================================================
#let evidence-bar(rows) = canvas(length: 1cm, {
  import draw: *
  let row-h = 0.9
  for (i, row) in rows.enumerate() {
    let (label, value, color, display) = row
    let y = -i * row-h
    // label
    content((-7, y), text(font: font-body, size: 10pt, fill: c-navy, weight: 600)[#label], anchor: "west")
    // track
    rect((-2.5, y - 0.18), (5.5, y + 0.18), fill: c-rule, stroke: none, radius: 1pt)
    // fill
    rect((-2.5, y - 0.18), (-2.5 + 8 * value, y + 0.18),
      fill: color, stroke: none, radius: 1pt)
    // value text
    content((5.7, y), text(font: font-mono, size: 9pt, fill: color, weight: 600)[#display], anchor: "west")
  }
})

// ============================================================================
// 6. NETWORK ISOLATION DIAGRAM — three docker networks side-by-side.
// ============================================================================
#let network-isolation() = canvas(length: 1cm, {
  import draw: *
  let nets = (
    ("172.20.1.0/24", "NovaMed",  "Healthcare",    c-amber),
    ("172.20.2.0/24", "Nexora",   "Active Dir.",   c-red),
    ("172.20.3.0/24", "Orion",    "Phishing",      c-amber),
  )
  for (i, (cidr, name, sub, color)) in nets.enumerate() {
    let x = -5 + i * 5
    rect((x - 1.8, -1.5), (x + 1.8, 2.0),
      fill: color.transparentize(94%),
      stroke: 0.8pt + color,
      radius: 3pt)
    content((x, 1.5), text(font: font-display, size: 13pt, fill: color, weight: 800)[#name])
    content((x, 0.9), text(font: font-body, size: 9pt, fill: c-slate)[#sub])
    content((x, -1.0), text(font: font-mono, size: 8pt, fill: color, tracking: 0.1em)[#cidr])
    // isolation indicator
    if i < nets.len() - 1 {
      line((x + 1.9, 0.2), (x + 3.1, 0.2),
        stroke: (paint: c-red, thickness: 0.8pt, dash: "densely-dashed"))
      content((x + 2.5, 0.5),
        text(font: font-mono, size: 7pt, fill: c-red, tracking: 0.15em)[ISOLATED])
    }
  }
})

// ============================================================================
// 7. USE-CASE MODEL — four actors around a PARALLAX system boundary with the
//    core use cases. Used in Chapter 3 (Architecture / Requirements).
//    Usage:  #fig(caption: "…")[ #use-case() ]
// ============================================================================
#let use-case() = canvas(length: 1cm, {
  import draw: *
  // System boundary
  rect((-2.7, -3.4), (2.7, 3.2), stroke: 0.8pt + c-violet,
    radius: 5pt, fill: c-violet.transparentize(96%))
  content((0, 2.85), text(font: font-mono, size: 8pt, fill: c-violet, tracking: 0.2em)[PARALLAX])
  // Use-case ellipses (short single-line labels keep it calm)
  let ucs = (
    (-1.25, 2.0, "Red Exercise", c-red),
    ( 1.25, 2.0, "Analyze SIEM", c-blue),
    (-1.25, 0.5, "AI Hint",      c-violet),
    ( 1.25, 0.5, "Debrief",      c-green),
    (-1.25,-1.0, "Notes",        c-slate),
    ( 1.25,-1.0, "Monitor",      c-navy),
    ( 0.00,-2.5, "Manage Users", c-navy),
  )
  for (x, y, label, color) in ucs {
    circle((x, y), radius: (1.15, 0.52), stroke: 0.6pt + color, fill: color.transparentize(92%))
    content((x, y), text(font: font-body, size: 7.5pt, fill: c-navy)[#label])
  }
  // Actors (head + stem + mono label)
  let actors = (
    (-5.4, 1.4, "RED STUDENT",  c-red),
    (-5.4,-1.2, "BLUE STUDENT", c-blue),
    ( 5.4, 1.4, "INSTRUCTOR",   c-navy),
    ( 5.4,-1.2, "ADMIN",        c-navy),
  )
  for (x, y, label, color) in actors {
    circle((x, y + 0.45), radius: 0.18, stroke: 0.8pt + color, fill: none)
    line((x, y + 0.27), (x, y - 0.15), stroke: 0.8pt + color)
    content((x, y - 0.55), text(font: font-mono, size: 6.5pt, fill: color, tracking: 0.1em)[#label])
  }
  // Associations (thin slate)
  let assoc = (
    (-4.9, 1.4, -2.7, 2.0), (-4.9, 1.4, -2.7, 0.5),
    (-4.9,-1.2, -2.7, 2.0), (-4.9,-1.2, -2.7,-1.0),
    ( 4.9, 1.4,  2.7,-1.0), ( 4.9, 1.4,  2.7, 0.5),
    ( 4.9,-1.2,  2.7,-2.5),
  )
  for (x1, y1, x2, y2) in assoc { line((x1, y1), (x2, y2), stroke: 0.4pt + c-slate) }
})

// ============================================================================
// 8. PHASE LADDER — the gated dual-track methodology: a Red (offensive) lane
//    over a Blue (incident-response) lane, with gate marks between phases.
//    Used in Chapter 5 (Scenarios) to show methodology gating.
//    Usage:  #fig(caption: "…")[ #phase-ladder() ]
// ============================================================================
#let phase-ladder() = canvas(length: 1cm, {
  import draw: *
  let red  = ("Recon", "Scan", "Exploit", "Post-Exploit")
  let blue = ("Triage", "Investigate", "Contain", "Recover")
  let step = 3.5
  let start = -5.4
  // Red lane (top)
  content((start - 1.4, 1.7), text(font: font-mono, size: 7pt, fill: c-red, tracking: 0.15em)[RED])
  for (i, name) in red.enumerate() {
    let x = start + i * step
    rect((x, 1.2), (x + 2.7, 2.2), stroke: 0.8pt + c-red,
      fill: c-red.transparentize(92%), radius: 2pt)
    content((x + 1.35, 1.7), text(font: font-mono, size: 8pt, fill: c-red, weight: 600)[#name])
    if i < red.len() - 1 {
      line((x + 2.7, 1.7), (x + step, 1.7), stroke: 0.8pt + c-slate, mark: (end: ">"))
      content((x + 2.7 + (step - 2.7) / 2, 2.05),
        text(font: font-mono, size: 6pt, fill: c-amber)[gate])
    }
  }
  // Blue lane (bottom)
  content((start - 1.4, -1.7), text(font: font-mono, size: 7pt, fill: c-blue, tracking: 0.15em)[BLUE])
  for (i, name) in blue.enumerate() {
    let x = start + i * step
    rect((x, -2.2), (x + 2.7, -1.2), stroke: 0.8pt + c-blue,
      fill: c-blue.transparentize(92%), radius: 2pt)
    content((x + 1.35, -1.7), text(font: font-mono, size: 8pt, fill: c-blue, weight: 600)[#name])
    if i < blue.len() - 1 {
      line((x + 2.7, -1.7), (x + step, -1.7), stroke: 0.8pt + c-slate, mark: (end: ">"))
    }
  }
})
