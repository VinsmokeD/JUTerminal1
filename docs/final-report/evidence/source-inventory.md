# Source Inventory Evidence

This inventory was produced from a scoped Repomix pack so the report can describe the project from the actual workspace instead of memory.

## Repomix Command

```powershell
npx --yes repomix@latest --compress --include "backend/src/**,frontend/src/**,docs/scenarios/**,ai-monitor/**,infrastructure/docker/**,infrastructure/nginx/**,docker-compose.yml,.env.example,README.md" --ignore "**/node_modules/**,**/dist/**,**/.venv/**,**/__pycache__/**,**/.pytest_cache/**" --output ".tmp/final-report/repomix-parallax.xml"
```

## Pack Summary

| Metric | Value |
| --- | --- |
| Files processed | 210 |
| Total tokens | 175,785 |
| Total characters | 641,445 |
| Output path | `.tmp/final-report/repomix-parallax.xml` |
| Security check | No suspicious files detected |

## Largest Source Areas

| Rank | File | Why it matters for documentation |
| --- | --- | --- |
| 1 | `backend/src/siem/events/sc01_events.json` | SC-01 detection event catalog and Red-to-Blue mapping evidence. |
| 2 | `backend/src/scenarios/playbooks/sc03_playbook.md` | SC-03 learner guidance and scenario training flow. |
| 3 | `backend/src/siem/events/sc03_events.json` | SC-03 detection event catalog. |
| 4 | `backend/src/siem/events/sc02_events.json` | SC-02 detection event catalog. |
| 5 | `backend/src/scenarios/playbooks/sc02_playbook.md` | SC-02 learner guidance and Active Directory scenario flow. |

## Included Documentation Domains

| Domain | Main files |
| --- | --- |
| Application entrypoint | `backend/src/main.py` |
| API routing | `backend/src/auth/routes.py`, `backend/src/sessions/routes.py`, `backend/src/notes/routes.py`, `backend/src/reports/routes.py`, `backend/src/instructor/routes.py`, `backend/src/siem/routes.py`, `backend/src/scenarios/routes.py`, `backend/src/ws/routes.py` |
| Database model | `backend/src/db/database.py` |
| Docker sandbox lifecycle | `backend/src/sandbox/manager.py`, `backend/src/sandbox/terminal.py`, `backend/src/sandbox/readiness.py`, `backend/src/sandbox/container_cleanup.py` |
| Scenario engine | `backend/src/scenarios/engine.py`, `backend/src/scenarios/gatekeeper.py`, `backend/src/scenarios/loader.py`, `backend/src/scenarios/hint_engine.py`, `backend/src/scenarios/randomizer.py` |
| AI guidance | `backend/src/ai/monitor.py`, `backend/src/ai/context_builder.py`, `backend/src/ai/security.py`, `ai-monitor/system_prompt.md` |
| SIEM path | `backend/src/siem/engine.py`, `backend/src/siem/command_bridge.py`, `backend/src/siem/events/*.json`, `backend/src/siem/rules/*.yaml`, `infrastructure/docker/siem/filebeat.yml` |
| Frontend workspaces | `frontend/src/pages/RedWorkspace.jsx`, `frontend/src/pages/BlueWorkspace.jsx`, `frontend/src/pages/Debrief.jsx`, `frontend/src/pages/InstructorDashboard.jsx` |
| UI components | `frontend/src/components/terminal/`, `frontend/src/components/siem/`, `frontend/src/components/notes/`, `frontend/src/components/hints/`, `frontend/src/components/workspace/` |
| Scenario specifications | `docs/scenarios/SC-01-webapp-pentest.yaml`, `docs/scenarios/SC-02-ad-compromise.yaml`, `docs/scenarios/SC-03-phishing.yaml` |
| Runtime topology | `docker-compose.yml`, `infrastructure/docker/scenarios/`, `infrastructure/nginx/nginx.conf` |

## Documentation Warnings

- Scenario files intentionally contain training artifacts and lab-only secrets. Do not publish them verbatim in the final report.
- The Repomix pack is a scratch evidence artifact under `.tmp/`; the stable documentation artifact is this inventory file.
- The final report should cite source file paths and behavior, not expose full scenario solution paths.
- SC-04 and SC-05 planning artifacts appear in historical documentation, but the active MVP scope remains SC-01, SC-02, and SC-03 only.

