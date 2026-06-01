// ============================================================================
// PARALLAX — Graduation Report (Academic / KASIT Edition)
// Compile:  typst compile --font-path fonts main-academic.typ parallax-report-academic.pdf
// Live:     typst watch  --font-path fonts main-academic.typ
// ============================================================================

#import "theme.typ": *
#import "components.typ": *
#import "diagrams.typ": *

// ---------- Document metadata ------------------------------------------------
#set document(
  title: "PARALLAX — A Dual-Perspective Cybersecurity Training Platform",
  author: ("Mahmoud Allabadi", "Rashed Alkurdi"),
  date: datetime(year: 2026, month: 6, day: 1),
)

// Apply the global theme. Everything below inherits it.
#show: parallax-theme

// Suppress fallback H1 styling since openers are rendered via chapter().
#show heading.where(level: 1): none

// ---------- ACADEMIC COVER PAGE ----------------------------------------------
#let academic-cover(
  title: "PARALLAX",
  subtitle: "A Dual-Perspective Cybersecurity Training Platform with a Socratic AI Mentor",
  degree: "Project Submitted in partial fulfillment for the degree of Bachelor of Science in Cybersecurity",
  authors: (
    ("Mahmoud Allabadi", "2221558"),
    ("Rashed Alkurdi",   "0221992"),
  ),
  supervisor: "Dr. Abdel Latif Abu-Dalhoum",
  institution: "King Abdullah II School of Information Technology\nThe University of Jordan",
  date: "June 2026",
  version: "v1.1.0-academic",
) = {
  page(
    margin: (top: 25mm, bottom: 25mm, x: 28mm),
    header: none,
    footer: none,
    {
      // --- LOGOS HEADER ---
      grid(
        columns: (1fr, 1fr),
        align: (left, right),
        image("logos/uj-logo.png", height: 55pt),
        image("logos/kasit-logo.png", height: 55pt)
      )
      
      v(35pt)
      
      align(center, {
        // --- PARALLAX BRAND LOGO ---
        image("logos/parallax-icon.svg", height: 80pt)
        v(15pt)
        
        // --- TITLE ---
        text(font: font-display, size: 48pt, fill: c-navy, weight: 800, tracking: 0.06em, hyphenate: false)[#title]
        v(6pt)
        line(length: 120pt, stroke: 1.5pt + c-violet)
        v(16pt)
        
        // --- SUBTITLE ---
        text(font: font-body, size: 14pt, fill: c-slate, weight: 400)[#subtitle]
        v(45pt)
        
        // --- DEGREE SUBMISSION TEXT ---
        block(width: 85%, {
          set par(leading: 0.65em)
          text(font: font-body, size: 11pt, fill: c-ink, weight: 500)[
            #degree
          ]
        })
        
        v(1fr)
        
        // --- AUTHORS & SUPERVISOR SECTION ---
        grid(
          columns: (1.2fr, 1fr),
          column-gutter: 20pt,
          align: (left, left),
          [
            #text(font: font-mono, size: 8.5pt, fill: c-violet, tracking: 0.12em, weight: 600)[PREPARED BY]
            #v(6pt)
            #grid(
              columns: (1fr, auto),
              column-gutter: 12pt,
              row-gutter: 6pt,
              align: (left, right),
              text(font: font-body, size: 10.5pt, fill: c-navy, weight: 700)[Mahmoud Allabadi],
              text(font: font-mono, size: 9.5pt, fill: c-slate)[2221558],
              text(font: font-body, size: 10.5pt, fill: c-navy, weight: 700)[Rashed Alkurdi],
              text(font: font-mono, size: 9.5pt, fill: c-slate)[0221992],
            )
          ],
          [
            #text(font: font-mono, size: 8.5pt, fill: c-violet, tracking: 0.12em, weight: 600)[SUPERVISED BY]
            #v(6pt)
            #text(font: font-body, size: 10.5pt, fill: c-navy, weight: 700)[#supervisor]
          ]
        )
        
        v(45pt)
        
        // --- INSTITUTION & DATE ---
        text(font: font-body, size: 11pt, fill: c-navy, weight: 600)[#institution]
        v(10pt)
        text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em)[
          #upper(date) · #version
        ]
      })
    }
  )
}

#academic-cover()

// ---------- ABSTRACT ---------------------------------------------------------
#page({
  text(font: font-mono, size: 10pt, fill: c-violet, tracking: 0.22em, weight: 500)[ABSTRACT]
  v(8pt)
  line(length: 100%, stroke: 0.5pt + c-rule)
  v(24pt)
  block(width: 82%, {
    set par(leading: 0.75em, justify: true)
    [
      PARALLAX is a cybersecurity training platform that places offensive and
      defensive perspectives inside a single causal loop. A student executes a
      real attack from a Kali Linux workspace against an isolated Docker target;
      the same action surfaces as defender telemetry — a ModSecurity
      web-application firewall and container logs shipped by Filebeat into
      Elasticsearch, then correlated by the backend SIEM engine — and appears in a
      Blue-Team event feed in well under two seconds. A Socratic AI mentor, gated
      by a bounded context builder, an input-redaction and response-sanitization
      layer, and a strict token cap, supplies hints rather than working exploits.

      This report documents the system end to end: its requirements and
      architecture; the threat model that keeps the mentor from becoming an
      exploit-generation oracle; the three production scenarios (web, Active
      Directory, phishing) used for evaluation; the implementation of the
      frontend, backend, sandbox, telemetry, and mentor; and the test evidence
      that supports v1.0.0-rc1 as ready for instructor evaluation — 358 passing
      backend cases, sub-two-second attack-to-telemetry latency, 100%
      scenario-network isolation, and Lighthouse 91 performance / 100
      accessibility. Appendices provide the full API surface, database schema,
      requirements traceability, deployment procedures, and scenario reference.
    ]
  })
  v(18pt)
  block(width: 82%, {
    text(font: font-mono, size: 8.5pt, fill: c-slate, tracking: 0.16em, weight: 500)[KEYWORDS]
    v(4pt)
    text(size: 10pt, fill: c-ink)[
      cybersecurity training · penetration testing · SOC analysis · Docker
      isolation · Socratic AI · SIEM · dual-perspective learning · FastAPI · React
    ]
  })
})

