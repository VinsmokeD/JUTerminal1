# CyberSim Architecture

## System Overview

CyberSim is a dual-perspective cybersecurity training platform built with a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                 │
│  - Red Team Workspace (Kali terminal + notes + methodology)    │
│  - Blue Team Workspace (SIEM console + IR playbook)            │
│  - Dashboard (scenario selection + briefing)                    │
│  - Debrief (scoring + kill chain timeline)                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │ WebSocket + HTTP
                                 │
                    ┌────────────▼────────────┐
                    │   Nginx (Reverse Proxy)  │
                    │  CORS + SSL (prod)       │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                  Backend (FastAPI + Python 3.11)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Routes & Controllers                                    │   │
│  │  - Auth (JWT)  - Sessions  - Scenarios  - Reports      │   │
│  │  - Notes       - Scoring   - WebSocket  - AI Monitor    │   │
│  └────────┬────────────────────────────────────────────────┘   │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐ │
│  │ Business Logic                                            │ │
│  │  - Scenario Engine    - Terminal Proxy  - Event Creator  │ │
│  │  - Discovery Tracker  - Hint Engine     - Scoring Engine │ │
│  │  - Report Generator   - Sandbox Manager                  │ │
│  └────────┬──────────────────────────────────────────────────┘ │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐ │
│  │ Data Layer                                                │ │
│  │  - PostgreSQL (sessions, users, notes, reports)          │ │
│  │  - Redis (terminal I/O, events, hints cache, discovery)  │ │
│  │  - YAML/JSON (scenario specs, SIEM events, hints)        │ │
│  └────────┬──────────────────────────────────────────────────┘ │
│           │                                                     │
└───────────┼────────────────────────────────────────────────────┘
            │
     ┌──────┴──────┬──────────────┬──────────────────┐
     │             │              │                  │
   ┌─▼──┐    ┌────▼───┐    ┌─────▼──────┐     ┌─────▼─────┐
   │ Docker  │ Postgres │  │  Redis     │  │ Gemini API │
   │ (Kali)  │ Database │  │ Real-time  │  │ (AI hints) │
   └────┘    └──────────┘  │ message Q  │  └────────────┘
             (Session      └────────────┘
              state)
```

## Core Components

### 1. Frontend (React + Vite + Tailwind)

**Technology Stack**:
- React 18 with functional components
- Zustand for state management (not Redux)
- xterm.js for Kali terminal emulation
- Tailwind CSS for styling
- Vite for fast HMR development

**Key Features**:
- **Terminal Component**: Real-time WebSocket connection to backend, command history, syntax highlighting
- **SIEM Console**: Interactive event feed with filtering, JSON expansion, IOC extraction
- **Note-Taking**: Guided templates for red/blue team phases, auto-save, tagging
- **AI Tutor Panel**: Hint system with L1/L2/L3 levels, skill-level adaptation
- **Dashboard**: Scenario cards, active sessions, mission briefing modal
- **Debrief**: Score card, findings table, kill chain timeline, performance stats

**Store Architecture**:
```javascript
useAuthStore         // user, email, skillLevel, onboardingCompleted
useSessionStore      // activeScenario, aiMode, discoveries
useNotesStore        // notes, templates, tags
```

### 2. Backend (FastAPI + Python 3.11)

**Technology Stack**:
- FastAPI with async/await
- SQLAlchemy ORM (PostgreSQL)
- Pydantic for validation
- aioredis for async Redis
- google-generativeai for Gemini Flash

**API Routes**:
```
/auth/
  POST /register          - Create user account
  POST /login             - JWT token generation
  PUT /profile            - Update user settings
  GET /me                 - Current user info

/sessions/
  POST /start             - Start new scenario session
  GET /{id}               - Get session state
  POST /{id}/end          - End session, calculate score

/scenarios/
  GET /                   - List all scenarios
  GET /{id}               - Get scenario details

/ws                       - WebSocket endpoint (terminal I/O)

/notes/
  GET /                   - List notes
  POST /                  - Save note
  DELETE /{id}            - Delete note

/reports/
  GET /{session_id}       - Generate debrief report

