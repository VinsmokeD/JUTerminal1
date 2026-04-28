# CyberSim Setup

## Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- Node.js 18 or newer
- Python 3.11 for local backend development
- 8 GB RAM minimum, 16 GB recommended
- Google AI Studio API key for AI hints

## Environment

From the repo root:

```powershell
Copy-Item .env.example .env
```

Set:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
JWT_SECRET=replace_with_64_character_hex_secret
POSTGRES_PASSWORD=change_this_password
```

Never commit `.env`. If a real key appears in logs or terminal output, rotate it.

## Docker Startup

Validate configuration:

```powershell
docker compose config
```

Start the core platform:

```powershell
docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx
```

Health checks:

```powershell
docker compose ps
curl http://localhost/health
curl http://localhost/api/scenarios/
```

Open `http://localhost`.

## Scenario Profiles

Start only the scenario needed for a lab:

```powershell
docker compose --profile sc01 up -d
docker compose --profile sc02 up -d
docker compose --profile sc03 up -d
```

Stop scenario targets:

```powershell
docker compose --profile sc01 down
docker compose --profile sc02 down
docker compose --profile sc03 down
```

## Local Development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Verification Commands

Backend tests:

```powershell
cd backend
python -m pytest
```

Frontend build:

```powershell
cd frontend
npm run build
```

Docker config:

```powershell
docker compose config
```

Load testing:

```powershell
locust -f backend/tests/load_test.py --host=http://localhost
```

## Troubleshooting

Backend cannot reach Postgres:

```powershell
docker compose logs postgres --tail=80
docker compose logs backend --tail=80
```

Frontend build says `vite` is not recognized:

```powershell
cd frontend
npm install
npm run build
```

API docs not visible:

- API docs are exposed at `/api/docs` only when the backend environment is development.

Docker scenario target cannot be reached:

```powershell
docker compose --profile sc01 ps
docker network ls
```
