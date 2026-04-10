# Getting Started with CyberSim

Welcome to CyberSim! This guide will help you set up the platform quickly.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker + Docker Compose (Linux)
- Node.js 18+
- Python 3.11+
- Git
- 4GB+ available RAM
- Google AI Studio API key (free tier) for Gemini integration

## Quick Start (5 minutes)

### 1. Clone and Configure

```bash
git clone https://github.com/YOUR_USERNAME/cybersim.git
cd cybersim
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32
# Copy output to .env JWT_SECRET field

# Update GEMINI_API_KEY in .env from Google AI Studio
```

### 3. Build Kali Image

```bash
docker build -f infrastructure/docker/kali/Dockerfile \
  -t cybersim-kali:latest \
  infrastructure/docker/kali/
```

### 4. Start Services

```bash
docker-compose up -d

# Wait for health checks (30-60 seconds)
docker-compose ps
```

### 5. Access the Platform

- **Frontend**: http://localhost:3000 (student view)
- **Backend API**: http://localhost:8000 (FastAPI docs at /docs)
- **Nginx**: http://localhost (reverse proxy)

## First Login

1. Navigate to http://localhost:3000
2. The auth page appears
3. Use any email for first login (JWT accepts all emails in MVP)
4. Select your skill level (Beginner/Intermediate/Experienced)
5. Choose a scenario from the dashboard

## Verify Installation

```bash
# Check services are running
docker-compose ps

# Test backend API
curl http://localhost:8000/health

# Test WebSocket
wscat -c ws://localhost:8000/ws

# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend
```

## Troubleshooting

### Docker daemon not running
```bash
# Windows: Start Docker Desktop
# Linux: sudo systemctl start docker
# Mac: Docker Desktop → Preferences → Resources → Start
```

### Port conflicts
Edit `.env` to change `CORS_ORIGINS` and `docker-compose.yml` to remap ports.

### Database errors
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

### Gemini API errors
- Verify `GEMINI_API_KEY` is set correctly in `.env`
- Check quota at https://aistudio.google.com/app/apikey
- Hints will fall back to static JSON if API unavailable

## Next Steps

- **Run a scenario**: Select SC-01 (beginner-friendly) from dashboard
- **Read architecture**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Explore code**: Backend in `backend/src/`, Frontend in `frontend/src/`
- **Check scenarios**: [docs/scenarios/](scenarios/)

## Environment Variables

For detailed .env configuration, see [docs/.env.md](.env.md)

Key variables:
- `GEMINI_API_KEY` - Google AI Studio key (free tier OK)
- `JWT_SECRET` - 64-char hex string (generate with `openssl rand -hex 32`)
- `POSTGRES_PASSWORD` - Database password
- `ENVIRONMENT` - Set to `development` for dev, `production` for deployment

## Development vs Production

### Development (localhost)
```bash
docker-compose up -d
# Hot reload enabled for frontend/backend
# Mock terminal if Docker socket unavailable
# Logs to console
```

### Production
```bash
ENVIRONMENT=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for full guide
```

## Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/YOUR_USERNAME/cybersim/issues)
- **Docs**: [Full documentation](INDEX.md)
- **Architecture**: [System design](ARCHITECTURE.md)
- **Scenarios**: [Scenario specs](scenarios/INDEX.md)

---

**Need help?** Check [SETUP.md](SETUP.md) for detailed installation or [docs/ARCHITECTURE.md](ARCHITECTURE.md) for system overview.