/health                   - Health check
```

**Key Services**:

#### Terminal Proxy (`backend/src/sandbox/terminal.py`)
- Manages Docker exec connections to Kali containers
- Bidirectional I/O through Redis channels
- Command history replay on reconnect
- Mock terminal fallback if Docker unavailable
- SSH support for remote containers

#### Scenario Engine (`backend/src/scenarios/engine.py`)
- Loads YAML scenario definitions
- Validates attack paths and objectives
- Provides dynamic hints via hint_engine.py
- Tracks phase progression
- Manages network provisioning

#### Event Engine (`backend/src/siem/engine.py`)
- Parses terminal commands for indicators
- Maps commands to SIEM event templates
- Publishes events to Redis for defender
- Tracks discovery state (services, vulns, creds)

#### AI Monitor (`backend/src/ai/monitor.py`)
- Calls Gemini Flash with contextual prompts
- Rate-limited (cooldown per session)
- Provides adaptive hints based on skill level
- Fallback to static hints if API unavailable
- Token-limited responses (150-400 tokens)

#### Discovery Tracker (`backend/src/ai/discovery_tracker.py`)
- Parses pentesting tool output (nmap, gobuster, sqlmap, etc.)
- Extracts: services, vulnerabilities, credentials, attack paths
- Stores in Redis for real-time access
- Feeds into AI context for smart hints

#### Context Builder (`backend/src/ai/context_builder.py`)
- Assembles complete context payload for AI:
  - Scenario knowledge (targets, routes, vulns)
  - Student discoveries (what they've found)
  - Command history (recent activity)
  - Phase timing (how long in each phase)
  - Behavioral signals

### 3. Database (PostgreSQL)

**Schema**:
```sql
users
  - id, email, password_hash, skill_level, onboarding_completed

sessions
  - id, user_id, scenario_id, status, start_time, end_time
  - ai_mode (LEARN/CHALLENGE), score, grade

notes
  - id, session_id, phase, content, tags, evidence_linked

reports
  - id, session_id, score, grade, kill_chain_json, findings

auto_evidence
  - id, session_id, tool_name, discovery_type, value

siem_triage
  - id, session_id, event_id, analyst_notes, status
```

### 4. Cache & Real-Time (Redis)

**Channels**:
```
terminal:{session_id}:input    - Student typing
terminal:{session_id}:output   - Command responses
siem:events:{session_id}       - Defender SIEM events
hints:{session_id}             - Hint system state
discovery:{session_id}         - Defender discovery state
noise:{scenario_id}            - Daemon daemon publishing noise events
```

**Storage**:
```
discovery:{session_id}:services       - Set of found services
discovery:{session_id}:vulns          - Set of found vulnerabilities
discovery:{session_id}:credentials    - Set of found creds
command_history:{session_id}          - List of past commands
```

### 5. Scenario Containers (Docker)

**Kali (Attacker)**
- Type: Docker container (debian-based)
- Tools: Full pentesting toolkit (nmap, Burp, Metasploit, etc.)
- Network: Isolated scenario network (172.20.X.0/24)
- Volumes: /mnt/target-data (target files)

**Target Containers (per scenario)**
- SC-01: Ubuntu with vulnerable web app (Flask + SQLite)
- SC-02: Windows Server with Active Directory
- SC-03: Mail server + web server
- SC-04: AWS-simulated (isolated containers, not real AWS)
- SC-05: Multi-container with Splunk SIEM

**Network Isolation**:
```
Scenario Network (172.20.X.0/24)
├── Kali (172.20.X.10)
├── Target-1 (172.20.X.20)
├── Target-2 (172.20.X.21)
└── Target-3 (172.20.X.22)

iptables rules:
- No internet egress except DNS
- No ingress from outside scenario network
- Defender (host) can only sniff, not execute
```

## Data Flow

### Scenario Start
```
User clicks "Start" → POST /sessions/start
    ↓
Backend creates session record, provisions Docker containers
    ↓
Stream WebSocket connection: 'session_started' → frontend stores session_id
    ↓
Terminal connects, pulls command history from Redis
    ↓
Kali banner displays, "Ready for input" prompt
```

### User Types Command
```
Student types in xterm.js → keypress event → WebSocket send to backend
    ↓
Backend receives on WS, parses command
    ↓
Proxies to Docker exec API → command runs in Kali container
    ↓
Output captured, stored in Redis terminal:{session_id}:output
    ↓
WS stream sends output back → xterm.js renders
    ↓
Discovery tracker parses output for indicators (nmap ports, SQL errors, etc.)
    ↓
Event engine creates SIEM events → Redis pub/sub
    ↓
Defender's WS subscription receives events → SIEM panel updates
    ↓
AI monitor receives command context → Gemini Flash → hint suggestion
    ↓
L1/L2/L3 penalty calculated based on skill level
```

### Scenario End
```
Student clicks "End Scenario" → POST /sessions/{id}/end
    ↓
