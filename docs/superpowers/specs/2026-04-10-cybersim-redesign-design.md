# CyberSim Platform Redesign — Full Design Spec

**Date:** 2026-04-10  
**Approach:** Layered Experience (Approach C)  
**Timeline:** 1-2 months  
**Target audience:** All skill levels (beginner to experienced)

---

## 1. AI Brain — Context-Aware Adaptive Tutor

### Problem
The AI monitor currently receives only: scenario_id, role, phase, methodology, current_action, hint_level. It has no knowledge of the target environment, student history, notes, or behavioral patterns.

### Solution
Replace the minimal context payload with a full-context system that gives the AI complete situational awareness.

### AI Context Payload (assembled by backend per request)

```yaml
scenario_id: SC-01
role: red
phase: 2
phase_duration_minutes: 14
methodology: ptes
skill_level: beginner          # from user profile
mode: learn                     # "learn" or "challenge" — student toggleable

target_environment:             # loaded from scenario YAML
  network: 172.20.1.0/24
  hosts:
    - ip: 172.20.1.20
      services: [ssh:22, http:80/Apache2.4.54/PHP8.1, https:443, mysql:3306]
      vulns: [sqli_login_form, lfi_records_page, idor_patient_ids, unrestricted_upload]
    - ip: 172.20.1.21
      services: [mysql:3306]
    - ip: 172.20.1.1
      services: [http:80/ModSecurity_WAF]

discovered_services: [http:80, ssh:22]    # parsed from student's nmap output
discovered_paths: [/login, /admin, /backup, /records, /uploads]
discovered_vulns: []

command_history:                # last 20 commands + truncated output
  - {cmd: "nmap -sV 172.20.1.20", output_summary: "Found 4 open ports", ts: "10:01"}
  - {cmd: "gobuster dir -u ...", output_summary: "Found 9 paths", ts: "10:04"}

notes_summary: "Found Apache server on port 80 running PHP"
note_count: 1
has_findings: false
has_evidence: false

commands_this_phase: 2
time_since_last_command_seconds: 45
repeated_commands: 0
hint_requests_total: 0
current_action: "curl -I http://172.20.1.20/records/?file=test"
hint_level_requested: null
```

### Backend Implementation

- **New file:** `backend/src/ai/context_builder.py` — assembles full AI payload
- **New file:** `backend/src/ai/discovery_tracker.py` — parses terminal output to track what student has found
- **Modified:** `backend/src/ai/monitor.py` — uses full payload instead of minimal context
- **Modified:** `backend/src/ws/routes.py` — passes full context on each AI call
- **Data sources:**
  - `target_environment` → scenario YAML files
  - `discovered_*` → parsed from Redis terminal history via discovery_tracker
  - `command_history` → Redis capped list (already exists)
  - `notes_summary` → Postgres notes table
  - `behavioral signals` → Redis timestamps + counters

### Mode Toggle

- Student can switch between "Learn" and "Challenge" modes via a toggle in the AI panel
- **Learn mode:** AI explains concepts, gives step-by-step guidance, suggests next actions
- **Challenge mode:** AI stays Socratic, asks questions, never gives direct answers
- **Adaptive escalation:** In Challenge mode, if phase_duration > 20min AND commands_this_phase < 3, AI offers to switch to Learn mode

### Discovery Tracker Logic

Parses command output for key patterns:
- `nmap` output → extract open ports and service versions
- `gobuster` output → extract discovered paths
- `sqlmap` output → mark vuln as discovered
- `bloodhound` output → extract users, SPNs, relationships
- `curl` headers → extract server info
- Generic keyword matching: `vulnerable`, `injectable`, `cracked`, `found`

---

## 2. Onboarding & Adaptive Difficulty

### Problem
Beginners land on scenario selection with zero explanation. Terms like PTES, OWASP, Kerberoasting are used without context.

### Skill Assessment (first login only)

Single screen after first login:

> "Welcome to CyberSim. How would you describe your experience?"
> - **Beginner** — "I know what cybersecurity is but haven't done hands-on work"
> - **Intermediate** — "I've used tools like nmap, maybe done CTFs"
> - **Experienced** — "I'm comfortable with pentest methodology and SIEM analysis"

Stored as `skill_level` on user profile. Changeable anytime in settings.

### Adaptive Behavior Matrix

