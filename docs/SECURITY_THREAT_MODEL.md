# Parallax â€” Security Threat Model (STRIDE)
**Version:** 1.0 Â· **Date:** 2026-05-29 Â· **Author:** Claude Code (security review)
**Method:** STRIDE per trust boundary, grounded in code review + live verification on the running stack.
**Scope:** The Parallax platform itself (not the deliberately-vulnerable scenario targets, which are *intended* to be attackable inside their isolated networks).

> Parallax is unusual: it deliberately runs offensive tooling. The security goal is **containment** â€” the platform and its host must stay safe while students attack sandboxed targets, and the platform must not become a launchpad against the real world.

---

## 1. Architecture & trust boundaries

```
                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Browser (untrusted user) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                          â”‚  React SPA Â· xterm.js Â· WS client                       â”‚
                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            HTTPS/REST     â”‚            WebSocket       â”‚
                â•â•â•â•â•â•â•â•â•â•â•â• TRUST BOUNDARY (nginx/Caddy reverse proxy) â•â•â•â•â•â•â•â•â•â•â•â•
                          â”‚                                            â”‚
                   â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
                   â”‚ FastAPI backend (authenticated)                         â”‚
                   â”‚  auth Â· sessions Â· scope_enforcer Â· gatekeeper Â· AI     â”‚
                   â””â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚ asyncpg   â”‚ redis        â”‚ docker.sock(ro)â”‚ OpenRouter (egress)
                â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚Postgres â”‚  â”‚  Redis   â”‚   â”‚ Docker Engine    â”‚  â”‚ openrouter  â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚  (host)          â”‚  â”‚  .ai (TLS)  â”‚
                                            â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â•â•â•â•â•â•â•â• TRUST BOUNDARY: internal:true scenario networks â•â•â•â•â•â•â•â•
                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                          â”‚ sc01-net     â”‚ sc02-net     â”‚ sc03-net     â”‚  â† NO internet egress
                          â”‚ NovaMed web  â”‚ Nexora AD    â”‚ Orion phish  â”‚     (verified 6/6)
                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key boundaries**
1. **Browser â†” backend** â€” all input is untrusted; auth required.
2. **Backend â†” Docker Engine** â€” the backend holds a (read-only) docker socket; this is the highest-value target.
3. **Backend â†” scenario networks** â€” `internal: true` nets with **no internet egress** (the core safety invariant).
4. **Terminal output â†” AI** â€” scenario/PTY text is untrusted input to the LLM (prompt-injection surface).

---

## 2. Assets

| Asset | Why it matters |
|---|---|
| Docker Engine / host | Backend can create/exec containers; compromise = host control. |
| Student PII (accounts, notes, scores) | Privacy/GDPR. |
| Scenario secrets (flags, lab creds) | Leaking them defeats the learning objective. |
| OpenRouter API key | Cost/abuse if exfiltrated. |
| JWT signing secret | Forged sessions / privilege escalation. |
| Network isolation invariant | A breach turns the range into an attack platform. |

---

## 3. STRIDE by component

### 3.1 Authentication & sessions (`auth/`, JWT)
| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| **S**poofing | Forged/stolen JWT | HS256 JWT signed with `JWT_SECRET`; verified on every REST call **and on WS connect before container attach** (`ws/routes.py:_authenticate`). | âœ… verified |
| **T**ampering | Modified token | Signature check rejects tampering. | âœ… |
| **E**oP | Student â†’ instructor | Role claim checked server-side per route. | âœ… (audit RBAC coverage â€” Phase 3 follow-up) |
| **DoS** | Credential stuffing | `enforce_rate_limit(limit=30, window=300)` on auth (`auth/routes.py`). | âœ… |
| **Info** | Default admin creds | `admin / ParallaxAdmin!` works live (**Baseline C3**). | âš ï¸ **force-rotate / document demo-only** |
| **R**epudiation | "I didn't run that" | `command_log` + `record_activity` persist per-action metadata. | âœ… |

### 3.2 WebSocket command proxy (`ws/routes.py`, `sandbox/terminal.py`)
| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| Spoofing | Unauth WS attach | Token verified + session-ownership check before any PTY attach. | âœ… verified |
| **EoP / scope abuse** | Attack out-of-scope hosts | **`scope_enforcer.check_scope`** blocks public + cross-scenario IPs (ROE gate); `gatekeeper`/`check_gate` block wrong-phase tooling. | âœ… live-verified |
| Tampering | Pivot off the sandbox subnet | `internal: true` networks â€” **no route to the internet** (verified 6/6 containers; `scripts/verify-network-isolation.sh`). | âœ… verified |
| DoS | Command flood / huge output | Per-session `command_queue` (maxsize 50) + AI cooldown; terminal output not persisted to Postgres (only cmd+metadata). | âœ… |
| Info | Output bloat in DB | Only command + metadata stored, never full PTY output. | âœ… |

### 3.3 AI tutor (`ai/monitor.py`, `ai/security.py`, `system_prompt.md`)
Mapped to the **OWASP LLM Top-10**, defense-in-depth, **wired into the live path** and **live-verified**:
| OWASP | Threat | Mitigation | Status |
|---|---|---|---|
| LLM01 | Prompt injection from PTY/scenario text | `sanitize_untrusted()` wraps + strips injection markers; untrusted text delimited. | âœ… |
| LLM02/06 | Secret disclosure | `redact_for_ai()` scrubs creds/flags from context; `validate_ai_output()` rejects known secrets; `sanitize_tutor_response()` replaces lab creds/payloads with Socratic fallbacks. | âœ… live-verified (held under adversarial prompts) |
| LLM05/07 | Unsafe output / prompt leak | `validate_ai_output()` rejects HTML/script, system-prompt echoes, oversize. | âœ… |
| LLM10 | Unbounded cost | `check_ai_budget()` per-user/global token + call limits; per-session cooldown. | âœ… |
| â€” | Provider outage | Graceful fallback to static hint trees (and degrades when Redis is down). | âœ… verified |

### 3.4 Sandbox & Docker Engine (`sandbox/manager.py`, compose)
| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| **EoP (highest)** | Backend RCE â†’ docker.sock â†’ host | Socket mounted **read-only** (`:ro`); backend is the only socket holder. | âš ï¸ partial â€” `:ro` limits but does not eliminate; see residual risk R1 |
| DoS | Container resource exhaustion | `deploy.resources.limits` (cpu/mem) per service; `MAX_CONCURRENT_SESSIONS`. | âœ… |
| Tampering | Orphaned containers | `container_cleanup` reaper + alive grace keys. | âœ… |
| Egress | Scenario container reaches internet | `internal: true` per scenario net. | âœ… verified 9/9 (Phase B re-verified) |
| **EoP** | Scenario container privilege escalation | See cap-drop detail below. | âœ… partial (Phase B 2026-05-30) |

**Phase B capability hardening detail (2026-05-30):**

The Kali (student attack) container was already hardened in Phase A: `cap_drop=ALL`, `no-new-privileges`, `user=student`.

Scenario target containers â€” hardened as of Phase B:

| Container | `no-new-privileges` | `cap_drop` | `cap_add` | Removed from default set |
|---|---|---|---|---|
| **sc01-db** (MariaDB) | âœ… | âŒ | â€” | MariaDB uses `gosu` (syscall-based, not setuid-exec); cap_drop deferred â€” DB init needs CHOWN/SETUID/SETGID/DAC_OVERRIDE without full end-to-end DB-init testing |
| **sc01-php** (deliberately vuln, sshd+vsftpd) | âŒ | âŒ | â€” | sshd and vsftpd rely on setuid-exec privilege separation; both options unsafe |
| **sc01-webapp** (httpd:2.4.54 proxy) | âœ… | ALL | NET_BIND_SERVICE, SETUID, SETGID, KILL | AUDIT_WRITE, CHOWN, DAC_OVERRIDE, FOWNER, FSETID, MKNOD, NET_RAW, SETFCAP, SETPCAP, SYS_CHROOT removed |
| **sc01-waf** (nginx ModSec WAF) | âœ… | ALL | NET_BIND_SERVICE, CHOWN, DAC_OVERRIDE, SETUID, SETGID, KILL | AUDIT_WRITE, FOWNER, FSETID, MKNOD, NET_RAW, SETFCAP, SETPCAP, SYS_CHROOT removed (14â†’8 caps) |
| **sc02-dc** (Samba AD DC) | âŒ | âŒ | â€” | Needs SYS_ADMIN, NET_ADMIN, NET_BIND_SERVICE, SETUID/SETGID for AD provisioning; fail-open |
| **sc02-fileserver** (Samba) | âŒ | âŒ | â€” | Same Samba privilege model; fail-open |
| **sc03-mailrelay** (Postfix) | âŒ | âŒ | â€” | Postfix uses chroot + setuid programs (qmgr, pickup) for privilege separation |
| **sc03-phish** (GoPhish, `app` user) | âœ… | ALL | NET_BIND_SERVICE | Pure Go binary, no setuid programs; non-root `app` user; only needs port 80 |
| **sc03-victim** (Flask+Postfix) | âŒ | âŒ | â€” | Postfix setuid programs; fail-open |

Deferred: read-only rootfs (most target containers write to their own overlayfs during operation).

### 3.5 Data stores (Postgres, Redis)
| Threat | Mitigation | Status |
|---|---|---|
| Network exposure | Published only on `127.0.0.1` (compose); on internal net otherwise. | âœ… |
| Injection | SQLAlchemy parameterized queries; Pydantic-validated API shapes. | âœ… |
| Key collision / leakage across sessions | Namespaced Redis keys + TTLs; dedup keys prefixed `parallax:`. | âœ… (consistency sweep â€” Phase 1 follow-up) |

### 3.6 Frontend (React SPA)
| Threat | Mitigation | Status |
|---|---|---|
| XSS via SIEM/terminal text | xterm.js renders to canvas; SIEM rendered as text, not HTML. | âœ… (CSP headers â€” Phase 8 follow-up) |
| Token theft | JWT in `localStorage`; same-origin via reverse proxy. | âš ï¸ acceptable for lab; httpOnly cookie is the hardened option |

---

## 4. The network-isolation invariant (core safety control)
- Every scenario network is declared `internal: true` â†’ Docker provisions **no gateway to the host/internet**.
- **Empirically verified:** all 6 running scenario containers fail TCP `1.1.1.1:443`; the backend (on the egress `internal` net, needed for OpenRouter) succeeds as a positive control.
- **Regression guard:** `scripts/verify-network-isolation.sh` (non-zero exit on any breach) â€” run before every live session / in demo-day checks.

---

## 5. Residual risks & recommendations

| ID | Residual risk | Severity | Recommendation |
|---|---|---|---|
| R1 | Backend holds the docker socket (`:ro`). A backend RCE could still enumerate/exec containers. | **High** | Long-term: a brokered sandbox-control microservice with a constrained API instead of a raw socket; short-term: keep the backend attack surface minimal + patched (CI dep-audit). |
| R2 | Default admin credentials work out of the box (C3). | Med | Force a first-boot password change; document as demo-only; never ship in a shared deployment. |
| R3 | Scenario containers partially hardened (Phase B, 2026-05-30). See Â§3.4 detail. | Low | read-only rootfs deferred; Samba/Postfix/SSHd containers need per-service cap analysis. |
| R4 | `scope_enforcer` is IP-based; external **hostnames** aren't ROE-blocked (egress is still prevented by isolation). | Low | Add a conservative external-FQDN check if hostname-based ROE teaching is desired. |
| R5 | JWT in `localStorage`. Security headers (nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy, **CSP-Report-Only**) added. | Low | Promote CSP from Report-Only to enforcing after browser validation; consider httpOnly cookie auth. |
| R6 | JWT uses deprecated `datetime.utcnow()`. | Info | Timezone-aware fix (Phase 3/10 cleanup). |

---

## 6. What was empirically verified

**2026-05-29:**
- âœ… Network isolation: 6/6 scenario containers internet-blocked; backend egress works (control).
- âœ… AI guardrails held under adversarial prompts (direct/injection/riddle/payload); deterministic sanitizer strips all lab secrets.
- âœ… Scope enforcement blocks public + cross-scenario IPs, allows in-scope, through the real command path.
- âœ… WS auth verified before container attach; rate limiting present on auth.
- âœ… docker.sock mounted read-only.

**2026-05-30 (Phase B):**
- âœ… Network isolation: 9/9 scenario containers internet-blocked after capability hardening.
- âœ… sc01-db healthy with `no-new-privileges` (MariaDB gosu-based privilege drop works).
- âœ… sc01-webapp healthy with `cap_drop ALL` + `cap_add [NET_BIND_SERVICE, SETUID, SETGID, KILL]`.
- âœ… sc01-waf healthy with `cap_drop ALL` + `cap_add [NET_BIND_SERVICE, CHOWN, DAC_OVERRIDE, SETUID, SETGID, KILL]`.
- âœ… sc03-phish healthy with `cap_drop ALL` + `cap_add [NET_BIND_SERVICE]`.
- âœ… Kali container: unchanged (already `cap_drop ALL` + `no-new-privileges` from Phase A).
- âœ… Full backend test suite: 331 passed.

*Re-verify Â§4 and Â§6 before any public/defense deployment. Track R1, R3 (residual) as the priority hardening backlog.*
