# Production Deployment Plan â€” Parallax / JUTerminal1

**Status:** Plan â€” not yet executed
**Author:** Claude Code, 2026-05-17
**Audience:** Project owner (no prior deployment experience)

---

## 1. Honest readiness assessment

| Area | State | Blocking for launch? |
|------|-------|---------------------|
| Functional features (3 scenarios, terminal, SIEM, AI) | âœ… working locally | No |
| Docker-compose stack | âœ… works on single host | No (but architecture has scaling ceiling) |
| TLS / HTTPS | âŒ none (Nginx serves :80) | **YES** |
| Domain name | âŒ not registered | **YES** |
| Production-grade secrets management | âŒ `.env` file | **YES** |
| Database backups | âŒ none scheduled | **YES** for any data you care about |
| Rate limiting / DoS protection | âš ï¸ partial (AI cooldown only) | **YES** |
| Auth hardening (password reset, lockout, MFA) | âš ï¸ JWT only, MVP-level | Depends on audience |
| Monitoring / logging / alerting | âŒ none | **YES** for anything beyond demo |
| Container resource isolation per user | âœ… per-session containers | No |
| Container security boundary (privileged escape) | âš ï¸ uses host docker socket | **YES** if public |
| Cost protection (kill orphan containers) | âœ… container_cleanup task exists | No |
| Disaster recovery plan | âŒ none | **YES** for serious use |
| CI/CD pipeline | âš ï¸ basic GitHub Actions only | Recommended |
| Legal: ToS, privacy policy, COPPA/GDPR | âŒ none | **YES** if public |
| Logging of attack commands (for misuse audit) | âœ… exists in DB | No |

**Verdict:** Not ready for **public** launch. Ready for **closed beta with friends/classmates** behind a password. The 5â€“7 day plan in Â§6 below closes the gap to closed beta. Open public launch needs the full Â§7 work (~3 weeks).

---

## 2. What makes this project unusual

Most webapps are stateless: 1000 users hit 2 app servers + 1 database. Cheap to scale.

**Parallax is different:** every active user needs a private set of Docker containers:
- 1Ã— Kali workspace container (~256 MB RAM, 0.3 CPU)
- 1Ã— scenario stack â€” SC-01 is webapp+MySQL+WAF (~1.5 GB), SC-02 is DC+fileserver (~1 GB), SC-03 is gophish+mailrelay+victim (~1.2 GB)

**Per-user RAM footprint: ~1.5 â€“ 1.8 GB while a mission is active.** This drives every deployment decision.

| Concurrent users | RAM | Realistic host |
|------------------|-----|----------------|
| 1â€“3 (demo) | 6 GB | $20/mo VPS |
| 5â€“10 (classroom) | 16â€“24 GB | $80â€“150/mo VPS |
| 20â€“30 (small class) | 48â€“64 GB | $250â€“400/mo dedicated server |
| 100+ (open public) | 200+ GB | Kubernetes cluster, $1k+/mo |

For your defense/launch audience (likely <20 concurrent), a **single large VPS is the right answer** â€” not AWS, not Kubernetes.

---

## 3. AWS vs. alternatives â€” should you use AWS?

**Short answer: not for v1.** AWS is the most flexible but the steepest learning curve, the easiest to bankrupt yourself on, and overkill for <30 concurrent users.

| Platform | Cost (10 users) | Setup difficulty | Best for | My take |
|----------|----------------|------------------|----------|---------|
| **Hetzner Cloud** (CCX23 + CPX31) | â‚¬40â€“80/mo | â˜…â˜… | Single-region, EU-friendly, best price/RAM | **Recommended for v1** |
| **DigitalOcean** (Premium Intel droplet) | $80â€“150/mo | â˜…â˜… | Beginner-friendly UI, good docs | Solid alt |
| **Vultr** (Bare Metal or High-Freq) | $80â€“160/mo | â˜…â˜… | Same as DO | Solid alt |
| **AWS EC2** (m6i.2xlarge + EBS + ALB + Route53) | $250â€“450/mo | â˜…â˜…â˜…â˜… | Long-term scale, enterprise demo | Overkill until you have 50+ users |
| **AWS Lightsail** | $80/mo | â˜…â˜… | "AWS for beginners" | Acceptable middle ground |
| **GCP Compute Engine** | $200â€“350/mo | â˜…â˜…â˜…â˜… | Same trade-off as AWS | Same |
| **Railway / Render** | N/A | â˜… | Stateless apps | âŒ Won't work â€” they don't let you run `docker exec` inside their containers |
| **University on-prem** | $0 | â˜…â˜… | If JU has a server room | Worth asking your advisor |

