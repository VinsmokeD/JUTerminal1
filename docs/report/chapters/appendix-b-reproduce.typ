#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "B", title: "Appendix B — Reproduce the Evaluation", lead: "")

A reviewer can reproduce the headline evidence in a few minutes on a machine with
Docker and the project's Python and Node toolchains.

#codefile(name: "reproduce.sh", lang: "bash")[
```bash
# 1. Configure (set a real JWT_SECRET; OPENROUTER_API_KEY is optional)
cp .env.example .env
openssl rand -hex 32          # paste into JWT_SECRET

# 2. Validate topology and bring up the core stack
docker compose config --quiet
docker compose up -d
docker compose ps             # all core services healthy

# 3. Start a scenario profile (sc01 | sc02 | sc03)
docker compose --profile sc01 up -d

# 4. Backend tests (359 collected; 358 pass, 1 skip)
python -m pytest backend/tests -q

# 5. Frontend build + unit tests
npm --prefix frontend run verify

# 6. Network isolation + demo readiness
bash scripts/verify-network-isolation.sh
python scripts/demo_check.py --scenarios all
```
]

Access points once the stack is up:

#fig(caption: "Local access points")[
  #table(
    columns: (auto, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[ENDPOINT],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[URL],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Frontend],            [`http://localhost:3000`],
    [Backend API docs],    [`http://localhost:8001/api/docs`],
    [Backend health],      [`http://localhost:8001/health`],
    [Readiness],           [`http://localhost:8001/api/health/readiness`],
    table.hline(stroke: 1pt + c-navy),
  )
]
