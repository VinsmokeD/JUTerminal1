# Parallax â€” Live Verification Evidence
**Date:** 2026-05-29 Â· **Method:** executed against the running Docker stack (not doc claims).
**Purpose:** examiner-ready proof that the core subsystems work end-to-end.

> Every result below is real command/script output captured on the live stack on this date.

---

## 1. Stack health â€” all green
`GET /api/health/readiness` â†’ `overall: ok`
```
postgres: ok   redis: ok   elasticsearch: ok (yellow)   openrouter: ok
```
All core + scenario containers `Up (healthy)`. Backend healthcheck transitions `starting â†’ healthy` in ~9s.

## 2. Network isolation (the #1 safety invariant) â€” 6/6 contained
`scripts/verify-network-isolation.sh` â†’ exit 0:
```
[ok] parallax-sc01-php-1        blocked from 1.1.1.1:443
[ok] parallax-sc02-fileserver-1 blocked from 1.1.1.1:443
[ok] parallax-sc02-dc-1         blocked from 1.1.1.1:443
[ok] parallax-sc03-phish-1      blocked from 1.1.1.1:443
[ok] parallax-sc03-victim-1     blocked from 1.1.1.1:443
[ok] parallax-sc03-mailrelay-1  blocked from 1.1.1.1:443
RESULT: all scenario containers are internet-isolated.
```
Positive control: the backend (on the egress `internal` net) *can* reach the internet (it calls OpenRouter).

## 3. AI tutor â€” live + safe
- Real OpenRouter call: `HTTP 200`, model `deepseek/deepseek-chat-v3-0324`.
- `get_ai_hint()` returns a genuine Socratic hint that references the live command.
- **Adversarial prompts held** (direct credential ask, prompt injection, riddle, payload request) â€” no leak.
- **Deterministic sanitizer backstop** strips every lab secret even if the LLM emitted it:
  `Backup2023!`, `Password123`, `admin'--`, `' OR 1=1`, `../../etc/passwd` â†’ all flagged, `leaked_after=False`.
- `validate_ai_output(secret)` â†’ `(False, "[Output rejected: sensitive credential disclosure detected]")`.

## 4. ROE scope enforcement (`scope_enforcer`) â€” live through the real command path
Seeded SC-01 session, called the real `_handle_terminal_command`:
```
nmap -sV 8.8.8.8       (public internet)     -> OUT OF SCOPE blocked
nmap -sV 172.20.2.20   (another scenario)    -> OUT OF SCOPE blocked
whoami                 (in-scope, no target) -> allowed
```
No handler exceptions; fail-open guard in place.

## 5. Red â†’ Blue SIEM data path â€” live, MITRE-tagged, persisted
Real `create_command_siem_events` + `publish_command_siem_events` on a live SC-01 session:
```
nmap -sV 172.20.1.20                 -> 2 events  (MITRE T1046 Network Service Discovery)
gobuster dir -u http://172.20.1.20   -> 1 event   (MITRE T1083 File/Directory Discovery)
sqlmap -u http://172.20.1.20/login   -> 3 events  (MITRE T1083 â€¦)
TOTAL: 6 generated, 6 persisted in Postgres, delivered to the siem:{session}:feed channel.
```
SIEM event maps: SC-01 (27 events / 9 ATT&CK techniques), SC-02 (25 / 11), SC-03 (27 / 16).

## 6. Scoring â€” deterministic & correct
- Rubric documented in `docs/SCORING.md`.
- Fixed a double-count bug (hint penalties were subtracted twice); guarded by a named regression test.
- `final_score = clamp_0_100(running_score + time_bonus)`.

## 7. Test suite & CI
- `pytest --ignore=tests/e2e` â†’ **329 passed** (hermetic run against a dedicated `parallax_test` DB verified).
- CI (`.github/workflows/ci.yml`): GATEs = tests + frontend build + `docker compose config` + image build; black is now a blocking gate; deps/secret scans advisory.
- Both backend & frontend images build clean.

---

### How to reproduce
```bash
docker compose up -d
curl -s localhost/api/health/readiness            # Â§1
bash scripts/verify-network-isolation.sh          # Â§2 (start a scenario profile first)
cd backend && pytest --ignore=tests/e2e -q        # Â§7  (needs a parallax_test DB or TEST_POSTGRES_URL)
```
Sections 3â€“5 are reproduced by the scripts recorded in `CONTINUOUS_STATE.md` (2026-05-29 entries).