**My recommendation for v1: Hetzner CCX33** (8 vCPU, 32 GB RAM, 240 GB NVMe SSD, â‚¬60/mo). Comfortable for ~15 concurrent students; single host means no networking/cluster complexity; can be redeployed in 30 minutes.

**When to move to AWS:** Once you have proven demand >50 concurrent users or need multi-region. Don't do it before then.

---

## 4. Critical security gaps to close *before* anyone outside your team uses it

These are non-negotiable. Order matters â€” top items first.

### 4.1 â€” Docker socket exposure (highest risk)
Today, `backend/src/sandbox/manager.py` calls `docker.from_env()` which reads `/var/run/docker.sock`. Anyone who can RCE the backend container becomes root on the host. Two mitigations:

- **Short-term**: run backend as a separate non-root user; mount docker socket via a [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) that whitelists only the API endpoints you actually call (`/containers`, `/exec`).
- **Long-term**: switch from Docker to **rootless Docker** or **Podman** with API socket, or move sandbox lifecycle to a dedicated VM accessed via private API.

### 4.2 â€” Container egress
Scenario containers must **never** reach the public internet. Verify with:
```bash
docker exec sc01-webapp curl -m 3 https://1.1.1.1   # should hang/fail
```
The compose file already declares `internal: true` networks per scenario â€” confirm they're configured correctly post-deploy.

### 4.3 â€” Container resource caps
Add hard limits to every scenario container in compose:
```yaml
deploy:
  resources:
    limits: { cpus: '0.5', memory: 512m }
    reservations: { memory: 256m }
```
Prevents one student's `:(){:|:&};:` fork-bomb from killing the host.

### 4.4 â€” Auth hardening
- Add rate-limit on `/auth/login` (e.g., `slowapi` 5 attempts / 15 min / IP)
- Force email verification before account creation (use Mailgun/SendGrid free tier)
- Enable account lockout after 10 failed attempts
- Replace simple JWT with **JWT + refresh token rotation**; short access TTL (15 min), long refresh (7 days), refresh stored as httpOnly cookie

### 4.5 â€” TLS
Every byte must be HTTPS. Use **Caddy** as reverse proxy instead of Nginx â€” it's literally one line of config to get auto-renewing Let's Encrypt:
```caddyfile
parallax.yourdomain.com {
  reverse_proxy /api/* backend:8000
  reverse_proxy /ws/*  backend:8000
  reverse_proxy frontend:80
}
```
Replaces all the manual cert wrangling Nginx requires.

### 4.6 â€” Secrets
Stop committing `.env`. Use one of:
- **Doppler** (generous free tier, sync to server via CLI)
- **AWS Secrets Manager** (if you go AWS, $0.40/secret/mo)
- **Docker secrets** (built-in, simple, file-based)

Generate new JWT/DB/API secrets before going live â€” assume any in-repo secrets are burnt.

### 4.7 â€” Database backups
PostgreSQL backup via cron:
```bash
0 */6 * * * docker exec postgres pg_dump -U parallax parallax | gzip > /backups/db-$(date +\%F-\%H).sql.gz
```
Retain 7 days locally + sync to **Backblaze B2** ($0.005/GB/mo, ~$0.10/mo for this DB). Test restore once before going live.

---

## 5. Domain + DNS + ancillary setup

