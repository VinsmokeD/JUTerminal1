# CyberSim — Security Threat Model (STRIDE)
**Version:** 1.0 · **Date:** 2026-05-29 · **Author:** Claude Code (security review)
**Method:** STRIDE per trust boundary, grounded in code review + live verification on the running stack.
**Scope:** The CyberSim platform itself (not the deliberately-vulnerable scenario targets, which are *intended* to be attackable inside their isolated networks).

> CyberSim is unusual: it deliberately runs offensive tooling. The security goal is **containment** — the platform and its host must stay safe while students attack sandboxed targets, and the platform must not become a launchpad against the real world.

---

## 1. Architecture & trust boundaries

```
                          ┌─────────────── Browser (untrusted user) ───────────────┐
                          │  React SPA · xterm.js · WS client                       │
                          └───────────────┬───────────────────────────┬────────────┘
                            HTTPS/REST     │            WebSocket       │
                ════════════ TRUST BOUNDARY (nginx/Caddy reverse proxy) ════════════
                          │                                            │
                   ┌──────▼──────────────────────────────────────────▼──────┐
                   │ FastAPI backend (authenticated)                         │
                   │  auth · sessions · scope_enforcer · gatekeeper · AI     │
                   └───┬───────────┬──────────────┬───────────────┬──────────┘
                       │ asyncpg   │ redis        │ docker.sock(ro)│ OpenRouter (egress)
                ┌──────▼──┐  ┌─────▼────┐   ┌──────▼───────────┐  ┌▼────────────┐
                │Postgres │  │  Redis   │   │ Docker Engine    │  │ openrouter  │
                └─────────┘  └──────────┘   │  (host)          │  │  .ai (TLS)  │
                                            └──────┬───────────┘  └─────────────┘
                ════════ TRUST BOUNDARY: internal:true scenario networks ════════
                          ┌──────────────┬──────────────┬──────────────┐
                          │ sc01-net     │ sc02-net     │ sc03-net     │  ← NO internet egress
                          │ NovaMed web  │ Nexora AD    │ Orion phish  │     (verified 6/6)
                          └──────────────┴──────────────┴──────────────┘
```

**Key boundaries**
1. **Browser ↔ backend** — all input is untrusted; auth required.
2. **Backend ↔ Docker Engine** — the backend holds a (read-only) docker socket; this is the highest-value target.
3. **Backend ↔ scenario networks** — `internal: true` nets with **no internet egress** (the core safety invariant).
4. **Terminal output ↔ AI** — scenario/PTY text is untrusted input to the LLM (prompt-injection surface).

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
| **S**poofing | Forged/stolen JWT | HS256 JWT signed with `JWT_SECRET`; verified on every REST call **and on WS connect before container attach** (`ws/routes.py:_authenticate`). | ✅ verified |
| **T**ampering | Modified token | Signature check rejects tampering. | ✅ |
| **E**oP | Student → instructor | Role claim checked server-side per route. | ✅ (audit RBAC coverage — Phase 3 follow-up) |
| **DoS** | Credential stuffing | `enforce_rate_limit(limit=30, window=300)` on auth (`auth/routes.py`). | ✅ |
| **Info** | Default admin creds | `admin / CyberSimAdmin!` works live (**Baseline C3**). | ⚠️ **force-rotate / document demo-only** |
| **R**epudiation | "I didn't run that" | `command_log` + `record_activity` persist per-action metadata. | ✅ |

### 3.2 WebSocket command proxy (`ws/routes.py`, `sandbox/terminal.py`)
| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| Spoofing | Unauth WS attach | Token verified + session-ownership check before any PTY attach. | ✅ verified |
| **EoP / scope abuse** | Attack out-of-scope hosts | **`scope_enforcer.check_scope`** blocks public + cross-scenario IPs (ROE gate); `gatekeeper`/`check_gate` block wrong-phase tooling. | ✅ live-verified |
| Tampering | Pivot off the sandbox subnet | `internal: true` networks — **no route to the internet** (verified 6/6 containers; `scripts/verify-network-isolation.sh`). | ✅ verified |
| DoS | Command flood / huge output | Per-session `command_queue` (maxsize 50) + AI cooldown; terminal output not persisted to Postgres (only cmd+metadata). | ✅ |
| Info | Output bloat in DB | Only command + metadata stored, never full PTY output. | ✅ |