// ---------- TABLE OF CONTENTS ------------------------------------------------
#toc()

// ---------- LIST OF ABBREVIATIONS --------------------------------------------
#page({
  text(font: font-mono, size: 10pt, fill: c-violet, tracking: 0.22em, weight: 500)[ABBREVIATIONS]
  v(8pt)
  line(length: 100%, stroke: 0.5pt + c-rule)
  v(18pt)
  set text(size: 10pt)
  table(
    columns: (auto, 1fr),
    column-gutter: 10pt,
    row-gutter: 5pt,
    stroke: none,
    [#text(font: font-mono, fill: c-navy)[AD]],    [Active Directory],
    [#text(font: font-mono, fill: c-navy)[API]],   [Application Programming Interface],
    [#text(font: font-mono, fill: c-navy)[CIDR]],  [Classless Inter-Domain Routing],
    [#text(font: font-mono, fill: c-navy)[DFD]],   [Data Flow Diagram],
    [#text(font: font-mono, fill: c-navy)[ERD]],   [Entity-Relationship Diagram],
    [#text(font: font-mono, fill: c-navy)[JWT]],   [JSON Web Token],
    [#text(font: font-mono, fill: c-navy)[KASIT]], [King Abdullah II School of Information Technology],
    [#text(font: font-mono, fill: c-navy)[LLM]],   [Large Language Model],
    [#text(font: font-mono, fill: c-navy)[MITRE]], [MITRE ATT&CK adversary technique knowledge base],
    [#text(font: font-mono, fill: c-navy)[NIST]],  [National Institute of Standards and Technology],
    [#text(font: font-mono, fill: c-navy)[PTES]],  [Penetration Testing Execution Standard],
    [#text(font: font-mono, fill: c-navy)[PTY]],   [Pseudo-terminal],
    [#text(font: font-mono, fill: c-navy)[ROE]],   [Rules of Engagement],
    [#text(font: font-mono, fill: c-navy)[SIEM]],  [Security Information and Event Management],
    [#text(font: font-mono, fill: c-navy)[SPN]],   [Service Principal Name],
    [#text(font: font-mono, fill: c-navy)[WAF]],   [Web Application Firewall],
    [#text(font: font-mono, fill: c-navy)[WS]],    [WebSocket],
  )
})

// ============================================================================
// CHAPTERS  (each file re-imports theme/components/diagrams)
// ============================================================================
#include "chapters/ch01-introduction.typ"
#include "chapters/ch02-background.typ"
#include "chapters/ch03-architecture.typ"
#include "chapters/ch04-threat-model.typ"
#include "chapters/ch05-scenarios.typ"
#include "chapters/ch06-implementation.typ"
#include "chapters/ch07-evaluation.typ"
#include "chapters/ch08-discussion.typ"

// ---------- REFERENCES -------------------------------------------------------
#chapter(num: "09", title: "References", lead: "")
#bibliography("refs.bib", title: none, style: "ieee")

// ---------- APPENDICES -------------------------------------------------------
#include "chapters/appendix-a-repo.typ"
#include "chapters/appendix-b-reproduce.typ"
#include "chapters/appendix-c-api.typ"
#include "chapters/appendix-d-database.typ"
#include "chapters/appendix-e-traceability.typ"
#include "chapters/appendix-f-deployment.typ"
