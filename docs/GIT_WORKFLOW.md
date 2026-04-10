# Git Workflow & Commit Conventions

## Overview

CyberSim follows a Git workflow with conventional commits, feature branches, and pull request reviews. This ensures clean history, easy rollbacks, and clear change tracking.

---

## Branch Naming

### Format
```
{type}/{short-description}
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New feature | `feature/scenario-templates` |
| `fix/` | Bug fix | `fix/terminal-reconnect` |
| `docs/` | Documentation | `docs/architecture-update` |
| `chore/` | Maintenance | `chore/update-dependencies` |
| `refactor/` | Code improvement | `refactor/siem-engine` |
| `test/` | Testing | `test/integration-tests` |
| `hotfix/` | Production fix | `hotfix/critical-vulnerability` |

### Examples

✅ **Good**
```bash
feature/ai-hint-system
fix/websocket-timeout
docs/deployment-guide
chore/bump-python-version
```

❌ **Bad**
```bash
new_feature
fix_stuff
changes
claude-update
```

---

## Commit Messages

### Conventional Commits Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add hint level system` |
| `fix` | Bug fix | `fix: resolve terminal I/O deadlock` |
| `docs` | Documentation | `docs: add deployment guide` |
| `style` | Formatting (no code changes) | `style: format with black` |
| `refactor` | Code restructure | `refactor: simplify event engine` |
| `perf` | Performance improvement | `perf: optimize database queries` |
| `test` | Tests | `test: add scenario lifecycle tests` |
| `chore` | Maintenance | `chore: update requirements.txt` |
| `ci` | CI/CD | `ci: add github actions workflow` |
| `build` | Build system | `build: update docker base image` |

### Commit Message Examples

#### Feature Commit (Simple)

```bash
feat: add guided notebook templates for blue team

- Created GuidedNotebook component with phase-aware templates
- Added templates for 6 IR phases (identify, detect, etc.)
- Implemented auto-evidence toast notifications
```

#### Feature Commit (With Scope)

```bash
feat(ai-monitor): add skill-level-aware hint penalties

The hint system now adapts penalties based on student skill level:
- Beginner: L1 -2, L2 -5, L3 -10 points
- Intermediate: L1 -5, L2 -10, L3 -20 points
- Experienced: L1 -10, L2 -20, L3 -40 points

This encourages students to solve problems independently while
providing safety nets for beginners.

Fixes #123
```

#### Bug Fix Commit

```bash
fix: resolve terminal proxy deadlock between docker and redis

The _terminal_proxy_thread was creating a new event loop and using
the main loop's aioredis client, causing "RuntimeError: attached to
different loop". Switched to synchronous redis.Redis client and
separate threads for bidirectional I/O with blocking select().

Before: Terminal commands timed out silently
After: Real-time I/O works reliably in mock and docker modes

Fixes #456
```

#### Refactor Commit

```bash
refactor: extract scenario knowledge into context_builder module

Previously scenario context was built inline in monitor.py, mixing
concerns. Now all context assembly happens in dedicated module:
- Full knowledge dict (hosts/services/vulns)
- Discovery state from tracker
- Command history
- Behavioral signals (time, phase progression)

This makes AI monitoring more testable and reusable.

No functional changes.
```

#### Chore Commit

```bash
chore: update python requirements to latest stable versions

- FastAPI 0.108 → 0.109
- SQLAlchemy 2.0.22 → 2.0.23
- google-generativeai 0.3.1 → 0.4.0
- pytest 7.4.3 → 7.4.4

All tests passing.
```

---

## Workflow: Feature Development

### 1. Create Feature Branch

```bash
# Start from main/master
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature
```

### 2. Work on Feature

```bash
# Make changes
vim backend/src/ai/monitor.py

# Commit regularly (don't wait until end)
git add backend/src/ai/monitor.py
git commit -m "feat: add context builder for AI monitor"

# More work
vim frontend/src/components/hints/AiHintPanel.jsx

git add frontend/src/components/hints/AiHintPanel.jsx
git commit -m "feat(ui): redesign hint panel with L1/L2/L3 levels"
```

