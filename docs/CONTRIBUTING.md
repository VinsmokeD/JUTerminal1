# Contributing

## Ground Rules

- Keep all cybersecurity activity scoped to local Docker scenarios.
- Do not commit secrets, `.env`, generated API keys, or live credentials.
- Keep public docs aligned with code and runtime evidence.
- Prefer small, testable changes.
- Use conventional commit messages when committing.

## Development Checks

Run the checks relevant to your change:

```powershell
docker compose config
cd backend; python -m pytest
cd frontend; npm run build
```

Run load tests separately:

```powershell
locust -f backend/tests/load_test.py --host=http://localhost
```

## Code Style

- Python: type hints, Pydantic/SQLAlchemy models for API and database shapes, Black-compatible formatting.
- React: functional components, Zustand stores, Tailwind utilities and existing design tokens.
- Docker: keep scenario networks internal, resource-limited, and isolated.
- Docs: describe verified behavior; mark unverified runtime claims explicitly.

## Pull Request Checklist

- The change is scoped and named clearly.
- Tests/builds relevant to the change were run.
- Documentation changed if behavior changed.
- No secrets or generated caches were added.
- Scenario changes preserve container isolation.