| Item | Recommendation | Cost |
|------|---------------|------|
| Domain | Namecheap or Porkbun, `.com` or `.app` | $10â€“15/yr |
| DNS | Cloudflare (free, DDoS protection bonus) | $0 |
| Email (transactional) | Resend free tier (3k emails/mo) or SendGrid free | $0 |
| Email (your `support@`) | Cloudflare Email Routing (free, forwards to gmail) | $0 |
| CDN for frontend assets | Cloudflare (already included with DNS) | $0 |
| Status page | UptimeRobot free (50 monitors) | $0 |
| Error tracking | Sentry free tier (5k events/mo) | $0 |
| Analytics | Plausible self-hosted or Cloudflare Web Analytics | $0 |
| Logs aggregation | BetterStack (Logtail) free tier | $0 |

Total monthly: **~$0** on top of the VPS for ancillary services.

---

## 6. Closed-beta launch plan (5â€“7 days)

This gets you from "works locally" to "20 friends can use it on a real domain". Right level of rigor for a graduation defense / soft launch.

### Day 1 â€” Buy domain + VPS + DNS
1. Register `parallax.example.com` at Namecheap
2. Add to Cloudflare â†’ point nameservers
3. Create A record â†’ temporarily 127.0.0.1
4. Create Hetzner CCX33 in Falkenstein/Helsinki/Ashburn (pick closest to you)
5. SSH key auth only; disable password login; install `ufw`, `fail2ban`
6. Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS); block all else
7. Install Docker Engine + Compose v2

### Day 2 â€” Harden secrets + add Caddy
1. Rotate every secret in `.env` (JWT, DB password, Gemini key)
2. Move `.env` to Doppler or systemd-encrypted file
3. Replace nginx service in compose with Caddy:
   ```yaml
   caddy:
     image: caddy:2-alpine
     ports: ["80:80", "443:443"]
     volumes:
       - ./infrastructure/caddy/Caddyfile:/etc/caddy/Caddyfile
       - caddy_data:/data
       - caddy_config:/config
   ```
4. Point Cloudflare A record at VPS IP, **set proxy mode to DNS-only** (orange cloud OFF) â€” WebSockets are flaky behind Cloudflare proxy
5. Push code, run compose up â€” verify `https://parallax.example.com` returns the landing page

### Day 3 â€” Security hardening
1. Add docker-socket-proxy in front of `/var/run/docker.sock`
2. Add `slowapi` rate-limiting to `/auth/login` and `/sessions/`
3. Add CPU/memory caps to every scenario service in compose
4. Verify scenario containers cannot reach internet
5. Add account email verification flow (Resend integration)
6. Set up `fail2ban` rule on nginx/caddy 401s

### Day 4 â€” Operational basics
1. Add Sentry SDK to backend + frontend; verify it captures a forced error
2. Add UptimeRobot monitors: landing page, `/api/health`, WS endpoint
3. Set up Postgres backup cron + offsite sync to B2
4. Add `docker stats` cron logger â†’ BetterStack (so you can see RAM/CPU trends)
5. Write a one-page runbook in `docs/ops/RUNBOOK.md`: how to restart, how to redeploy, how to restore DB, how to free a stuck container

### Day 5 â€” Closed beta invites
1. Add a `BETA_INVITE_CODES` env var; gate registration behind invite code
2. Generate 30 codes, share with classmates / professor / advisor
3. Add a single feedback widget (`/feedback` form â†’ Notion DB or email)
4. Launch. Watch Sentry + UptimeRobot for 48 hours.

### Day 6â€“7 â€” Buffer
Reserved for fires you can't predict. Always reserve buffer days.

**Total cost for first month:** Domain $12 + VPS â‚¬60 + B2 ~$1 = **~$75**.

---

## 7. Public launch plan (additional ~2â€“3 weeks)

Only do this if closed beta shows real demand.

### 7.1 â€” Legal (week 1 of public)
- Terms of Service: hire a $200 template from Termly or LegalZoom; **mandatory**: "no real-world attacks against systems you don't own"
- Privacy Policy: GDPR + COPPA compliant if any users < 18 (you said university audience, so probably not COPPA but check)
- Acceptable Use Policy: enumerate what students cannot do (no scanning external IPs, no exfil of platform code)
- Have everyone agree on signup with a clickwrap checkbox

