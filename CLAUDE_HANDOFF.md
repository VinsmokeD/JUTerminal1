# Hand-off Directive for Claude Code

**AGENT ROLE UPDATE**: You are the pure coding engine. Do not spend tokens writing or updating `CONTINUOUS_STATE.md`, progress tracking, or phase documents. Antigravity will handle all planning, document maintenance, and status tracking. You are to write code, execute tests, and stop.

**Current Task: Phase 1/2 Infrastructure Remediation**
1. Docker Desktop is online, but the build for `cybersim-kali:latest` is failing. `apt-get install` cannot locate `python3`, `wireshark-common`, and `tshark` on `kalilinux/kali-rolling:latest`. 
2. Fix `infrastructure/docker/kali/Dockerfile`. (Suggestion: Force `apt-get update --fix-missing` or verify package names for the rolling release).
3. The root `docker-compose up -d` also failed building `backend` or `frontend`. Fix the `backend/Dockerfile` and `frontend/Dockerfile` until the compose stack builds and runs perfectly.
4. When `curl http://localhost/health` succeeds and the stack is stable, run `pytest` to execute the Phase 3 integration tests you wrote.
5. Exit immediately upon success. Leave all documentation, commit messages, and project tracking to Antigravity.