Backend stops Docker containers, generates final event list
    ↓
Scoring engine calculates: discovery %, completion time, hints used
    ↓
Report generator produces: kill chain JSON, findings list, grade
    ↓
Frontend navigates to Debrief page with report
```

## Scenario Design

### YAML Structure
```yaml
scenario:
  id: SC-01
  name: NovaMed Healthcare Portal
  description: Penetration test a web application
  difficulty: Intermediate
  duration_minutes: 60
  
red_team:
  role: Penetration Tester
  objectives:
    - Gain unauthorized access to patient database
    - Extract sensitive information
    - Escalate privileges
    
blue_team:
  role: SOC Analyst
  objectives:
    - Detect attack based on SIEM events
    - Document incident timeline
    - Recommend remediation
    
targets:
  - host: webapp-01
    ip: 172.20.1.20
    services:
      - http:8080
      - ssh:22
    vulnerabilities:
      - CVE-2021-44228
      - CWE-89 (SQL Injection)
      - CWE-434 (Unrestricted Upload)
```

### SIEM Event Mapping
```json
{
  "nmap_scan": {
    "event": "Network Reconnaissance",
    "severity": "LOW",
    "category": "recon"
  },
  "sql_injection_attempt": {
    "event": "SQL Injection Attack",
    "severity": "CRITICAL",
    "category": "exploitation"
  }
}
```

### Hint System
Three-level hint hierarchy:
- **L1**: Conceptual nudge ("What networking tool could you use?")
- **L2**: Tactical hint ("Try port scanning on 172.20.1.0/24")
- **L3**: Solution hint ("Open http://172.20.1.20:8080 in your browser")

Penalties by skill level:
- Beginner: L1 -2pts, L2 -5pts, L3 -10pts
- Intermediate: L1 -5pts, L2 -10pts, L3 -20pts
- Experienced: L1 -10pts, L2 -20pts, L3 -40pts

## Security Considerations

### Container Isolation
- Containers run as unprivileged user
- Network namespaces prevent cross-scenario contamination
- Volume mounts read-only except /tmp
- Resource limits: 1 CPU, 512MB RAM

### Secret Management
- JWT secrets 64-char hex, environment-based
- Gemini API keys never committed to git
- Database passwords hashed with bcrypt
- WebSocket connections require valid JWT

### Input Validation
- All user input validated with Pydantic
- SQL queries use parameterized statements
- Command shell escaping with shlex
- File uploads scanned for malicious content

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Images optimized with next-image (future)
- Gzip compression via Nginx
- Service Worker caching (future)
- Virtual scrolling for large event lists

### Backend
- Connection pooling (asyncpg)
- Redis caching for SIEM events (5 min TTL)
- Async/await throughout
- Database query optimization with indices
- Hint JSON pre-compiled on startup

### Infrastructure
- Multi-worker Uvicorn deployment (prod)
- Nginx load balancing (prod)
- Horizontal scaling via Docker Swarm/K8s (future)
- CDN for static assets (future)

## Deployment Architecture

### Development
```
localhost:3000 (Frontend)
localhost:8000 (Backend)
localhost:5432 (Postgres)
localhost:6379 (Redis)
```

### Production
```
cdn.example.com → Nginx (TLS)
                    → Backend (Uvicorn x3)
                    → Postgres (RDS)
                    → Redis (ElastiCache)
                    → Docker Swarm (scenarios)
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production setup.

## Extensibility

### Adding a New Scenario
1. Create YAML in `docs/scenarios/`
2. Create Docker Compose in `infrastructure/docker/scenarios/`
3. Map SIEM events in `backend/src/siem/events/`
4. Add hints in `backend/src/scenarios/hints/`
5. Update frontend scenario list

### Adding a New Hint Source
1. Implement AI provider interface (see `backend/src/ai/monitor.py`)
2. Add fallback logic in hint request handler
3. Update system prompt if needed
4. Test with multiple skill levels

### Adding a Blue Team Feature
1. Add SIEM dashboard component in frontend
2. Extend event schema in backend
3. Create new route if needed
4. Update Debrief with new metric

## Monitoring & Observability

### Metrics to Track (Future)
- Session completion rate
- Average session duration
- Hint usage patterns (by skill level)
- SIEM event accuracy (false positives)
- API response times
- Container resource usage
- Gemini API quota usage

### Logging
- Backend: Python logging to stdout → Docker logs
- Frontend: Browser console + sentry (future)
- Database: Postgres logs
- Containers: Docker logs per service

See [docs/architecture/](architecture/) for detailed specs.