### 7.2 â€” Abuse + monitoring (week 2)
- Add per-account rate limit on session creation (max 3 active sessions / user)
- Log every command to immutable storage (S3 with object-lock) for forensic trail
- Add abuse-report email `abuse@parallax.example.com`
- Set up an "emergency kill switch" â€” admin endpoint that destroys all user sessions
- Add bot/captcha on signup (hCaptcha free tier)

### 7.3 â€” Scale prep (week 3)
At this stage, if you're seeing >20 concurrent users, you have two paths:

**Path A â€” Vertical scale (simpler).** Move to a bigger Hetzner box (CCX53 = 16 vCPU / 64 GB / â‚¬120/mo). Stays single-host. No code changes.

**Path B â€” Horizontal scale (more work).** Split into "control plane" (frontend + backend + Postgres + Redis + Elastic) and "scenario plane" (a pool of worker hosts that each run scenario containers, managed via a queue). Backend allocates a scenario container on whichever worker has free capacity. This is where AWS starts to make sense: ECS or Nomad for scheduling.

Don't do Path B until Path A breaks.

### 7.4 â€” When AWS *does* start making sense

| Trigger | Why AWS |
|---------|---------|
| >50 concurrent users sustained | Auto-scaling worker pool |
| Need multi-region (LATAM + EU students) | Route53 + multi-region ECS |
| Compliance ask (SOC2, FedRAMP) | AWS has the audit paperwork ready |
| Enterprise pilot with a university IT dept | They'll ask "is it on AWS?" because that's what their procurement understands |

Concrete AWS architecture if you reach that point (for reference, not for now):

```
Route53 (DNS)
   â”‚
   â–¼
CloudFront (CDN, frontend)
   â”‚
   â–¼
ALB (Application Load Balancer)
   â”‚
   â”œâ”€â”€â–º ECS Fargate: frontend service (1 task)
   â””â”€â”€â–º ECS Fargate: backend service (2 tasks behind WebSocket sticky session)
            â”‚
            â”œâ”€â”€â–º RDS PostgreSQL (db.t4g.small, multi-AZ)
            â”œâ”€â”€â–º ElastiCache Redis (cache.t4g.micro)
            â”œâ”€â”€â–º OpenSearch t3.small (SIEM)
            â””â”€â”€â–º ECS EC2 capacity provider: scenario worker pool
                     (1â€“10 m6i.large nodes via auto-scaling)
                     [Fargate cannot run Docker-in-Docker; needs EC2]
```

Rough cost at 50 concurrent: **$400â€“600/mo**. Same scale on Hetzner: ~â‚¬150. AWS premium is buying you ops convenience, not raw price.

---

## 8. CI/CD pipeline (recommended even for closed beta)

Add `.github/workflows/deploy.yml`:

```yaml
on:
  push: { branches: [master] }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: |
          docker compose build
          docker tag parallax-backend ghcr.io/${{github.repository}}/backend:${{github.sha}}
          docker tag parallax-frontend ghcr.io/${{github.repository}}/frontend:${{github.sha}}
      - run: docker login ghcr.io -u ${{github.actor}} -p ${{secrets.GITHUB_TOKEN}}
      - run: docker push ghcr.io/${{github.repository}}/backend:${{github.sha}}
      - run: docker push ghcr.io/${{github.repository}}/frontend:${{github.sha}}
      - name: Deploy via SSH
        run: |
          ssh deploy@${{secrets.VPS_HOST}} 'cd /opt/parallax && \
            export TAG=${{github.sha}} && \
            docker compose pull && docker compose up -d --remove-orphans'
```

Result: `git push master` deploys in ~2 minutes. Worth the day of setup.

---

## 9. Operational checklist before going live

Print this. Walk through it the day before launch.

