#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "02", title: "Background and Related Work",
  lead: "What cybersecurity training offers today, the frameworks that anchor it, and what PARALLAX is reacting against.")

== Cyber ranges and CTF platforms
Hosted offensive ranges such as Hack The Box @hackthebox and TryHackMe
@tryhackme teach attack skills through deliberately vulnerable machines. A
learner enumerates a host, finds a flaw, exploits it, and submits a flag. These
platforms excel at building offensive intuition and have large content
libraries, but the defender's view is absent: the learner never sees the log,
alert, or analyst decision their action would have produced.

Defensive platforms invert the emphasis. CyberDefenders @cyberdefenders and
similar blue-team ranges hand the learner captured telemetry — packet captures,
event logs, SIEM exports — and reward correct investigation and triage. Here the
attacker's view is absent: the telemetry is pre-recorded, so the learner cannot
change the cause and watch the effect move.

Intentionally vulnerable applications such as OWASP Juice Shop
@owasp_juiceshop are excellent attack targets but ship no defensive telemetry
pipeline at all. In every case the two perspectives live in separate tools.

== Tutoring and Socratic guidance
Decades of work on intelligent tutoring systems show that learners improve most
when a system prompts their reasoning rather than supplying answers. A tutor that
hands over the solution short-circuits the very struggle that produces learning.
PARALLAX applies this directly: its AI mentor is constrained to Socratic hints
and is explicitly forbidden from returning a working exploit. The mentor nudges
the learner toward the next question — "what does this service version tell you?"
— instead of printing the payload. Chapter 4 documents the guardrails that make
this constraint provable rather than aspirational.

== Standards and frameworks
Scenario design and assessment are anchored in established references rather than
invented rubrics:

#fig(caption: "Frameworks that anchor PARALLAX's scenario and assessment design")[
  #table(
    columns: (auto, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[FRAMEWORK],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[ROLE IN PARALLAX],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [OWASP Top 10 @owasp2021top10],   [Vulnerability classes for the SC-01 web scenario.],
    [OWASP WSTG @owasp2024wstg],       [Testing methodology for web-application assessment.],
    [MITRE ATT&CK @mitre2020attack],   [Technique mapping for every scenario and SIEM event.],
    [NIST CSF @nist2018csf],           [Identify–Protect–Detect–Respond framing for the Blue-Team track.],
    [PTES @ptes2014],                  [Phase ordering for the gated offensive methodology.],
    table.hline(stroke: 1pt + c-navy),
  )
]

== Why a new platform
The gap is the *causal link*. No widely used platform lets a student attack and
simultaneously watch the defender's telemetry over one shared session, with a
guarded tutor in the loop. PARALLAX targets exactly that intersection: it keeps
the content quality and flag-driven motivation of an offensive range, adds the
real telemetry and triage workflow of a defensive range, and binds them to one
session so cause and effect are co-located in space and time.

#fig(caption: "Existing platforms against PARALLAX's design goals")[
  #table(
    columns: 5,
    align: (left, center, center, center, center),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[PLATFORM],
      [Attack], [Defense], [Mentor], [Reset],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Hack The Box],    [✓], [—], [—], [—],
    [TryHackMe],       [✓], [partial], [—], [—],
    [CyberDefenders],  [—], [✓], [—], [—],
    [OWASP Juice Shop],[✓], [—], [—], [—],
    [#text(weight: 700, fill: c-navy)[PARALLAX]], [✓], [✓], [✓], [#text(fill: c-green)[~8s]],
    table.hline(stroke: 1pt + c-navy),
  )
]
