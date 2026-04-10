# Code Conventions

## Overview

CyberSim follows consistent coding conventions across Python (backend) and JavaScript (frontend). This guide ensures maintainability, readability, and quality.

## Python (Backend)

### Code Style

**Format**: Black (strict line length: 88 characters)

```bash
black backend/src
```

**Linting**: Flake8 + Pylint

```bash
flake8 backend/src
pylint backend/src
```

**Type Hints**: Mandatory everywhere

```python
# ✅ Good
def get_user(user_id: int) -> Optional[User]:
    pass

def calculate_score(discovery_count: int, time_seconds: int) -> float:
    return discovery_count * 1.5 - (time_seconds / 60)

# ❌ Bad
def get_user(user_id):
    pass

def calculate_score(discovery_count, time_seconds):
    pass
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `UserProfile`, `TerminalProxy` |
| Functions/Methods | snake_case | `get_user()`, `stream_terminal_output()` |
| Constants | UPPER_SNAKE_CASE | `MAX_HINTS_PER_SESSION = 5` |
| Private methods | _leading_underscore | `_build_banner()` |
| Variables | snake_case | `user_email`, `session_state` |
| Files | kebab-case | `discovery-tracker.py` |

### Docstrings

Use Google-style docstrings:

```python
def stream_terminal_output(session_id: str, container_id: str) -> AsyncGenerator[str, None]:
    """
    Stream terminal output from a Docker container in real-time.
    
    This generator reads from the container's stdout/stderr and yields
    lines as they become available. Designed for interactive terminal
    sessions where students type commands.
    
    Args:
        session_id: Unique session identifier (UUID format)
        container_id: Docker container ID or mock ID (starts with "mock-")
        
    Yields:
        str: Lines of terminal output as they are generated
        
    Raises:
        DockerException: If container cannot be accessed
        RedisException: If Redis connection fails
        
    Example:
        async for line in stream_terminal_output("uuid", "container-123"):
            send_to_websocket(line)
    """
    pass
```

### Imports

```python
# Order: stdlib, third-party, local
import asyncio
import json
from typing import Optional, AsyncGenerator

import asyncpg
import aioredis
from fastapi import WebSocket

from backend.src.db.database import User, Session
from backend.src.sandbox.terminal import TerminalProxy
```

### Pydantic Models

```python
from pydantic import BaseModel, Field, validator

class UserProfile(BaseModel):
    """User profile with skill level tracking."""
    
    email: str = Field(..., description="User email address")
    skill_level: SkillLevel = Field(default=SkillLevel.BEGINNER)
    onboarding_completed: bool = False
    
    @validator('email')
    def email_must_be_valid(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email')
        return v
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "email": "student@university.edu",
                "skill_level": "BEGINNER"
            }
        }
```

### Error Handling

```python
# ✅ Good
try:
    container = docker_client.containers.get(container_id)
except docker.errors.NotFound as e:
    logger.warning(f"Container not found: {container_id}")
    raise ContainerNotFoundException(f"Container {container_id} not found") from e
except docker.errors.APIError as e:
    logger.error(f"Docker API error: {e}")
    raise DockerAPIException(f"Docker error: {e}") from e

# ❌ Bad
try:
    container = docker_client.containers.get(container_id)
except:
    pass
```

### Logging

```python
import logging

logger = logging.getLogger(__name__)

# Use appropriate levels
logger.debug("Parsing nmap output")          # Development info
logger.info(f"Session {session_id} started") # Important events
logger.warning(f"API quota low: {remaining}")  # Possible issues
logger.error(f"Failed to connect database: {e}") # Errors only
logger.critical("System offline")            # Critical issues
```

### Testing

```python
import pytest
from backend.src.scenarios.engine import ScenarioEngine

class TestScenarioEngine:
    """Tests for scenario engine."""
    
    @pytest.fixture
    def engine(self):
        return ScenarioEngine(scenario_id="SC-01")
    
    def test_load_scenario_valid(self, engine):
        """Loading a valid scenario succeeds."""
        scenario = engine.load()
        assert scenario.id == "SC-01"
        assert len(scenario.targets) > 0
    
    def test_load_scenario_invalid(self):
        """Loading nonexistent scenario raises error."""
        engine = ScenarioEngine(scenario_id="SC-999")
        with pytest.raises(ScenarioNotFoundError):
            engine.load()
```

---

## JavaScript/React (Frontend)

### Code Style

**Format**: Prettier (semi: true, trailing comma: all)

```bash
npm run format
```

**Linting**: ESLint

```bash
npm run lint
npm run lint:fix
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TerminalPanel`, `SiemConsole` |
| Hooks | camelCase, start with "use" | `useTerminal()`, `useWebSocket()` |
| Functions | camelCase | `formatTimestamp()` |
| Constants | UPPER_SNAKE_CASE | `MAX_HINTS_PER_SESSION` |
| Files | kebab-case | `ai-hint-panel.jsx` |
| Props | camelCase | `sessionId`, `onCommandSubmit` |
| State variables | camelCase | `terminalOutput`, `isLoading` |

### Functional Components

```jsx
// ✅ Good
export function TerminalPanel({ sessionId, onCommand }) {
  const [history, setHistory] = useState([]);
  const { output } = useTerminal(sessionId);
  
  useEffect(() => {
    // effect
  }, [sessionId, output]);
  
  const handleSubmit = useCallback((cmd) => {
    setHistory(prev => [...prev, cmd]);
    onCommand(cmd);
  }, [onCommand]);
  
  return (
    <div className="terminal">
      {/* JSX */}
    </div>
  );
}