### 3. Push Feature Branch

```bash
# First push
git push -u origin feature/my-feature

# Subsequent pushes
git push
```

### 4. Create Pull Request

On GitHub:
1. Compare `feature/my-feature` → `main`
2. Fill out PR template
3. Request reviewers
4. Wait for CI checks to pass

### 5. Address Review Feedback

```bash
# Make requested changes
vim backend/src/scenarios/engine.py

# Commit (use fixup for logical squash)
git commit -m "fix: address PR feedback on scenario validation"
git push

# Or interactive rebase if preferred
git rebase -i main
# (VI editor: mark commits as 'fixup')
git push --force-with-lease
```

### 6. Merge PR

```bash
# After approvals and CI passes
# GitHub: Click "Squash and merge"
# OR via CLI:

git checkout main
git pull origin main
git merge --no-ff feature/my-feature
git push origin main
```

---

## Workflow: Bug Fix (Hotfix)

### For Production Issues

```bash
# Branch from main (not develop)
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix the issue
# Test thoroughly
git commit -m "fix: patch critical security vulnerability"
git push -u origin hotfix/critical-bug

# Create PR, get immediate approval, merge
# Then cherry-pick to develop if needed
```

---

## Best Practices

### ✅ Do's

✅ **Commit early, commit often**
```bash
# Good: Multiple logical commits
git commit -m "feat: add terminal history buffer"
git commit -m "feat: implement command up/down navigation"
git commit -m "test: add terminal history tests"

# vs. Bad: Single large commit
git commit -m "add terminal feature with all code changes"
```

✅ **Use descriptive commit messages**
```bash
# Good
git commit -m "fix: resolve race condition in terminal I/O by using threading.Event"

# Bad
git commit -m "fix bug"
```

✅ **Reference issues in commits**
```bash
git commit -m "feat: add guided templates

Implements phase-based note templates for both red and blue teams.
Closes #42
Addresses #38"
```

✅ **Keep commits focused**
```bash
# Good: Each commit does one thing
git add backend/src/ai/monitor.py
git commit -m "feat: integrate gemini for hints"
git add tests/test_ai_monitor.py
git commit -m "test: add AI monitor integration tests"

# Bad: Mix unrelated changes
git add .  # backend code + frontend + docs + chore
git commit -m "misc updates"
```

✅ **Use interactive rebase before PR**
```bash
# Squash "work in progress" commits into logical commits
git rebase -i main

# Then force push (be careful, only on your branch!)
git push origin feature/x --force-with-lease
```

### ❌ Don'ts

❌ **Don't push secrets**
```bash
# Never commit credentials, API keys, passwords
# .env is in .gitignore
# If accidentally committed:
git rm --cached .env
git commit -m "remove .env from history"
git push --force-with-lease  # Only if not in main yet
```

❌ **Don't force push to main/master**
```bash
# Safe: Only on your feature branch
git push origin feature/x --force-with-lease

# Dangerous: Don't do this to main
git push origin main --force  # ❌ NEVER
```

❌ **Don't merge the wrong branch**
```bash
# Check before merging
git merge develop  # Is this what you want?
git status        # Always verify
```

❌ **Don't leave huge WIP commits**
```bash
# Bad: Commit that sits 2 weeks with "WIP"
git commit -m "WIP: experimental feature"

# Good: Either push to branch or rebase
git rebase -i HEAD~5  # Clean up before PR
```

❌ **Don't skip CI checks**
```bash
# Don't merge if GitHub shows red ❌
# Always wait for green ✅
```

---

## PR Review Checklist

### For Authors