- [ ] Domain registered + DNS pointed to VPS
- [ ] HTTPS works on root + all subroutes (`curl -I https://...` returns 200)
- [ ] All secrets rotated; `.env` not in repo
- [ ] Postgres backup ran successfully + restored successfully in a test
- [ ] Sentry receives a forced error from backend AND frontend
- [ ] UptimeRobot pings green for 24 h before launch
- [ ] Container resource limits applied â€” `docker stats` shows them
- [ ] Scenario container egress blocked â€” verified with `curl 1.1.1.1`
- [ ] `fail2ban` running; tested by triggering 10 failed logins
- [ ] Admin panic-button endpoint works (kills all sessions)
- [ ] DB migration runs cleanly on fresh DB (`alembic upgrade head`)
- [ ] Runbook complete: incident response, restart, restore, scale-up
- [ ] At least one teammate has SSH access + Doppler access (bus factor)
- [ ] Beta invite codes generated and distributed
- [ ] ToS + Privacy Policy linked in footer (even for beta)

---

## 10. What you, specifically, should do this week

You said no deployment experience. Here's the smallest meaningful first step:

1. **This weekend (2 hours):** Buy `parallax.something` at Namecheap. Add it to Cloudflare. This doesn't commit you to anything but takes the longest lead-time item off the table.
2. **Next weekend (4 hours):** Spin up a $5 Hetzner CX21 throw-away. Install Docker. Clone repo. Run `docker compose up`. Don't worry about HTTPS yet â€” you just want to see the stack run on a real Linux host that isn't your laptop. **This is where 80% of first-time-deployment surprises happen** (file permission bugs, path bugs, network bugs). Better to find them on a $5 box.
3. **After that:** Pick a launch date 3â€“4 weeks out. Work the Â§6 plan backwards from it.

Don't read 10 more deployment articles. Just spin up that $5 box.

---

## 11. Cost summary (closed beta, ~10 concurrent users)

| Item | Monthly |
|------|---------|
| Hetzner CCX33 VPS | â‚¬60 (~$65) |
| Domain (amortized) | $1 |
| Backblaze B2 storage | $1 |
| Cloudflare DNS + analytics + email routing | $0 |
| Resend email (free tier) | $0 |
| Sentry (free tier) | $0 |
| UptimeRobot (free tier) | $0 |
| Doppler (free tier) | $0 |
| Gemini Flash API (university scale) | $0â€“10 |
| **Total** | **$70â€“80/mo** |

Public-scale (50 users): $200â€“300/mo on Hetzner; $400â€“600/mo on AWS for same load. Don't go AWS unless you've outgrown the single-host Hetzner setup.

---

## 12. Risks I'd lose sleep over

Ranked by likelihood Ã— impact:

1. **A student finds a way to escape their scenario container and pivot to your backend.** Mitigation: docker-socket-proxy, rootless docker, resource caps. Test it yourself: try `docker run --privileged` from inside a scenario.
2. **One user runs 50 parallel `nmap` scans, OOMs the host, takes down everyone.** Mitigation: per-account session cap + per-container memory caps + AI-cooldown style throttling.
3. **Gemini API key leaks â†’ quota exhaustion â†’ real students get rate-limited.** Mitigation: secrets in Doppler, per-account daily AI-call budget, fall-back static hints.
4. **Postgres corruption mid-defense.** Mitigation: backups, tested restore, replica if you can afford it.
5. **DDoS during demo.** Mitigation: Cloudflare in front (DNS-only is fine for SC, but you can flip to proxy mode if attacked).
6. **University legal sees realistic SQLi/AD attack content and panics.** Mitigation: ToS + AUP + a one-page write-up of your sandbox isolation that you can hand to compliance.

---

## TL;DR

- **Ready for closed beta in ~5â€“7 days of focused work** following Â§6.
- **Not ready for public launch** until Â§7 is done (~3 weeks more).
- **Use Hetzner, not AWS.** Save AWS for when you outgrow a single VPS.
- **Most important first step:** buy a domain + spin up a $5 throwaway VPS this weekend just to see your stack run on real Linux. That single hour will tell you more than 50 deployment articles.
- **Budget:** $70â€“80/mo for closed beta; $200â€“300/mo for public scale.
