# Opt-in TLS / HTTPS

The default Parallax stack runs over plain HTTP behind nginx (single-host lab).
TLS is **available as an opt-in overlay** so the platform can be demonstrated /
deployed over HTTPS without modifying the default `docker compose up` path.

## Why it's opt-in
- The certs are **self-signed** (no public CA), so browsers show a one-time
  "not trusted" warning — fine for a lab, undesirable mid-demo.
- The running demo stack stays on HTTP so nothing it depends on (frontend API
  base URL, WebSocket origin, CORS) needs rewiring on the day.

## Enable it

```powershell
# 1) Generate a self-signed cert (once)
scripts/generate-tls-cert.ps1

# 2) Bring nginx up with the TLS overlay
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d nginx
```

Plain openssl equivalent (any shell with openssl, e.g. Git Bash):

```bash
mkdir -p infrastructure/nginx/certs
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout infrastructure/nginx/certs/parallax.key \
  -out    infrastructure/nginx/certs/parallax.crt \
  -days 365 -subj "/C=JO/O=Parallax/CN=parallax.local" \
  -addext "subjectAltName=DNS:parallax.local,DNS:localhost,IP:127.0.0.1"
```

Then browse to `https://localhost`. Port 80 issues a 301 redirect to 443.

## What the overlay changes
| | Default (`nginx.conf`) | TLS overlay (`nginx.tls.conf`) |
|---|---|---|
| Ports | 80 | 80 (→301 redirect) + 443 |
| Transport | HTTP | TLS 1.2/1.3, `HIGH:!aNULL:!MD5` |
| HSTS | — | `max-age=31536000; includeSubDomains` |
| Other security headers | yes | yes (unchanged) |

## Revert
`docker compose up -d nginx` (without the `-f docker-compose.tls.yml`) restores
the plain-HTTP nginx. Certs live in `infrastructure/nginx/certs/` and are
git-ignored (never commit private keys).
