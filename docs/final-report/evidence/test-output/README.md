# Test Output Evidence

This folder stores final verification command outputs. Keep raw command output here and summarize only the result in the formal report.

> **Status (2026-06-01):** Previous stale evidence files (documentation-phase-04 and documentation-phase-05 from 2026-05-23) have been removed. Fresh evidence must be generated from the current application state before defense submission.

## Planned Evidence Files

| File | Command | Purpose | Status |
| --- | --- | --- | --- |
| `git-status.txt` | `git status --short && git rev-parse --short HEAD` | Establish the exact source state used for final documentation. | ⏳ Pending |
| `docker-compose-config.txt` | `docker compose config --quiet` | Prove the Compose model parses cleanly. | ⏳ Pending |
| `backend-pytest.txt` | `cd backend && python -m pytest -q -p no:cacheprovider` | Prove backend behavior. | ⏳ Pending |
| `frontend-lint.txt` | `cd frontend && npm run lint` | Prove frontend static checks. | ⏳ Pending |
| `frontend-build.txt` | `cd frontend && npm run build` | Prove frontend production build. | ⏳ Pending |
| `demo-check.txt` | `python scripts/demo_check.py --scenarios all` | Prove live platform readiness for the defense demo. | ⏳ Pending |

## Reporting Rule

The final report should include a concise table with command, result, date, and evidence file. It should not paste long logs unless the examiner specifically requests an appendix with full terminal output.

## Generation Note

Run all commands from the repository root with a live Docker stack. The build verification (`npm run build`) has been confirmed passing as of 2026-06-01 (971 modules, all page chunks). Re-run to produce the timestamped evidence file for the defense package.
