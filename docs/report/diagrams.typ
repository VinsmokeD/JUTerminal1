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

// ============================================================================
// 9. SEQUENCE-DIAGRAM HELPER — evenly spaced lifelines + horizontal messages.
//    lanes:    array of (label, color).
//    messages: array of (from-index, to-index, label, color).
//    Used by auth-sequence() and red-blue-sequence().
// ============================================================================
#let seq-diagram(lanes, messages, height: 7.0, span: 12.0) = canvas(length: 1cm, {
  import draw: *
  let n = lanes.len()
  let x0 = -span / 2
  let dx = if n > 1 { span / (n - 1) } else { 0 }
  let top = height / 2
  let bot = -height / 2
  for (i, lane) in lanes.enumerate() {
    let (label, color) = lane
    let x = x0 + i * dx
    rect((x - 1.4, top), (x + 1.4, top + 0.7),
      fill: color.transparentize(85%), stroke: 0.6pt + color, radius: 2pt)
    content((x, top + 0.35), text(font: font-mono, size: 7.5pt, fill: color, weight: 600)[#label])
    line((x, top), (x, bot), stroke: (paint: c-rule, thickness: 0.5pt, dash: "dashed"))
  }
  let m = messages.len()
  let gap = (top - 0.5 - bot) / (m + 1)
  for (j, msg) in messages.enumerate() {
    let (fi, ti, label, color) = msg
    let y = top - 0.5 - (j + 1) * gap
    let xf = x0 + fi * dx
    let xt = x0 + ti * dx
    if fi == ti {
      // self-message: small loop to the right of the lifeline
      line((xf, y + 0.12), (xf + 0.9, y + 0.12), stroke: 0.9pt + color)
      line((xf + 0.9, y + 0.12), (xf + 0.9, y - 0.12), stroke: 0.9pt + color)
      line((xf + 0.9, y - 0.12), (xf, y - 0.12), stroke: 0.9pt + color, mark: (end: ">"))
      content((xf + 1.1, y), text(font: font-mono, size: 7pt, fill: c-navy)[#label], anchor: "west")
    } else {
      line((xf, y), (xt, y), stroke: 0.9pt + color, mark: (end: ">"))
      content(((xf + xt) / 2, y + 0.26), text(font: font-mono, size: 7pt, fill: c-navy)[#label])
    }
  }
})

// 9a. AUTH SEQUENCE — JWT registration/login handshake. Chapter 6.
#let auth-sequence() = seq-diagram(
  (("BROWSER", c-violet), ("FASTAPI", c-blue), ("POSTGRES", c-green)),
  (
    (0, 1, "POST /api/auth/login",   c-violet),
    (1, 2, "verify user",            c-blue),
    (2, 1, "user row + hash",        c-green),
    (1, 1, "bcrypt check",           c-blue),
    (1, 0, "200 + JWT",              c-blue),
    (0, 1, "GET /api/auth/me + Bearer", c-violet),
    (1, 0, "identity + role",        c-blue),
  ),
  height: 6.5,
)

// 9b. RED-TO-BLUE EVENT SEQUENCE — the causal loop as a sequence. Chapter 6.
#let red-blue-sequence() = seq-diagram(
  (("RED / KALI", c-red), ("BACKEND", c-violet), ("TARGET + WAF", c-amber), ("ELASTIC", c-green), ("BLUE UI", c-blue)),
  (
    (0, 1, "command (WS)",       c-red),
    (1, 1, "log metadata",       c-violet),
    (1, 2, "exec via Docker",    c-violet),
    (2, 3, "WAF/app log -> Filebeat", c-amber),
    (3, 1, "indexed event",      c-green),
    (1, 4, "SIEM event (WS)",    c-blue),
  ),
  height: 7.0, span: 13.5,
)

// ============================================================================
// 10. SESSION LIFECYCLE — STANDBY -> PROVISIONING -> READY -> ACTIVE ->
//     COMPLETED state machine. Chapter 6.
// ============================================================================
#let session-lifecycle() = canvas(length: 1cm, {
  import draw: *
  let states = (
    ("STANDBY",      c-slate),
    ("PROVISIONING", c-amber),
    ("READY",        c-blue),
    ("ACTIVE",       c-green),
    ("COMPLETED",    c-violet),
  )
  let step = 3.4
  let start = -6.8
  for (i, st) in states.enumerate() {
    let (name, color) = st
    let x = start + i * step
    rect((x, -0.55), (x + 2.5, 0.55), stroke: 0.9pt + color,
      fill: color.transparentize(90%), radius: 4pt)
    content((x + 1.25, 0), text(font: font-mono, size: 8pt, fill: color, weight: 600)[#name])
    if i < states.len() - 1 {
      line((x + 2.5, 0), (x + step, 0), stroke: 0.8pt + c-slate, mark: (end: ">"))
    }
  }
  // transition labels
  let labels = ("start", "ready", "ROE ack", "end")
  for (i, lbl) in labels.enumerate() {
    let x = start + i * step + 2.5 + (step - 2.5) / 2
    content((x, 0.32), text(font: font-mono, size: 6pt, fill: c-slate)[#lbl])
  }
})

// ============================================================================
// 11. DFD LEVEL 0 — top-level data flow across browser, backend, stores,
//     sandbox. Built from the shared node()/flow() primitives. Chapter 3.
// ============================================================================
#let dfd-level0() = canvas(length: 1cm, {
  import draw: *
  // external entity + frontend
  rect((-7.4, -0.5), (-5.4, 0.5), stroke: 0.8pt + c-violet, fill: c-violet.transparentize(92%), radius: 2pt)
  content((-6.4, 0), text(font: font-mono, size: 7.5pt, fill: c-violet)[BROWSER])
  // process: backend (circle)
  circle((-1.5, 0), radius: 1.1, stroke: 0.9pt + c-blue, fill: c-blue.transparentize(93%))
  content((-1.5, 0), text(font: font-mono, size: 7.5pt, fill: c-blue, weight: 600)[BACKEND])
  // data stores (open-ended rects)
  let stores = (("POSTGRES", 2.4), ("REDIS", 0.6), ("ELASTIC", -1.2))
  for (name, y) in stores {
    rect((3.0, y - 0.32), (5.6, y + 0.32), stroke: 0.7pt + c-green, fill: c-green.transparentize(93%))
    content((4.3, y), text(font: font-mono, size: 7pt, fill: c-green)[#name])
    flow((-0.4, 0.0), (3.0, y), color: c-slate)
  }
  // sandbox
  rect((3.0, -3.0), (5.8, -2.3), stroke: 0.8pt + c-red, fill: c-red.transparentize(92%), radius: 2pt)
  content((4.4, -2.65), text(font: font-mono, size: 7pt, fill: c-red)[KALI -> TARGET])
  flow((-1.5, -1.1), (3.0, -2.65), label: "exec", color: c-red)
  // browser <-> backend
  flow((-5.4, 0.2), (-2.6, 0.2), label: "REST / WS", color: c-violet)
  flow((-2.6, -0.2), (-5.4, -0.2), color: c-blue)
})

// ============================================================================
// 12. ERD CORE — users -> sessions -> {notes, command_log, siem_events,
//     ai_interactions}. Crow's-foot-style 1..* relations. Chapter 3 / Appendix.
// ============================================================================
#let erd-core() = canvas(length: 1cm, {
  import draw: *
  let ent(pos, name, color) = {
    rect((pos.at(0) - 1.5, pos.at(1) - 0.45), (pos.at(0) + 1.5, pos.at(1) + 0.45),
      stroke: 0.8pt + color, fill: color.transparentize(92%), radius: 2pt)
    content(pos, text(font: font-mono, size: 7.5pt, fill: color, weight: 600)[#name])
  }
  let rel(a, b) = {
    line(a, b, stroke: 0.7pt + c-slate)
    content(((a.at(0) + b.at(0)) / 2, (a.at(1) + b.at(1)) / 2 + 0.22),
      text(font: font-mono, size: 6.5pt, fill: c-slate)[1..\*])
  }
  ent((-5.5, 0), "users", c-violet)
  ent((-1.0, 0), "sessions", c-navy)
  ent(( 4.0, 2.4), "notes", c-green)
  ent(( 4.0, 0.8), "command_log", c-amber)
  ent(( 4.0, -0.8), "siem_events", c-blue)
  ent(( 4.0, -2.4), "ai_interactions", c-red)
  rel((-4.0, 0), (-2.5, 0))
  rel((0.5, 0.3), (2.5, 2.4))
  rel((0.5, 0.15), (2.5, 0.8))
  rel((0.5, -0.15), (2.5, -0.8))
  rel((0.5, -0.3), (2.5, -2.4))
})

// ============================================================================
// 13. REPORT PIPELINE — session data -> aggregate -> score -> timeline ->
//     debrief/report. Vertical flow. Chapter 6/7.
// ============================================================================
#let report-pipeline() = canvas(length: 1cm, {
  import draw: *
  let stages = (
    ("Session data (commands, notes, events, hints, triage)", c-slate),
    ("Aggregate + correlate", c-violet),
    ("Scoring engine", c-amber),
    ("Red-to-Blue timeline", c-blue),
    ("Debrief + examiner report", c-green),
  )
  for (i, st) in stages.enumerate() {
    let (label, color) = st
    let y = -i * 1.4
    rect((-6.5, y - 0.45), (6.5, y + 0.45),
      fill: color.transparentize(92%), stroke: none, radius: 1pt)
    rect((-6.5, y - 0.45), (-6.42, y + 0.45), fill: color, stroke: none)
    content((0, y), text(font: font-body, size: 9.5pt, fill: c-navy, weight: 600)[#label])
    if i < stages.len() - 1 {
      line((0, y - 0.5), (0, y - 0.9), stroke: 0.8pt + color.transparentize(40%), mark: (end: ">"))
    }
  }
})

// ============================================================================
// 14. INSTRUCTOR ANALYTICS — many sessions fan in to one aggregator, then to
//     dashboard views. Chapter 6.
// ============================================================================
#let instructor-analytics() = canvas(length: 1cm, {
  import draw: *
  // session sources
  for (i, y) in (2.4, 1.2, 0.0, -1.2, -2.4).enumerate() {
    rect((-7.0, y - 0.3), (-4.6, y + 0.3), stroke: 0.6pt + c-slate, fill: c-slate.transparentize(93%), radius: 2pt)
    content((-5.8, y), text(font: font-mono, size: 6.5pt, fill: c-slate)[session #(i + 1)])
    flow((-4.6, y), (-1.4, 0), color: c-slate.transparentize(30%))
  }
  // aggregator
  circle((0, 0), radius: 1.3, stroke: 1pt + c-violet, fill: c-violet.transparentize(92%))
  content((0, 0), text(font: font-mono, size: 7.5pt, fill: c-violet, weight: 600)[ANALYTICS])
  // outputs
  for (i, item) in (("Class metrics", 1.8), ("AI usage", 0.0), ("Grade export", -1.8)).enumerate() {
    let (label, y) = item
    rect((3.0, y - 0.32), (6.6, y + 0.32), stroke: 0.7pt + c-blue, fill: c-blue.transparentize(92%), radius: 2pt)
    content((4.8, y), text(font: font-mono, size: 7pt, fill: c-blue)[#label])
    flow((1.3, 0), (3.0, y), color: c-blue.transparentize(20%))
  }
})

// ============================================================================
// 15. SCENARIO TOPOLOGY — parametric isolated-network diagram. One Kali
//     attacker reaching target nodes inside an internal scenario network.
//     nodes: array of (label, ip). Chapter 5.
//     Usage:  #sc-topology("SC-01 NovaMed", "172.20.1.0/24",
//               (("WAF","172.20.1.1"), ("Web","172.20.1.20"), ("DB","172.20.1.21")), c-amber)
// ============================================================================
#let sc-topology(title, cidr, nodes, color) = canvas(length: 1cm, {
  import draw: *
  // network boundary
  rect((-2.4, -3.2), (7.2, 3.0), stroke: (paint: color, thickness: 1pt, dash: "densely-dashed"),
    fill: color.transparentize(96%), radius: 4pt)
  content((2.4, 2.6), text(font: font-mono, size: 8pt, fill: color, tracking: 0.12em)[#title])
  content((2.4, 2.05), text(font: font-mono, size: 7pt, fill: c-slate)[#cidr · internal])
  // kali attacker (outside, left)
  rect((-7.0, -0.5), (-4.6, 0.5), stroke: 0.9pt + c-red, fill: c-red.transparentize(90%), radius: 2pt)
  content((-5.8, 0.1), text(font: font-mono, size: 7.5pt, fill: c-red, weight: 600)[KALI])
  content((-5.8, -0.28), text(font: font-mono, size: 6pt, fill: c-slate)[via backend])
  // target nodes stacked
  let n = nodes.len()
  let y0 = 1.2
  let stepy = if n > 1 { 3.0 / (n - 1) } else { 0 }
  for (i, nd) in nodes.enumerate() {
    let (label, ip) = nd
    let y = y0 - i * stepy
    rect((1.4, y - 0.4), (6.6, y + 0.4), stroke: 0.8pt + color, fill: color.transparentize(90%), radius: 2pt)
    content((2.8, y), text(font: font-mono, size: 7pt, fill: color, weight: 600)[#label])
    content((5.6, y), text(font: font-mono, size: 6.5pt, fill: c-slate)[#ip])
    // chain previous -> current
    if i > 0 {
      let yp = y0 - (i - 1) * stepy
      line((4.0, yp - 0.4), (4.0, y + 0.4), stroke: 0.6pt + color.transparentize(30%), mark: (end: ">"))
    }
  }
  // kali -> first node (proxied)
  line((-4.6, 0), (1.4, y0), stroke: (paint: c-red, thickness: 0.8pt), mark: (end: ">"))
})

// ============================================================================
// 16. C4 CONTEXT DIAGRAM — system high-level context.
// ============================================================================
#let c4-context-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Center: Platform
  rect((-2.5, -1.2), (2.5, 1.2), stroke: 1.2pt + c-violet, fill: c-violet.transparentize(94%), radius: 4pt)
  content((0, 0.35), text(font: font-display, size: 10pt, fill: c-navy, weight: 800)[PARALLAX PLATFORM])
  content((0, -0.4), text(font: font-body, size: 7.5pt, fill: c-slate)[Cybersecurity Training System])

  // Left: Actors
  let actors = (
    (3.2, "Red Operator", c-red),
    (1.1, "Blue Analyst", c-blue),
    (-1.1, "Instructor", c-navy),
    (-3.2, "Admin / Operator", c-slate),
  )
  for (y, label, color) in actors {
    rect((-7.8, y - 0.7), (-4.8, y + 0.7), stroke: 0.8pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((-6.3, y), text(font: font-mono, size: 7.5pt, fill: color, weight: 600)[#label])
    flow((-4.8, y), (-2.5, y * 0.3), color: color)
  }

  // Right: External Systems
  let external = (
    (2.2, "AI Provider", "Gemini / OpenRouter", c-violet),
    (0.0, "Docker Engine", "Container Runtime", c-blue),
    (-2.2, "UJ / KASIT", "Grading / Course Context", c-green),
  )
  for (y, name, desc, color) in external {
    rect((4.8, y - 0.75), (7.8, y + 0.75), stroke: 0.8pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((6.3, y + 0.18), text(font: font-mono, size: 7.5pt, fill: color, weight: 600)[#name])
    content((6.3, y - 0.28), text(font: font-body, size: 6.5pt, fill: c-slate)[#desc])
    flow((2.5, y * 0.3), (4.8, y), color: color)
  }
})

// ============================================================================
// 17. C4 CONTAINER DIAGRAM — container level architecture.
// ============================================================================
#let c4-container-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Browser (top)
  rect((-2.0, 4.2), (2.0, 5.2), stroke: 0.8pt + c-navy, fill: c-navy.transparentize(94%), radius: 2pt)
  content((0, 4.7), text(font: font-mono, size: 8pt, fill: c-navy, weight: 600)[STUDENT BROWSER])

  // Nginx Proxy
  rect((-2.0, 2.2), (2.0, 3.2), stroke: 0.8pt + c-violet, fill: c-violet.transparentize(94%), radius: 2pt)
  content((0, 2.7), text(font: font-mono, size: 8pt, fill: c-violet, weight: 600)[NGINX PROXY])
  flow((0, 4.2), (0, 3.2), color: c-slate)

  // Frontend & Backend
  rect((-6.5, 0.0), (-2.5, 1.2), stroke: 0.8pt + c-blue, fill: c-blue.transparentize(94%), radius: 2pt)
  content((-4.5, 0.75), text(font: font-mono, size: 8pt, fill: c-blue, weight: 600)[REACT FRONTEND])
  content((-4.5, 0.3), text(font: font-body, size: 6.5pt, fill: c-slate)[SPA (Vite, Zustand)])

  rect((2.5, 0.0), (6.5, 1.2), stroke: 0.8pt + c-red, fill: c-red.transparentize(94%), radius: 2pt)
  content((4.5, 0.75), text(font: font-mono, size: 8pt, fill: c-red, weight: 600)[FASTAPI BACKEND])
  content((4.5, 0.3), text(font: font-body, size: 6.5pt, fill: c-slate)[API & WebSocket Server])

  flow((-1.0, 2.2), (-4.5, 1.2), color: c-slate)
  flow((1.0, 2.2), (4.5, 1.2), color: c-slate)
  flow((-2.5, 0.6), (2.5, 0.6), label: "WS/REST", color: c-violet)

  // Datastores & Telemetry
  rect((-6.5, -2.4), (-2.5, -1.2), stroke: 0.8pt + c-green, fill: c-green.transparentize(94%), radius: 2pt)
  content((-4.5, -1.65), text(font: font-mono, size: 8pt, fill: c-green, weight: 600)[DATA STORES])
  content((-4.5, -2.1), text(font: font-body, size: 6.5pt, fill: c-slate)[PostgreSQL & Redis])

  rect((2.5, -2.4), (6.5, -1.2), stroke: 0.8pt + c-amber, fill: c-amber.transparentize(94%), radius: 2pt)
  content((4.5, -1.65), text(font: font-mono, size: 8pt, fill: c-amber, weight: 600)[ELASTICSEARCH / SIEM])
  content((4.5, -2.1), text(font: font-body, size: 6.5pt, fill: c-slate)[Filebeat Log Shipper])

  flow((4.5, 0.0), (4.5, -1.2), color: c-slate)
  flow((-4.5, 0.0), (-4.5, -1.2), color: c-slate)
  flow((3.5, 0.0), (-2.5, -1.8), color: c-slate) // backend to DB
  flow((5.5, -1.2), (5.5, 0.0), color: c-slate) // ES to backend

  // Scenario networks (isolated)
  rect((-6.5, -5.0), (6.5, -3.8), stroke: (paint: c-red, thickness: 1pt, dash: "dashed"), fill: c-red.transparentize(96%), radius: 3pt)
  content((0, -4.4), text(font: font-display, size: 9pt, fill: c-red, weight: 800)[SCENARIO CONTAINER SANDBOXES (SC-01 / SC-02 / SC-03)])
  
  flow((4.5, -3.8), (4.5, -2.4), label: "audit logs", color: c-amber, dashed: true)
  flow((3.0, 0.0), (0.0, -3.8), label: "Docker SDK / PTY", color: c-red)
})

// ============================================================================
// 18. SYSTEM COMPONENT INTERACTION — detailed components and layers.
// ============================================================================
#let system-component-interaction-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Frontend box
  rect((-7.0, -4.2), (-2.8, 3.8), stroke: 0.8pt + c-blue, fill: c-blue.transparentize(96%), radius: 4pt)
  content((-4.9, 3.4), text(font: font-mono, size: 8.5pt, fill: c-blue, weight: 700)[FRONTEND])
  let fe_comps = (
    ( 2.4, "TerminalPanel\n(xterm.js)"),
    ( 1.1, "SiemFeed\n(EventTable)"),
    (-0.2, "NotesPanel"),
    (-1.5, "HintPanel\n(AI Tutor)"),
    (-2.8, "DebriefPage"),
  )
  for (y, label) in fe_comps {
    rect((-6.6, y - 0.45), (-3.2, y + 0.45), stroke: 0.6pt + c-blue, fill: c-blue.transparentize(92%), radius: 2pt)
    content((-4.9, y), text(font: font-body, size: 7.5pt, fill: c-navy)[#label])
  }

  // Backend box
  rect((-2.0, -4.2), (2.2, 3.8), stroke: 0.8pt + c-violet, fill: c-violet.transparentize(96%), radius: 4pt)
  content((0.1, 3.4), text(font: font-mono, size: 8.5pt, fill: c-violet, weight: 700)[BACKEND (FastAPI)])
  let be_comps = (
    ( 2.4, "/ws/session\n(WebSocket)"),
    ( 1.1, "Scenario Engine\n+ Gatekeeper"),
    (-0.2, "Sandbox Manager\n(Docker API)"),
    (-1.5, "SIEM Engine\n(command bridge)"),
    (-2.8, "AI Monitor\n(context builder)"),
  )
  for (y, label) in be_comps {
    rect((-1.6, y - 0.45), (1.8, y + 0.45), stroke: 0.6pt + c-violet, fill: c-violet.transparentize(92%), radius: 2pt)
    content((0.1, y), text(font: font-body, size: 7.5pt, fill: c-navy)[#label])
  }

  // Data / Daemon
  let right_comps = (
    ( 2.4, "PostgreSQL", c-green),
    ( 0.8, "Redis DB", c-green),
    (-0.8, "Elasticsearch", c-amber),
    (-2.4, "Docker Daemon", c-red),
  )
  for (y, label, color) in right_comps {
    rect((3.2, y - 0.5), (6.8, y + 0.5), stroke: 0.8pt + color, fill: color.transparentize(92%), radius: 2pt)
    content((5.0, y), text(font: font-mono, size: 8pt, fill: color, weight: 600)[#label])
  }

  // Connections
  flow((-3.2, 2.4), (-1.6, 2.4), color: c-slate) // terminal -> WS route
  flow((-3.2, 1.1), (-1.6, 1.1), color: c-slate) // siem -> engine
  flow((-3.2, -1.5), (-1.6, -2.8), color: c-slate) // hints -> AI monitor
  
  flow((1.8, 2.4), (3.2, 2.4), color: c-slate) // WS -> postgres
  flow((1.8, 1.1), (3.2, 0.8), color: c-slate) // scenario -> redis
  flow((1.8, -0.2), (3.2, -2.4), color: c-slate) // sandbox -> docker
  flow((1.8, -1.5), (3.2, -0.8), color: c-slate) // SIEM -> Elastic
})

// ============================================================================
// 19. DOCKER TOPOLOGY & DEPLOYMENT — isolated scenario subnets.
// ============================================================================
#let docker-topology-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Docker Host Box
  rect((-6.5, -4.5), (6.5, 4.0), stroke: 1.2pt + c-navy, fill: c-paper, radius: 6pt)
  content((0, 3.65), text(font: font-display, size: 10pt, fill: c-navy, weight: 800)[LOCAL DOCKER HOST (16 GB RAM)])

  // Core network box
  rect((-6.0, 0.6), (6.0, 3.2), stroke: 0.8pt + c-blue, fill: c-blue.transparentize(96%), radius: 4pt)
  content((0, 2.85), text(font: font-mono, size: 8.5pt, fill: c-blue, weight: 700)[parallax-net (Core bridge network)])
  
  let core_nodes = (
    (-4.5, 1.5, "Nginx\n:80/:443", c-violet),
    (-1.5, 1.5, "React SPA\n:3000", c-blue),
    ( 1.5, 1.5, "FastAPI\n:8001", c-blue),
    ( 4.5, 1.5, "Datastores\nPG/Redis/ES", c-green),
  )
  for (x, y, label, color) in core_nodes {
    rect((x - 1.2, y - 0.45), (x + 1.2, y + 0.45), stroke: 0.6pt + color, fill: color.transparentize(92%), radius: 2pt)
    content((x, y), text(font: font-body, size: 7.5pt, fill: c-navy)[#label])
  }

  // Scenario networks (isolated)
  let subnets = (
    (-4.2, "sc01-net (172.20.1.0/24)", "NovaMed Web App\nModSec WAF + MySQL", c-amber),
    ( 0.0, "sc02-net (172.20.2.0/24)", "Samba AD DC\nLDAP / Kerberos", c-red),
    ( 4.2, "sc03-net (172.20.3.0/24)", "Postfix SMTP\nGoPhish + Victim", c-amber),
  )
  for (x, label, details, color) in subnets {
    rect((x - 1.9, -3.8), (x + 1.9, -0.2), stroke: 0.8pt + color, fill: color.transparentize(96%), radius: 4pt)
    content((x, -0.6), text(font: font-mono, size: 7.5pt, fill: color, weight: 700)[#label])
    content((x, -2.0), text(font: font-body, size: 7pt, fill: c-navy)[#details])
    
    // Line from backend to scenario nodes (exec channel)
    flow((1.5, 1.05), (x, -0.2), color: c-slate, dashed: true)
  }
})

// ============================================================================
// 20. RED TEAM METHODOLOGY FLOW — pentest phases and note gates.
// ============================================================================
#let red-team-methodology-diagram() = canvas(length: 1.0cm, {
  import draw: *
  let steps = (
    (-6.5, "Reconnaissance", "Nmap host discovery\nrobots.txt, WHOIS", "Save RECON note", c-slate),
    (-2.2, "Scanning", "Nmap service scan\nNikto, Directory enum", "Save SCAN note", c-blue),
    ( 2.2, "Exploitation", "Sqlmap (SQLi), LFI\nWebshell upload", "Capture Flag", c-red),
    ( 6.5, "Post-Exploit", "Privilege escalation\nLateral movement", "Evidence collection", c-violet),
  )
  for (x, name, desc, note, color) in steps {
    rect((x - 1.8, -1.8), (x + 1.8, 1.8), stroke: 0.8pt + color, fill: color.transparentize(94%), radius: 4pt)
    content((x, 1.3), text(font: font-mono, size: 8.5pt, fill: color, weight: 700)[#name])
    content((x, 0.3), text(font: font-body, size: 7pt, fill: c-navy)[#desc])
    line((x - 1.4, -0.5), (x + 1.4, -0.5), stroke: 0.5pt + c-rule)
    content((x, -1.1), text(font: font-mono, size: 7pt, fill: color, weight: 600)[#note])
    
    if x < 6.0 {
      flow((x + 1.8, 0), (x + 2.5, 0), color: c-slate)
      // Draw gate symbol (rhombus/diamond)
      let gx = x + 2.15
      line(
        (gx, 0.35), (gx + 0.35, 0), (gx, -0.35), (gx - 0.35, 0),
        close: true,
        stroke: 0.6pt + c-violet, fill: c-violet.transparentize(85%)
      )
      content((gx, 0), text(font: font-mono, size: 5pt, fill: c-violet)[GATE])
    }
  }
})

// ============================================================================
// 21. BLUE TEAM INCIDENT RESPONSE WORKFLOW.
// ============================================================================
#let blue-team-ir-workflow-diagram() = canvas(length: 1.0cm, {
  import draw: *
  let stages = (
    ( 3.0, "1. Triage", "Review alert severity · Check MITRE ATT&CK tag", c-red),
    ( 1.0, "2. Investigation", "Query raw logs · Extract IOCs · Timeline reconstruct", c-blue),
    (-1.0, "3. Containment", "Isolate container · Block source IP · Kill process", c-green),
    (-3.0, "4. Reporting", "Document evidence in notes · View timeline · Finalize report", c-violet),
  )
  for (y, label, desc, color) in stages {
    rect((-5.5, y - 0.65), (5.5, y + 0.65), stroke: 0.8pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((-5.1, y + 0.22), text(font: font-mono, size: 8.5pt, fill: color, weight: 700)[#label], anchor: "west")
    content((-5.1, y - 0.24), text(font: font-body, size: 7.5pt, fill: c-navy)[#desc], anchor: "west")
    
    if y > -3.0 {
      flow((0, y - 0.65), (0, y - 1.35), color: c-slate)
    }
  }
})

// ============================================================================
// 22. SCORING AND DEBRIEF FLOW — inputs/penalties to score and outputs.
// ============================================================================
#let scoring-and-debrief-flow-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Inputs (left)
  let inputs = (
    ( 2.4, "Flag Captures (+25)", c-green),
    ( 1.2, "Phase Completions (+15)", c-green),
    ( 0.0, "IR Notes Quality (+10)", c-blue),
    (-1.2, "Containment Actions (+10)", c-blue),
    (-2.4, "Triage Accuracy (+5)", c-violet),
  )
  for (y, label, color) in inputs {
    rect((-7.0, y - 0.4), (-3.2, y + 0.4), stroke: 0.6pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((-5.1, y), text(font: font-mono, size: 7pt, fill: color, weight: 600)[#label])
    flow((-3.2, y), (-1.2, y * 0.3), color: color)
  }

  // Center Score Engine
  circle((0, 0), radius: 1.1, stroke: 1.2pt + c-navy, fill: c-navy.transparentize(94%))
  content((0, 0.25), text(font: font-display, size: 8pt, fill: c-navy, weight: 800)[SCORE ENGINE])
  content((0, -0.28), text(font: font-mono, size: 6.5pt, fill: c-slate)[Real-time])

  // Outputs (right)
  let outputs = (
    ( 2.4, "Timeline (SVG)", c-violet),
    ( 1.2, "Radar (NIST CSF)", c-blue),
    ( 0.0, "Score Breakdown", c-navy),
    (-1.2, "Red-Blue Correlation", c-amber),
    (-2.4, "Markdown Export", c-green),
  )
  for (y, label, color) in outputs {
    rect((3.2, y - 0.4), (7.0, y + 0.4), stroke: 0.6pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((5.1, y), text(font: font-mono, size: 7pt, fill: color, weight: 600)[#label])
    flow((1.2, y * 0.3), (3.2, y), color: color)
  }
})

// ============================================================================
// 23. SCENARIO SC-01 FLOW — red team attack vs target vs blue team logs.
// ============================================================================
#let scenario-sc01-flow-diagram() = canvas(length: 1.0cm, {
  import draw: *
  // Red Team Track
  content((-5.2, 3.6), text(font: font-mono, size: 8.5pt, fill: c-red, weight: 700, tracking: 0.15em)[RED TEAM ATTACK])
  let red_steps = (
    ( 2.5, "1. Enumeration", "nmap / dirb / nikto"),
    ( 0.9, "2. SQL Injection", "Bypass login via sqlmap"),
    (-0.7, "3. Traversal (LFI)", "Read /etc/passwd config"),
    (-2.3, "4. Web Shell RCE", "Upload payload & exec"),
  )
  for (y, label, desc) in red_steps {
    rect((-7.3, y - 0.6), (-3.1, y + 0.6), stroke: 0.8pt + c-red, fill: c-red.transparentize(94%), radius: 2pt)
    content((-5.2, y + 0.2), text(font: font-mono, size: 8pt, fill: c-red, weight: 600)[#label])
    content((-5.2, y - 0.22), text(font: font-body, size: 6.5pt, fill: c-slate)[#desc])
    if y > -2.0 { flow((-5.2, y - 0.6), (-5.2, y - 1.0), color: c-red) }
  }

  // Target Node (Center)
  rect((-1.8, -3.1), (1.8, 3.1), stroke: (paint: c-green, thickness: 1pt, dash: "dashed"), fill: c-green.transparentize(97%), radius: 4pt)
  content((0, 2.75), text(font: font-mono, size: 8.5pt, fill: c-green, weight: 700)[NOVAMED TARGET])
  
  let target_nodes = (
    ( 1.7, "ModSecurity WAF", c-amber),
    ( 0.0, "Apache PHP Web", c-green),
    (-1.7, "MySQL Database", c-green),
  )
  for (y, label, color) in target_nodes {
    rect((-1.5, y - 0.45), (1.5, y + 0.45), stroke: 0.8pt + color, fill: color.transparentize(94%), radius: 2pt)
    content((0, y), text(font: font-mono, size: 7.5pt, fill: color, weight: 600)[#label])
  }

  // Blue Team Track
  content((5.2, 3.6), text(font: font-mono, size: 8.5pt, fill: c-blue, weight: 700, tracking: 0.15em)[BLUE TEAM SOC])
  let blue_steps = (
    ( 2.5, "1. Detection", "WAF log / Auth failures"),
    ( 0.9, "2. Triage", "Identify SQLi / LFI pattern"),
    (-0.7, "3. Response", "Block IP / isolate container"),
    (-2.3, "4. Mitigation", "Remediate SQLi & patches"),
  )
  for (y, label, desc) in blue_steps {
    rect((3.1, y - 0.6), (7.3, y + 0.6), stroke: 0.8pt + c-blue, fill: c-blue.transparentize(94%), radius: 2pt)
    content((5.2, y + 0.2), text(font: font-mono, size: 8pt, fill: c-blue, weight: 600)[#label])
    content((5.2, y - 0.22), text(font: font-body, size: 6.5pt, fill: c-slate)[#desc])
    if y > -2.0 { flow((5.2, y - 0.6), (5.2, y - 1.0), color: c-blue) }
  }

  // Cross-track flow arrows
  flow((-3.1, 2.5), (-1.5, 1.7), color: c-slate) // attack to WAF
  flow((-3.1, 0.9), (-1.5, 0.0), color: c-slate) // SQLi to Apache
  flow((1.5, 1.7), (3.1, 2.5), color: c-slate) // WAF alert to detection
  flow((1.5, 0.0), (3.1, 0.9), color: c-slate) // Apache log to detection
})

