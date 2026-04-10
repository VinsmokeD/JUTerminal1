# Development Guide

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop
- PostgreSQL 15+ (for native dev)
- Redis 7+ (for native dev)
- Git

### Backend Development

#### 1. Set Up Python Environment

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -e .  # Install in editable mode
```

#### 2. Configure Environment

```bash
# Copy from project root
cp ../.env .env.local

# Or set variables directly
export POSTGRES_URL=postgresql://user:password@localhost:5432/cybersim
export REDIS_URL=redis://localhost:6379/0
export GEMINI_API_KEY=your_key_here
export JWT_SECRET=your_secret_here
```

#### 3. Start Services

```bash
# Option A: Docker (recommended)
docker-compose up postgres redis

# Option B: Native (requires local postgres/redis)
postgres -D /usr/local/var/postgres
redis-server
```

#### 4. Run Backend

```bash
# Development mode (hot reload)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Or use FastAPI CLI if available
fastapi run src/main.py
```

#### 5. Access API Docs

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Frontend Development

#### 1. Set Up Node Environment

```bash
cd frontend

# Install dependencies
npm install

# Or with yarn
yarn install
```

#### 2. Configure Vite

Dev server runs on `http://localhost:5173` by default.

```bash
# Start dev server with hot reload
npm run dev

# View at http://localhost:5173
```

#### 3. Build for Production

```bash
npm run build    # Create dist/ directory
npm run preview  # Test production build locally
```

### Testing

#### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/

# Run specific test
pytest tests/test_ws_integration.py -v

# Watch mode
pytest-watch
```

#### Frontend Tests

```bash
cd frontend

# Run Vitest
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Linting & Formatting

#### Backend

```bash
cd backend

# Format code
black src/

# Lint
flake8 src/
pylint src/

# Type checking
mypy src/
```

#### Frontend

```bash
cd frontend

# Format with Prettier
npm run format

# Lint with ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

## Project Structure

```
cybersim/
├── backend/
│   ├── src/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Configuration
│   │   ├── ai/                  # Gemini integration
│   │   ├── auth/                # Authentication
│   │   ├── db/                  # Database models
│   │   ├── sandbox/             # Docker management
│   │   ├── scenarios/           # Scenario engine
│   │   ├── siem/                # Event system
│   │   ├── ws/                  # WebSocket
│   │   ├── notes/               # Note storage
│   │   ├── scoring/             # Score calculation
│   │   └── reports/             # Report generation
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root component
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── hooks/               # Custom hooks
│   │   ├── store/               # Zustand stores
│   │   ├── lib/                 # Utilities
│   │   └── index.css            # Tailwind styles
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── docs/
```

## Code Conventions

### Python (Backend)

```python
# Type hints everywhere
def get_scenario(session_id: str) -> Optional[Scenario]:
    pass

# Pydantic models for API
class UserProfile(BaseModel):
    email: str
    skill_level: SkillLevel
    onboarding_completed: bool

# Docstrings
def complex_function(x: int) -> str:
    """
    Calculate something.
    
    Args:
        x: Input value
        
    Returns:
        Formatted string result
        
    Raises:
        ValueError: If x is invalid
    """
    pass

# Logging
import logging
logger = logging.getLogger(__name__)
logger.info("Event occurred")
```

### JavaScript/React (Frontend)

```jsx
// Functional components only
export function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null);
  
  // Hooks follow React conventions
  useEffect(() => {
    // effect
  }, [deps]);
  
  return <div>{/* JSX */}</div>;
}

// Custom hooks
export function useMyHook() {
  const [state, setState] = useState(null);
  return { state, setState };
}

// Zustand stores
export const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new scenario feature"
git commit -m "fix: resolve terminal connection issue"
git commit -m "docs: update architecture guide"
git commit -m "chore: update dependencies"
git commit -m "test: add integration tests"
git commit -m "refactor: improve SIEM engine"
```

## Debugging

### Backend Debugging

#### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["src.main:app", "--reload"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend"
      }
    }
  ]
}
```

#### Pdb

```python
import pdb; pdb.set_trace()  # Set breakpoint
```

### Frontend Debugging

#### Browser DevTools

- Open http://localhost:5173
- Press F12 for DevTools
- Console, Network, React DevTools

#### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
npm run dev | grep error

# Postgres logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis
```

## Common Tasks

### Add a New API Endpoint

1. Create route in `backend/src/[module]/routes.py`
2. Add Pydantic model for request/response
3. Update `backend/src/main.py` to include router
4. Create frontend hook in `frontend/src/hooks/`
5. Call from component

### Add a New Frontend Component

1. Create in `frontend/src/components/[feature]/`
2. Use functional component with hooks
3. Export and import where needed
4. Update `frontend/src/store/` if state needed

### Add a New Scenario

1. Create spec in `docs/scenarios/SC-XX-*.md`
2. Create YAML config in `backend/src/scenarios/`
3. Create Docker Compose in `infrastructure/docker/scenarios/scXX/`
4. Add SIEM events JSON in `backend/src/siem/events/`
5. Add hints JSON in `backend/src/scenarios/hints/`
6. Update AI system prompt if needed

## Database

### Migrations

Using SQLAlchemy with Alembic:

```bash
# Generate migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Database Queries

```python
# Query examples
from backend.src.db.database import User

async with AsyncSession(engine) as session:
    user = await session.get(User, user_id)
    users = await session.execute(select(User).where(User.email == email))
```

## Docker

### Build Images

```bash
# Build backend
docker build -t cybersim-backend:latest ./backend

# Build frontend
docker build -t cybersim-frontend:latest ./frontend

# Build Kali
docker build -t cybersim-kali:latest ./infrastructure/docker/kali
```

### View Containers

```bash
docker-compose ps
docker container logs container_name
docker exec -it container_name bash
```

### Clean Up

```bash
# Stop all containers
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Remove dangling images
docker image prune
```

## Performance Optimization

### Backend

- Use connection pooling for database
- Cache SIEM events in Redis
- Limit AI calls with cooldown
- Use async/await throughout
- Profile with `py-spy` if needed

### Frontend

- Use React.memo for expensive components
- Lazy load routes with React.lazy
- Optimize images and bundle size
- Use DevTools Performance tab
- Monitor WebSocket message frequency

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup.

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