| Feature | Beginner | Intermediate | Experienced |
|---------|----------|-------------|-------------|
| AI default mode | Learn | Challenge (soft) | Challenge (strict) |
| Scenario intro | Full walkthrough with glossary | Key objectives | Just targets |
| Terminal | Suggested first command shown | Available tools listed | Bare prompt |
| Note-taking | Guided templates pre-filled | Templates available | Blank notebook |
| Methodology picker | PTES pre-selected with explanation | All options described | All options, no desc |
| Hint penalty | -2, -5, -10 | -5, -10, -20 | -10, -20, -40 |

### Scenario Mission Briefing (replaces launch modal)

Full-page briefing before each scenario:
- Plain-English description of what the scenario teaches
- Visual network diagram (SVG) showing targets
- "What you'll learn" bullets
- Glossary sidebar for beginners (defines SQLi, LFI, Kerberoasting, etc.)
- Role recommendation for beginners
- Methodology explanation for beginners

### In-Workspace Welcome (beginner mode only)

On first workspace entry:
- Dismissible overlay explaining the 4 panels
- Terminal shows banner + suggested first command
- Notebook pre-filled with phase template
- AI panel shows proactive welcome message

### Database Changes

- Add `skill_level VARCHAR(20) DEFAULT 'beginner'` to users table
- Add `ai_mode VARCHAR(20) DEFAULT 'learn'` to sessions table

---

## 3. Smart Note-Taking & Guided Reporting

### Problem
Notebook is a text box with tags. Students don't know what to write, when, or how.

### Phase-Aware Note Templates

Each phase has a structured template. Example (Red Team SC-01 Phase 2):

```markdown
## Enumeration Findings
### Web Directories Found
- Path:          Status:          Interesting? (y/n):
### Technology Stack
- Web Server:
- Language:
- Database:
- WAF/Proxy:
### Potential Attack Vectors
-
### Evidence
[Auto-captured terminal output appears here]
```

Toggle between **Guided** (template) and **Freeform** modes.

### Auto-Evidence Capture

When significant command output is detected, a toast appears:
> "nmap found 4 open ports — Save as evidence?" [Save] [Dismiss]

Triggers:
- `nmap` scan completion → ports summary
- `sqlmap` injection found → vuln confirmation
- `gobuster` paths found → directory listing
- `hashcat` crack → credential discovery
- Keywords: `vulnerable`, `injected`, `cracked`, `pwned`, `found`

### AI Note-Coaching

AI monitors note-taking behavior:
- No notes after 5 commands → nudge to document
- Notes without #finding tags → suggest tagging confirmed vulns
- Sparse notes at phase change → warn about incomplete documentation

### Guided Report Builder (Debrief)

**Red Team Report:**
1. Executive Summary — auto-generated from findings, student edits narrative
2. Scope & Methodology — pre-filled from session
3. Findings Table — from #finding notes + CVSS helper
4. Attack Narrative — timeline from command log, student adds "why"
5. Evidence — compiled #evidence notes
6. Recommendations — remediation templates

**Blue Team Report:**
1. Incident Summary — from SIEM events triaged
2. Detection Timeline — from flagged events
3. IOC List — from Investigation panel
4. Root Cause Analysis — guided template
5. Containment Actions — from playbook checklist
6. Recommendations — hardening templates

**Export:** Markdown + PDF with CyberSim branding header.

### New Files
- `backend/src/notes/templates.py` — phase-aware templates per scenario/role
- `backend/src/reports/pdf_generator.py` — PDF export with branding
- `frontend/src/components/notes/GuidedNotebook.jsx` — template-aware notebook
- `frontend/src/components/notes/AutoEvidence.jsx` — toast + auto-capture
- `frontend/src/pages/ReportBuilder.jsx` — structured report page (replaces simple Debrief)

---

## 4. Interactive Blue Team Experience

### Problem
Red Team has a terminal. Blue Team has a passive scrolling SIEM feed and checkboxes. Not equal.

### SIEM Query Console

Replace the passive SiemFeed with an interactive console:
- **Search bar** with query syntax: `severity:CRITICAL`, `source_ip:172.20.1.10`, `event_id:4769`
- **Filter chips** for quick filtering: severity level, event type, time range
- **Click-to-expand** on any event shows full JSON payload with field explanations
- **Correlation view** button groups related events by source IP or time window
- **Drag IOC** from any event field directly to Investigation panel

### Investigation Workflow