Before requesting review:
- [ ] All tests passing (`pytest`, `npm test`)
- [ ] Code formatted (`black`, `prettier`)
- [ ] No linting errors (`flake8`, `eslint`)
- [ ] New code documented (docstrings, comments)
- [ ] PR description explains the "why"
- [ ] Commits are logical and well-messaged
- [ ] No migrations without DB backward compatibility

### For Reviewers

Check:
- [ ] Code follows conventions ([CONVENTIONS.md](CONVENTIONS.md))
- [ ] Tests cover new logic
- [ ] No security issues
- [ ] Documentation is updated
- [ ] Performance impact acceptable
- [ ] Commit history is clean

---

## Useful Git Commands

### View History

```bash
# Compact log with branches
git log --oneline --graph --all

# Show commits by author
git log --author="John" --oneline

# Show commits since date
git log --since="2024-01-01" --until="2024-02-01"

# Show commits for a file
git log -p backend/src/ai/monitor.py

# Show unpushed commits
git log origin/main..HEAD
```

### Undo Changes

```bash
# Discard uncommitted changes
git checkout -- filename.py
git restore filename.py  # (newer)

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo pushed commit (create revert)
git revert abc123
git push
```

### Stash Changes

```bash
# Temporarily save work
git stash

# List stashes
git stash list

# Apply latest stash
git stash apply

# Apply specific stash
git stash apply stash@{2}

# Delete stash
git stash drop stash@{2}
```

### Rebase & Squash

```bash
# Interactive rebase on last 5 commits
git rebase -i HEAD~5

# Rebase on main (update feature branch)
git rebase main

# Squash all commits since main
git rebase -i main
# Mark commits as 'squash' in editor

# Continue after merge conflict
git rebase --continue

# Abort rebase
git rebase --abort
```

### Search History

```bash
# Find commit with word "terminal"
git log -S "terminal" --oneline

# Find commit modifying a specific function
git log -G "def stream_terminal" --oneline

# Find commits by message
git log --grep="API" --oneline
```

---

## CI/CD Pipeline

Every push triggers:

1. **Format Check** — Black, Prettier
2. **Linting** — Flake8, ESLint
3. **Type Check** — mypy, TypeScript
4. **Unit Tests** — pytest, Vitest
5. **Integration Tests** — docker-compose tests
6. **Security Scan** — Bandit, npm audit
7. **Deploy (main only)** — Production deployment

View results:
- GitHub: PR → "Checks" tab
- CLI: `git status` after push

---

## Release Process

### Version Tagging

```bash
# After merging release commits to main
git tag -a v1.0.0 -m "Release version 1.0.0 - SC-01-03 complete"
git push origin v1.0.0

# View tags
git tag -l
git show v1.0.0
```

### Changelog

See `CHANGELOG.md` (to be created) for version history.

---

## Troubleshooting

### "Your branch is ahead of 'origin/main' by 3 commits"

You have local commits not yet pushed.

```bash
git log origin/main..HEAD  # See unpushed commits
git push                    # Push them
```

### "Please tell who you are"

```bash
git config user.email "your@email.com"
git config user.name "Your Name"
git config --global ...  # For all repos
```

### Accidentally pushed to the wrong branch

```bash
# If not yet merged to main, you can force push
git push origin feature/x --force-with-lease  # Only on feature branch!

# Otherwise, create a revert commit
git revert abc123
git push
```

### Need to update/rebase feature branch

```bash
# Parent branch updated, bring in new changes
git fetch origin
git rebase origin/main

# If conflicts, fix and continue
git rebase --continue

# Back to old version if things go wrong
git rebase --abort
```

---

## Resources

- **Conventional Commits**: https://www.conventionalcommits.org/
- **GitHub Flow**: https://guides.github.com/introduction/flow/
- **Interactive Rebase**: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History
- **Git Tips & Tricks**: https://github.com/git-tips/tips

---

## Questions?

- Check [GitHub Issues](https://github.com/YOUR_USERNAME/cybersim/issues)
- Review [CONVENTIONS.md](CONVENTIONS.md) for code style
- Ask maintainers in discussions

