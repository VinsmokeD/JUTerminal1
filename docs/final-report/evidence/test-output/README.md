# Test Output Evidence

This folder is reserved for final verification command outputs. Keep raw command output here and summarize only the result in the formal report.

## Planned Evidence Files

| File | Command | Purpose |
| --- | --- | --- |
| `git-status.txt` | `git status --short && git rev-parse --short HEAD` | Establish the exact source state used for final documentation. |
| `docker-compose-config.txt` | `docker compose config --quiet` | Prove the Compose model parses cleanly. |
| `backend-pytest.txt` | `cd backend && python -m pytest -q -p no:cacheprovider` | Prove backend behavior. |
| `frontend-lint.txt` | `cd frontend && npm run lint` | Prove frontend static checks. |
| `frontend-build.txt` | `cd frontend && npm run build` | Prove frontend production build. |
| `demo-check.txt` | `python scripts/demo_check.py --scenarios all` | Prove live platform readiness for the defense demo. |

## Reporting Rule

The final report should include a concise table with command, result, date, and evidence file. It should not paste long logs unless the examiner specifically requests an appendix with full terminal output.

