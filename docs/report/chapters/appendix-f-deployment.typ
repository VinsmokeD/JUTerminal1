#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "F", title: "Appendix F — Deployment and Operations", lead: "")

== Prerequisites
- *CPU:* 4 physical cores minimum (8 recommended for concurrent sessions).
- *RAM:* 8 GB minimum, 16 GB recommended (Elasticsearch and concurrent Kali instances).
- *Disk:* 20 GB free, SSD recommended for fast container provisioning and indexing.
- *Software:* Linux (Ubuntu 22.04/24.04 LTS) or Windows 10/11 with WSL2; Docker
  Engine 20.10+ and Compose 2.20+; Python 3.11 and Node 18+ only if running tests
  or builds outside Docker.

== Environment variables
Defaults below are the effective values from `docker-compose.yml`.

#table(columns: (auto, 1.2fr, 1.4fr), stroke: none, align: (left, left, left),
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[VARIABLE],
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[DEFAULT],
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[PURPOSE],
  table.hline(stroke: 0.5pt + c-slate),
  [`ENVIRONMENT`], [`development`], [Logging, docs access, DB init mode],
  [`JWT_SECRET`], [(none)], [32-byte hex; sign auth tokens — generate on install],
  [`OPENROUTER_API_KEY`], [(none)], [AI hints; fallback static hints if empty],
  [`OPENROUTER_MODEL`], [`google/gemini-2.0-flash-001`], [Active OpenRouter model],
  [`OPENROUTER_MAX_TOKENS`], [`500`], [Default response token cap],
  [`AI_CALL_COOLDOWN_SECONDS`], [`10`], [Per-user AI rate limit],
  [`MAX_CONCURRENT_SESSIONS`], [`10`], [Cap on concurrent sandboxes],
  [`CONTAINER_CPU_LIMIT`], [`1.0`], [Per scenario/session container CPU cap],
  [`CONTAINER_MEMORY_LIMIT`], [`512m`], [Per container memory cap],
  table.hline(stroke: 1pt + c-navy),
)

== Local deployment
#codefile(name: "local", lang: "bash")[
```bash
git clone https://github.com/VinsmokeD/JUTerminal1.git && cd JUTerminal1
cp .env.example .env
openssl rand -hex 32            # paste into JWT_SECRET
docker compose up -d           # core stack
docker compose ps              # confirm healthy
docker compose --profile sc01 up -d   # start a scenario
```
]

== Production deployment (Caddy + sslip.io)
For demonstrations, a Caddy-based stack binds 80/443 and provisions TLS
automatically, replacing the local Nginx service. The bootstrap and deploy
scripts live in `scripts/`.

#codefile(name: "production (VPS)", lang: "bash")[
```bash
PARALLAX_DOMAIN=parallax.sslip.io bash scripts/demo-bootstrap.sh
cd /opt/parallax && nano .env          # secrets, OpenRouter key
bash scripts/demo-deploy.sh            # build + launch production stack
```
]

#codefile(name: "infrastructure/caddy/Caddyfile (excerpt)", lang: "")[
```
{$PARALLAX_DOMAIN} {
    encode gzip
    handle_path /api/* { reverse_proxy backend:8000 }
    handle /ws/*       { reverse_proxy backend:8000 }
    handle             { reverse_proxy frontend:80 }
}
```
]

== Operations and recovery
#fig(caption: "Common operational actions")[
  #table(columns: (1.1fr, 1.5fr), stroke: none, align: (left, left),
    text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[SITUATION],
    text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[ACTION],
    table.hline(stroke: 0.5pt + c-slate),
    [Pre-demo verification], [`python scripts/demo_check.py --scenarios all`],
    [Schema update], [`docker compose exec backend alembic upgrade head`],
    [Full reset (destroys data)], [`docker compose down -v` then `up -d`],
    [Scenario profile unhealthy], [Restart only that profile before the full stack],
    [Memory pressure], [Stop unused scenario profiles; re-run readiness],
    table.hline(stroke: 1pt + c-navy),
  )
]

#warn[
  `docker compose down -v` removes volumes — Postgres records, Elasticsearch
  indices, and scenario state. During a graded session, avoid it unless the
  instructor accepts loss of session data.
]