Upgrade from simple IOC text input to structured workflow:
- **IOC extraction** — click any IP, hash, domain, or email in SIEM events to extract
- **IOC enrichment** — simulated enrichment panel shows basic context (is this IP internal/external? is this hash known malicious?)
- **Investigation timeline** — auto-builds as student flags events and extracts IOCs
- **Containment actions** — structured checklist with radio buttons: "Block IP at firewall", "Isolate host", "Disable account", "Preserve logs"

### Blue Team AI Context

The AI receives Blue-Team-specific context:
- Events triaged vs total events
- IOCs extracted
- Playbook steps completed
- False positive / true positive classifications made
- Time spent on each NIST phase

### New/Modified Files
- `frontend/src/components/siem/SiemConsole.jsx` — replaces SiemFeed.jsx, adds query/filter/expand
- `frontend/src/components/siem/EventDetail.jsx` — expanded event view with field explanations
- `frontend/src/components/siem/CorrelationView.jsx` — grouped event display
- `frontend/src/components/investigation/InvestigationWorkflow.jsx` — replaces simple InvestigationPanel
- `frontend/src/components/investigation/IocCard.jsx` — enriched IOC display

---

## 5. Professional UI/UX Theme & Branding

### Visual Identity

- **Logo:** Shield icon with terminal cursor inside. Text: "CyberSim" in Inter font
- **Color system:**
  - Primary: Cyan (#06b6d4) — links, active states, Blue Team accent
  - Red Team accent: Rose (#f43f5e) — Red Team indicators
  - Blue Team accent: Teal (#14b8a6) — Blue Team indicators
  - Surface: Slate-900 (#0f172a) for cards, Slate-950 (#020617) for backgrounds
  - Text: Slate-100 (#f1f5f9) primary, Slate-400 (#94a3b8) secondary
- **Typography:** Inter for UI, JetBrains Mono for terminal/code
- **Border radius:** 8px for cards, 6px for buttons, 4px for tags

### Dashboard Redesign

- Hero section with CyberSim logo, tagline: "Learn to attack. Learn to defend."
- Scenario cards with cover images (abstract network diagrams), difficulty badges, duration
- Progress indicators showing completion percentage per scenario
- Quick-resume bar for active sessions
- Skill level indicator in top nav (with change option)

### Workspace Chrome

- Panel headers with icon + title + status indicator
- Subtle gradient borders on active panels
- Resizable panel dividers (drag handles)
- Session timer in top bar
- Mode indicator (Learn/Challenge) in top bar with toggle

### Auth Page

- Split layout: left side branding/illustration, right side login form
- University-friendly: clean, trustworthy, not "hacker aesthetic"

---

## 6. Workspace Layout Rework

### Red Team Workspace

```
+--------------------------------------------------+
| [CyberSim] SC-01 NovaMed | Phase: 2 Enum | Learn | Score: 85 | Timer: 14:23 | [Debrief] |
+----------------------------------+-----------------+
|                                  |  AI Tutor       |
|  Kali Terminal (60%)             |  [Learn/Challenge toggle]
|                                  |  Current hint...  |
|                                  |  [L1] [L2] [L3]  |
|                                  +-----------------+
|                                  |  SIEM Peek      |
|                                  |  (last 5 events)|
|                                  |  [Open full →]  |
+----------------------------------+-----------------+
|  Notebook (Guided/Freeform)      | Learning Context|
|  [#finding] [#evidence] [#ioc]   | Phase 2 — PTES  |
|  Template or freeform...         | Tools: nmap...  |
+----------------------------------+-----------------+
```

- Terminal takes 60% of width, always visible
- AI tutor always visible in sidebar (no more hidden behind tab)
- SIEM peek shows last 5 events (Red needs to see what alerts they're triggering)
- Notebook and context at bottom

### Blue Team Workspace

```
+--------------------------------------------------+
| [CyberSim] SC-01 NovaMed | NIST: Detect | Learn | Score: 72 | 3 CRITICAL | [Close Incident] |
+----------------------------------+-----------------+
|                                  |  IR Playbook    |
|  SIEM Console (60%)              |  [ ] Step 1...  |
|  [Search bar: severity:HIGH]     |  [x] Step 2...  |
|  Event list with expand...       |  [ ] Step 3...  |
|                                  +-----------------+
|                                  |  AI Tutor       |
|                                  |  [Learn/Challenge]
|                                  |  Guidance...    |
+----------------------------------+-----------------+
|  Investigation Workflow           | NIST Guidance   |
|  IOCs: [172.20.1.10] [hash...]   | Phase 2—Detect  |
|  Containment: [x] Block IP       | Instructions... |
+----------------------------------+-----------------+
```

- SIEM console takes 60%, interactive query + filter
- Playbook and AI in sidebar
- Investigation workflow at bottom with IOCs and containment actions

### Responsive Behavior
- Minimum width: 1024px (warn on smaller)
- Panels collapse to tabs on narrow screens

---

## 7. AI System Prompt Rewrite

### Key Changes from Current Prompt

1. **Add mode awareness:** Detect `mode: learn` vs `mode: challenge` and adjust response style
2. **Add skill level awareness:** `skill_level: beginner` gets simpler vocabulary, more explanation
3. **Add full target knowledge:** AI knows all services, vulns, attack paths — can give precise guidance
4. **Add discovery tracking:** AI knows what student found vs. what's hidden — nudges toward unexplored areas
5. **Add note-coaching:** AI monitors documentation habits and nudges
6. **Add step-by-step capability (Learn mode):** In Learn mode, AI can explain concepts and suggest specific next actions (still no raw commands with all flags)
7. **Add Blue Team parity:** Equal depth of guidance for SOC analysis, not just pentesting

### Learn Mode Response Format

```
[Concept] Brief explanation of what this technique/concept is and why it matters.
[What to do] Plain-English description of the next step.
[What to look for] What the output should tell you.
[Pro tip] One professional habit relevant to this step.
```

### Challenge Mode Response Format (unchanged from current)

1-3 paragraphs, always ends with a question. No direct answers.

---

## 8. Architecture Changes Summary

### New Backend Services

| Service | File | Purpose |
|---------|------|---------|
| Context Builder | `backend/src/ai/context_builder.py` | Assembles full AI payload from all data sources |
| Discovery Tracker | `backend/src/ai/discovery_tracker.py` | Parses terminal output to track student discoveries |
| Note Templates | `backend/src/notes/templates.py` | Serves phase-aware templates per scenario/role/skill |
| PDF Generator | `backend/src/reports/pdf_generator.py` | Generates branded PDF reports |
| Skill Profile | `backend/src/auth/profile.py` | Manages skill_level and preferences |

### New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai/context/{session_id}` | Full AI context payload (internal use) |
| PUT | `/api/sessions/{session_id}/mode` | Toggle learn/challenge mode |
| GET | `/api/notes/template/{scenario_id}/{phase}/{role}` | Get note template |
| POST | `/api/notes/auto-evidence` | Save auto-captured evidence |
| GET | `/api/reports/{session_id}/structured` | Get structured report data |
| POST | `/api/reports/{session_id}/pdf` | Generate PDF report |
| PUT | `/api/auth/profile` | Update skill level and preferences |
| GET | `/api/siem/{session_id}/query` | Query SIEM events with filters |
| GET | `/api/siem/{session_id}/correlate` | Get correlated event groups |

### Database Schema Changes

```sql
-- Users table additions
ALTER TABLE users ADD COLUMN skill_level VARCHAR(20) DEFAULT 'beginner';
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Sessions table additions
ALTER TABLE sessions ADD COLUMN ai_mode VARCHAR(20) DEFAULT 'learn';

-- New: auto_evidence table
CREATE TABLE auto_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    command TEXT NOT NULL,
    output_summary TEXT NOT NULL,
    tool_name VARCHAR(50),
    tag VARCHAR(20) DEFAULT 'evidence',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- New: siem_triage table (Blue Team event classification)
CREATE TABLE siem_triage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    event_id VARCHAR(100) NOT NULL,
    classification VARCHAR(20), -- true_positive, false_positive, needs_investigation
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Data Flow: AI Context Assembly

```
Terminal command submitted
    │
    ├──► Redis terminal:{id}:history (existing)
    │
    ├──► Discovery Tracker
    │       ├── parse output for services, paths, vulns
    │       └── update Redis discovery:{id}:services, discovery:{id}:paths, discovery:{id}:vulns
    │
    ├──► Context Builder (assembles payload)
    │       ├── Read target_environment from scenario YAML cache
    │       ├── Read discovered_* from Redis
    │       ├── Read command_history from Redis (last 20)
    │       ├── Read notes from Postgres
    │       ├── Compute behavioral signals from Redis timestamps
    │       └── Return full AI context dict
    │
    └──► AI Monitor (existing, now uses full context)
            ├── Format context as structured prompt
            ├── Call Gemini with mode-aware system prompt
            └── Return hint/guidance
```