### 3.3 AI tutor (`ai/monitor.py`, `ai/security.py`, `system_prompt.md`)
Mapped to the **OWASP LLM Top-10**, defense-in-depth, **wired into the live path** and **live-verified**:
| OWASP | Threat | Mitigation | Status |
|---|---|---|---|
| LLM01 | Prompt injection from PTY/scenario text | `sanitize_untrusted()` wraps + strips injection markers; untrusted text delimited. | ✅ |
| LLM02/06 | Secret disclosure | `redact_for_ai()` scrubs creds/flags from context; `validate_ai_output()` rejects known secrets; `sanitize_tutor_response()` replaces lab creds/payloads with Socratic fallbacks. | ✅ live-verified (held under adversarial prompts) |
| LLM05/07 | Unsafe output / prompt leak | `validate_ai_output()` rejects HTML/script, system-prompt echoes, oversize. | ✅ |
| LLM10 | Unbounded cost | `check_ai_budget()` per-user/global token + call limits; per-session cooldown. | ✅ |
| — | Provider outage | Graceful fallback to static hint trees (and degrades when Redis is down). | ✅ verified |

### 3.4 Sandbox & Docker Engine (`sandbox/manager.py`, compose)
| Threat | Vector | Mitigation | Status |
|---|---|---|---|
| **EoP (highest)** | Backend RCE → docker.sock → host | Socket mounted **read-only** (`:ro`); backend is the only socket holder. | ⚠️ partial — `:ro` limits but does not eliminate; see residual risk R1 |
| DoS | Container resource exhaustion | `deploy.resources.limits` (cpu/mem) per service; `MAX_CONCURRENT_SESSIONS`. | ✅ (cap-drop hardening pending — Phase 2b) |
| Tampering | Orphaned containers | `container_cleanup` reaper + alive grace keys. | ✅ |
| Egress | Scenario container reaches internet | `internal: true` per scenario net. | ✅ verified 6/6 |

### 3.5 Data stores (Postgres, Redis)
| Threat | Mitigation | Status |
|---|---|---|
| Network exposure | Published only on `127.0.0.1` (compose); on internal net otherwise. | ✅ |
| Injection | SQLAlchemy parameterized queries; Pydantic-validated API shapes. | ✅ |
| Key collision / leakage across sessions | Namespaced Redis keys + TTLs; dedup keys prefixed `cybersim:`. | ✅ (consistency sweep — Phase 1 follow-up) |

### 3.6 Frontend (React SPA)
| Threat | Mitigation | Status |
|---|---|---|
| XSS via SIEM/terminal text | xterm.js renders to canvas; SIEM rendered as text, not HTML. | ✅ (CSP headers — Phase 8 follow-up) |
| Token theft | JWT in `localStorage`; same-origin via reverse proxy. | ⚠️ acceptable for lab; httpOnly cookie is the hardened option |

---

## 4. The network-isolation invariant (core safety control)
- Every scenario network is declared `internal: true` → Docker provisions **no gateway to the host/internet**.
- **Empirically verified:** all 6 running scenario containers fail TCP `1.1.1.1:443`; the backend (on the egress `internal` net, needed for OpenRouter) succeeds as a positive control.
- **Regression guard:** `scripts/verify-network-isolation.sh` (non-zero exit on any breach) — run before every live session / in demo-day checks.

---

## 5. Residual risks & recommendations

| ID | Residual risk | Severity | Recommendation |
|---|---|---|---|
| R1 | Backend holds the docker socket (`:ro`). A backend RCE could still enumerate/exec containers. | **High** | Long-term: a brokered sandbox-control microservice with a constrained API instead of a raw socket; short-term: keep the backend attack surface minimal + patched (CI dep-audit). |
| R2 | Default admin credentials work out of the box (C3). | Med | Force a first-boot password change; document as demo-only; never ship in a shared deployment. |
| R3 | Scenario containers not yet `--cap-drop ALL` / `no-new-privileges` / read-only rootfs. | Med | Phase 2b sandbox hardening. |
| R4 | `scope_enforcer` is IP-based; external **hostnames** aren't ROE-blocked (egress is still prevented by isolation). | Low | Add a conservative external-FQDN check if hostname-based ROE teaching is desired. |
| R5 | JWT in `localStorage`; no CSP yet. | Low | Phase 8: CSP + consider httpOnly cookie auth. |
| R6 | JWT uses deprecated `datetime.utcnow()`. | Info | Timezone-aware fix (Phase 3/10 cleanup). |

---

## 6. What was empirically verified (2026-05-29)
- ✅ Network isolation: 6/6 scenario containers internet-blocked; backend egress works (control).
- ✅ AI guardrails held under adversarial prompts (direct/injection/riddle/payload); deterministic sanitizer strips all lab secrets.
- ✅ Scope enforcement blocks public + cross-scenario IPs, allows in-scope, through the real command path.
- ✅ WS auth verified before container attach; rate limiting present on auth.
- ✅ docker.sock mounted read-only.

*Re-verify §4 and §6 before any public/defense deployment. Track R1–R3 as the priority hardening backlog.*