// ❌ Bad
export class TerminalPanel extends React.Component {
  // Class components discouraged
}

export function TerminalPanel(props) {
  // No destructuring
}
```

### Hooks

```jsx
// Custom hooks
export function useTerminal(sessionId) {
  const [output, setOutput] = useState("");
  const ws = useWebSocket();
  
  useEffect(() => {
    const handleOutput = (msg) => setOutput(msg.data);
    ws.on("terminal:output", handleOutput);
    
    return () => ws.off("terminal:output", handleOutput);
  }, [ws]);
  
  return { output };
}

// Hook usage in components
export function TerminalPanel({ sessionId }) {
  const { output } = useTerminal(sessionId);
  
  return <div>{output}</div>;
}
```

### Zustand Stores

```javascript
import { create } from 'zustand'

export const useSessionStore = create((set) => ({
  activeSession: null,
  users: [],
  
  // Actions
  setActiveSession: (session) => set({ activeSession: session }),
  addUser: (user) => set((state) => ({
    users: [...state.users, user],
  })),
  
  // Computed
  userCount: () => set((state) => ({
    userCount: state.users.length,
  })),
}));

// Usage
function MyComponent() {
  const { activeSession, setActiveSession } = useSessionStore();
  
  return <button onClick={() => setActiveSession(null)}>Clear</button>;
}
```

### JSX Style

```jsx
// ✅ Good
<div className="panel p-4 rounded-lg">
  <h2 className="text-xl font-bold">{title}</h2>
  <p className="text-gray-600">{description}</p>
  {isLoading && <Spinner />}
  {!isLoading && <Content data={data} />}
</div>

// ❌ Bad
<div class="panel p4 rounded">  {/* class instead of className, wrong tailwind */}
  <h2>{title}</h2>
  <p>{description}</p>
  {isLoading ? <Spinner /> : <Content data={data} />}  {/* ternary ok but explicit better */}
</div>
```

### Async/Await

```javascript
// ✅ Good
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    logger.error("Failed to fetch user", { error });
    throw error;
  }
}

// ❌ Bad
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;  // No error handling
}
```

### Comments

```javascript
// ✅ Good
// Check if permission is sufficient for current operation
if (user.role === 'admin' || user.role === 'instructor') {
  // ...
}

// TODO: Implement caching for frequently accessed scenarios
// FIXME: WebSocket reconnection sometimes fails

// ❌ Bad
// loop through users
users.forEach(...) {
  // get user name
  const name = user.name
```

---

## Common Pattern: API Integration

### Backend Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException, status
from backend.src.auth import get_current_user
from backend.src.db.models import User

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

@router.get("/{scenario_id}")
async def get_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve scenario details."""
    scenario = await Scenario.get(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    return scenario
```

### Frontend Hook

```javascript
import { useQuery } from '@tanstack/react-query'

export function useScenario(scenarioId) {
  return useQuery(
    ['scenarios', scenarioId],
    async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    {
      enabled: !!scenarioId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}
```

### Component Usage

```jsx
export function ScenarioDetail({ scenarioId }) {
  const { data, isLoading, error } = useScenario(scenarioId)
  
  if (isLoading) return <Spinner />
  if (error) return <ErrorAlert error={error} />
  
  return <div>{data.name}</div>
}
```

---

## Git Conventions

See [GIT_WORKFLOW.md](GIT_WORKFLOW.md) for comprehensive git guidelines.

Quick reference:
```bash
# Feature
git commit -m "feat: add new scenario feature"

# Bug fix
git commit -m "fix: resolve terminal connection issue"

# Documentation
git commit -m "docs: update architecture guide"

# Chores
git commit -m "chore: update dependencies"

# Test
git commit -m "test: add integration test"

# Refactor
git commit -m "refactor: improve SIEM engine performance"
```

---

## Pre-Commit Checks

### Backend

```bash
# Format
black backend/src

# Lint
flake8 backend/src
pylint backend/src

# Type check
mypy backend/src

# Test
pytest backend/tests
```

### Frontend

```bash
# Format
npm run format

# Lint
npm run lint

# Type check (if using TypeScript)
npm run type-check

# Test
npm run test
```

---

## CI/CD Pipeline

See `.github/workflows/ci.yml` for automated checks on every push.

Checks include:
- Format validation (Black, Prettier)
- Linting (Flake8, ESLint)
- Type checking (mypy, TypeScript)
- Unit tests (pytest, Vitest)
- Security scanning (Bandit, npm audit)

---

## Don't's (Anti-patterns)

❌ **Don't use `console.log()` in production code** — Use logger or remove

❌ **Don't hardcode API URLs** — Use environment variables

❌ **Don't catch all exceptions** — Catch specific exceptions

❌ **Don't use `*` imports** — Import specific items

❌ **Don't commit secrets** — Use .env, .gitignore

❌ **Don't use var** — Use `const` or `let`

❌ **Don't disable linters without reason** — Add comments if needed

❌ **Don't leave TODO comments without context** — Explain what needs to be done

---

## Tools Setup

### Python

```bash
pip install black flake8 pylint mypy pytest pytest-cov
```

### JavaScript

```bash
npm install -D prettier eslint vitest @testing-library/react
```

### VS Code Extensions

- Python: ms-python.python
- Prettier: esbenp.prettier-vscode
- ESLint: dbaeumer.vscode-eslint
- Pylance: ms-python.vscode-pylance

---

## Questions?

Refer to:
- **[Architectural Decisions](docs/ARCHITECTURE.md)**
- **[Development Setup](DEVELOPMENT.md)**
- **[GitHub Issues](https://github.com/YOUR_USERNAME/cybersim/issues)**

