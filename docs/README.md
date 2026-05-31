# Parallax Documentation

This folder is the maintained documentation entry point for Parallax. Older reports and agent handoff files remain for project history, but the files below are the docs a reviewer or teammate should read first.

## Start Here

| File | Purpose |
| --- | --- |
| [../README.md](../README.md) | Product overview, quick start, current verification status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime topology and module map |
| [FEATURES.md](FEATURES.md) | Implemented product capabilities and scenario scope |
| [SETUP.md](SETUP.md) | Installation, local development, verification commands |
| [TEAM_SETUP_GUIDE.md](TEAM_SETUP_GUIDE.md) | Full team machine setup, verification, reset, and troubleshooting guide |
| [AI_SYSTEM.md](AI_SYSTEM.md) | OpenRouter (DeepSeek) hint system, safety boundaries, rate limits |
| [ROADMAP.md](ROADMAP.md) | Current status, risks, and next milestones |
| [product/PRODUCT_EVOLUTION_PLAN.md](product/PRODUCT_EVOLUTION_PLAN.md) | Product north star, strategic pillars, and implementation roadmap |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow and quality gates |
| [AGENT_CONTEXT.md](AGENT_CONTEXT.md) | Maintainer/agent operating context |

## Supporting Material

- Scenario specs live in [scenarios/](scenarios/).
- Architecture history and state logs live in [architecture/](architecture/).
- Verification and audit reports live in [reports/](reports/) and [testing/](testing/).
- Blue Team playbook material lives under backend scenario playbooks and SOC docs.

## Documentation Rule

Public docs should describe only verified or explicitly scoped behavior. If code, Compose config, and docs disagree, treat code/config plus fresh test output as the truth and update the docs.
