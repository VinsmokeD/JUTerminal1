#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "05", title: "Scenarios",
  lead: "Three self-contained environments, each calibrated to a specific learning arc, behind a gated methodology.")

== Gated methodology
Every scenario advances through ordered methodology phases, and the scenario
engine gates each transition: a student cannot run an exploit tool while still in
the reconnaissance phase. Attempting an out-of-phase action raises a gate-block
warning and a scoring penalty. The Red-Team track follows a PTES-style
progression — Reconnaissance, Scanning and Enumeration, Exploitation,
Post-Exploitation — and the Blue-Team track mirrors a simplified
incident-response lifecycle.

#fig(caption: "Dual-track gated methodology shared by all scenarios")[
  #phase-ladder()
]

#fig(caption: "Red-Team offensive methodology flow and notes check-gates")[
  #red-team-methodology-diagram()
]

#fig(caption: "Blue-Team incident response workflow: from SIEM alert to reporting")[
  #blue-team-ir-workflow-diagram()
]

== Scenario blueprint
The three scenarios span web, identity, and human-factor attack surfaces:

#fig(caption: "Scenario blueprint comparison")[
  #table(
    columns: (auto, 1fr, 1fr, 1fr),
    align: (left, left, left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 8.5pt, fill: c-slate, tracking: 0.14em, weight: 500)[ATTRIBUTE],
      text(font: font-mono, size: 8.5pt, fill: c-red, tracking: 0.14em, weight: 500)[SC-01 NOVAMED],
      text(font: font-mono, size: 8.5pt, fill: c-red, tracking: 0.14em, weight: 500)[SC-02 NEXORA],
      text(font: font-mono, size: 8.5pt, fill: c-red, tracking: 0.14em, weight: 500)[SC-03 ORION],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Domain],    [OWASP web app],        [Active Directory],     [Phishing / forensics],
    [Network],   [`172.20.1.0/24`],      [`172.20.2.0/24`],      [`172.20.3.0/24`],
    [Target],    [`.20` web portal],     [`.20` domain controller], [`.10` campaign server],
    [Stack],     [Apache / PHP / MariaDB],[Samba4 AD DC],        [GoPhish / Postfix],
    [Tooling],   [nmap, whatweb, gobuster], [impacket, smbclient, bloodhound], [swaks, curl, dig],
    [Telemetry], [ModSecurity WAF logs], [Samba auth/audit logs],[Postfix mail / endpoint JSON],
    table.hline(stroke: 1pt + c-navy),
  )
]

== SC-01 — NovaMed Healthcare #tag("Intermediate", color: c-amber)
A vulnerable Apache/PHP application over a MariaDB database, fronted by a
ModSecurity (OWASP CRS) WAF acting as a transparent reverse proxy. Scanning
traffic hits the WAF, whose audit log feeds Filebeat; the defender reconstructs
the offending request from the WAF and Apache logs.

#fig(caption: "SC-01 NovaMed topology (web application + WAF)")[
  #sc-topology("SC-01 NovaMed", "172.20.1.0/24",
    (("ModSecurity WAF", "172.20.1.1"), ("Web portal", "172.20.1.20"), ("MariaDB", "172.20.1.21")),
    c-amber)
]

#tag("T1190", color: c-red) #tag("T1083", color: c-red) #tag("T1059", color: c-red)
#tag("ModSecurity", color: c-blue) #tag("Apache logs", color: c-blue) #tag("Filebeat", color: c-blue)

Exploitation paths include SQL injection through a vulnerable search field, local
file inclusion via a routing parameter, and an arbitrary file upload that bypasses
a primitive extension check. *Red objective:* reach the database tier.
*Blue objective:* correlate the ModSecurity audit log with the Apache access log
to reconstruct the request that triggered the alert.

#fig(caption: "SC-01 NovaMed attack-defense telemetry correlation flow")[
  #scenario-sc01-flow-diagram()
]

== SC-02 — Nexora Active Directory #tag("Advanced", color: c-red)
A Samba4 Active Directory domain controller (`nexora.local`) and a member file
server, with low-privilege users (`jsmith`) and service accounts pre-seeded in
the directory. Authentication telemetry feeds the defender view.

#fig(caption: "SC-02 Nexora topology (Active Directory)")[
  #sc-topology("SC-02 Nexora", "172.20.2.0/24",
    (("Samba4 DC", "172.20.2.20"), ("File server", "172.20.2.40")),
    c-red)
]

#tag("T1558.003", color: c-red) #tag("T1003.006", color: c-red) #tag("T1021", color: c-red)
#tag("Samba logs", color: c-blue) #tag("Event 4769", color: c-blue)

Exploitation paths progress from Active Directory enumeration with Impacket,
through Kerberoasting a service principal (for example `svc_backup`), to lateral
movement onto the file server with recovered credentials. *Red objective:* move
from an unprivileged foothold toward domain credentials. *Blue objective:* spot
anomalous Kerberos service-ticket requests and lateral authentication in the
directory telemetry.

== SC-03 — Orion Phishing #tag("Intermediate", color: c-amber)
A GoPhish campaign console communicating through a Postfix SMTP relay to a Python
victim simulator. The victim "opens" a crafted message and executes a simulated
macro, producing mail-relay and endpoint telemetry.

#fig(caption: "SC-03 Orion topology (phishing campaign)")[
  #sc-topology("SC-03 Orion", "172.20.3.0/24",
    (("GoPhish", "172.20.3.10"), ("Postfix relay", "172.20.3.20"), ("Victim sim", "172.20.3.30")),
    c-amber)
]

#tag("T1566.001", color: c-red) #tag("T1204.002", color: c-red) #tag("T1071.001", color: c-red)
#tag("Postfix logs", color: c-blue) #tag("Endpoint JSON", color: c-blue)

Exploitation paths cover campaign design, delivery through the relay, and a
simulated beacon callback after macro execution. *Red objective:* craft and
launch a credential-harvesting campaign. *Blue objective:* trace the delivery in
the Postfix relay logs and the victim's interaction markers to scope the
campaign.

== Scoring model
Each session starts at 100 points and moves with the student's adherence to
methodology and reliance on help. The model rewards genuine milestone capture and
penalizes shortcutting:

#fig(caption: "Scoring engine data ingestion and debrief visualization pipeline")[
  #scoring-and-debrief-flow-diagram()
]

#fig(caption: "Scoring penalties and bonuses (standard / experienced learner)")[
  #table(
    columns: (1.4fr, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[EVENT],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[ADJUSTMENT],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Methodology gate violation],   [#text(fill: c-red)[−5] per blocked attempt],
    [Hint — level 1 (concept)],     [#text(fill: c-red)[−5 / −10]],
    [Hint — level 2 (strategy)],    [#text(fill: c-red)[−10 / −20]],
    [Hint — level 3 (specific)],    [#text(fill: c-red)[−20 / −40]],
    [Incorrect flag submission],    [#text(fill: c-red)[−2] (discourages brute force)],
    [Flag capture — SC-01/02/03],   [#text(fill: c-green)[+25 / +30 / +35] each],
    [Time bonus (under target)],    [#text(fill: c-green)[up to +15] pro-rated],
    table.hline(stroke: 1pt + c-navy),
  )
]

#insight[
  Progressive hint penalties make the AI mentor a deliberate trade rather than a
  free crutch: a learner can always get unstuck, but the score records how much
  scaffolding it took — useful signal for both the student and the instructor.
]
