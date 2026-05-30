# CyberSim Roadmap

## Current State

CyberSim is a feature-complete, multi-part platform: React frontend (V5 Design System), FastAPI backend, Postgres, Redis, Elastic/Filebeat SIEM plumbing, Docker scenario profiles, scenario docs, AI monitor, scoring, reports, and instructor support.

Current assessed completion: 98/100.

## Verified in the 2026-05-30 Pass

- Full Design V5 Enhancement Plan executed successfully (Phases 0 through 6).
- All 3 MVP scenarios (SC-01, SC-02, SC-03) are fully playable, completable, and validated with robust regression tests.
- 334/334 Backend Pytest tests passing.
- 27/27 Frontend Vitest tests passing.
- Frontend ESLint is clean and integrated as a CI gate.
- Backend MyPy is clean (0 errors) and integrated as a CI gate.
- Diagram redesign (Phase 9B) completed with 22 high-fidelity Mermaid diagrams.
- Real terminal WebSocket reconnects reliably and supports live execution inside Kali containers.

## Remaining Verification & Final Polish

| Priority | Work |
| --- | --- |
| P0 | Complete Phase E: Coverage honesty and raising engine coverage to ≥80% |
| P1 | Load testing and final scalability documentation (Phase 12) |
| P1 | Graduation Defense Preparation |

## Product Hardening

- Public docs strictly focused on the three MVP scenarios (SC-04 and SC-05 have been removed).
- Instructor dashboard, AI tutor chat integration, and debrief timeline are fully operational.
- Defense-ready projector compatibility (Performance "Low" mode implemented).

## Graduation Defense Target

CyberSim should be presented as a working local cyber range with a strong safety model, not as a production SaaS. The strongest demo path is:

1. Login (Optionally via returning session).
2. Start SC-01 (NovaMed).
3. Interact with the AI Tutor for guidance.
4. Run safe recon commands in the terminal.
5. Show SIEM event creation in the Blue Team feed.
6. Capture and submit flags via the top bar.
7. End the session.
8. Show debrief timeline, score, and premium PDF/DOCX export.
