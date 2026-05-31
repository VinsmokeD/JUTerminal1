# Evidence Bundle

This folder stores the evidence used to support the final Parallax report. The formal report should not make unsupported claims; every architecture, implementation, test, and deployment claim should point to a local source file, command output, screenshot, exported diagram, or official external reference.

## Current Evidence Snapshot

| Evidence | Captured value |
| --- | --- |
| Repository commit | `b8c94fc` |
| Git status at evidence capture | `M docs/architecture/CONTINUOUS_STATE.md`; untracked diagram export/theme files before this documentation update |
| Canva design id | `DAHKeHjt8IY` |
| Canva title | `Report - Parallax Project Report` |
| Canva page count | 17 A4 pages |
| Canva current edit URL | https://www.canva.com/d/8CmCA-8Y41Ms9ML |
| Canva current view URL | https://www.canva.com/d/pfQr_4wjgUjRfJs |
| Mermaid CLI version | `11.15.0` |
| Diagram exports | 6 SVG files and 6 PNG files |
| Repomix packed source file | `.tmp/final-report/repomix-parallax.xml` |
| Repomix scope | backend, frontend, scenarios, AI prompt, Docker scenario files, Nginx, Compose, README, environment example |
| Repomix output | 210 files, 175,785 tokens, 641,445 characters |
| Repomix security check | No suspicious files detected |

## Evidence Folders

| Folder or file | Purpose |
| --- | --- |
| `source-inventory.md` | Repository source inventory generated from Repomix output and targeted search. |
| `test-output/` | Backend, frontend, Docker, and demo readiness command outputs for final QA. |
| `screenshots/` | Browser and system screenshots for UI/UX, installation, Docker, and demo evidence. |

## Evidence Handling Rules

- Never commit real secrets, API keys, bearer tokens, or password hashes.
- Do not paste full terminal output into the formal report unless it is short and safe.
- Use cropped screenshots when a page contains sensitive data.
- For cybersecurity scenario artifacts, describe learning objectives, safety controls, and detection outcomes. Do not publish live offensive payloads.
- Preserve command outputs exactly in evidence files, but summarize them in the formal report.
- If a verification command fails, keep the failure output and document the fix path.

## Final Evidence Commands

These commands should be rerun before the final submission PDF is generated:

```bash
git status --short
git rev-parse --short HEAD
docker compose config --quiet
cd backend && python -m pytest -q -p no:cacheprovider
cd frontend && npm run lint
cd frontend && npm run build
python scripts/demo_check.py --scenarios all
```

The final report should quote only the result summary, for example test counts, build success, and readiness status.

