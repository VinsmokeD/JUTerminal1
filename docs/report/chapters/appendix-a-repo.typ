#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "A", title: "Appendix A — Repository Layout", lead: "")

The repository is a single-node monorepo. The directories that matter for this
report:

#codefile(name: "repository layout", lang: "")[
```
JUTerminal1/
  backend/                FastAPI app
    src/
      main.py             app entry; router registration; startup
      auth/               registration, login, JWT, profile
      sessions/           session lifecycle, ROE, readiness, flags
      ws/                 WebSocket: terminal, hints, live events
      sandbox/            Docker orchestration, PTY streaming, readiness
      scenarios/          YAML loader, gating, hints, output patterns
      siem/               event maps, rules, command->event bridge, forensics
      ai/                 context_builder, security, monitor, level_classifier
      scoring/            scoring engine + routes
      reports/            debrief + report generation
      instructor/         analytics, monitoring, grade export
      db/database.py      SQLAlchemy models
    tests/                pytest suites (unit, integration, ai, e2e)
    migrations/           Alembic migration chain
  frontend/               React + Vite SPA
    src/
      pages/              Auth, Dashboard, Red/BlueWorkspace, Debrief, Instructor
      components/         terminal, siem, notes, hints, workspace, ui
      store/              Zustand state slices
      hooks/              useWebSocket, useTerminal, useScenario
  infrastructure/
    docker/scenarios/     sc01 / sc02 / sc03 builds
    nginx/  postgres/  docker/siem (filebeat)  caddy/
  docs/
    final-report/         Extended technical reference set (DOCX package)
    report/               This Typst report (theme, components, diagrams, chapters)
  docker-compose.yml      Core stack + three scenario profiles
  scripts/                demo_check.py, verify-network-isolation.sh, demo-deploy.sh
```
]
