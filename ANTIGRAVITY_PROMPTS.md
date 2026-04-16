# 🎯 Antigravity Development Prompts (Phase A-F Execution)

**Last Updated**: 2026-04-15 | **Project Status**: Phase A complete (bootstapped)

**NOTICE**: Antigravity focuses on Orchestration, Host execution, and Frontend Design Polish. These prompts are meant for YOU.

---

## 📋 Priority Queue (Antigravity's Tasks)

1. ✅ **Phase A: Foundation Boot & Docker Fixes** — COMPLETE
2. ✅ **Phase D: Frontend Polish & UX Overhaul** — COMPLETE (Just finished implementing Tailored SOC aesthetics, grid SIEM event rows, and transparent dual-pane variables)
3. ⏳ **Phase F: Demo Document Polish**

---

# PROMPT 1: Phase A — Foundation Boot
```text
MISSION: Antigravity, get the Docker system running gracefully on the host OS.

CONTEXT:
Claude's code cannot run inside a broken container. The primary blocker is `infrastructure/docker/kali/Dockerfile` utilizing problematic `apt-get` calls, and Docker Desktop potentially not routing properly.

GOAL:
1. Ask the User to ensure Docker Desktop is running locally.
2. Edit `infrastructure/docker/kali/Dockerfile`. Remove or pin problematic `kali-rolling` packages if necessary. Add `--fix-missing`.
3. Try running `docker-compose build`. If it succeeds, run `docker-compose up -d postgres redis backend frontend nginx`.
4. Perform smoke tests by running `curl http://localhost:8000/health`.

DELIVERABLES:
- Green light on all primary infrastructure containers.
```

---

# PROMPT 2: Phase D — Frontend Polish & UI Aesthetics
```text
MISSION: Antigravity, utilize your Tailwind CSS and React component prowess to ensure CyberSim wows users instantly upon loading.

CONTEXT:
The frontend exists but may be functionally styled or lack a professional, coherent "Dark Mode UI."

GOAL:
1. Overhaul the styling using standard Tailwind (`slate-900`, `cyan-500` accents, gradient meshes).
2. Enhance `Dashboard.jsx`, ensuring scenario cards look premium.
3. Rework `RedWorkspace.jsx` and `BlueWorkspace.jsx` layout so Red terminal acts fully resizable via `xterm.js`, and Blue feed updates instantly.
4. Convert `AttackTimeline.jsx` into a dual-axis SVG to clearly link offensive actions with defensive telemetry.

DELIVERABLES:
- Modern, professional UI.
```

---

# PROMPT 3: Phase F — Demo Script & Finalization
```text
MISSION: Antigravity, prepare everything for Demo Day.

CONTEXT:
The codebase is solid. We need clear documentation for the academic demo.

GOAL:
1. Validate architecture diagrams in the markdown docs.
2. Write a clear, 1-page runbook detailing how to demo CyberSim in under 10 minutes.

DELIVERABLES:
- Demo runbook.
```
