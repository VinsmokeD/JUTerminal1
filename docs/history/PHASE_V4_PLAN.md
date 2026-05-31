# Phase v4 — Realism, Guidance & Usability Plan

**Status:** Plan ready for execution
**Owner:** Claude Code
**Author:** 2026-05-17
**Prereqs:** v3 Operations Center foundation (commits `7ce3653`, `14190a4`, `3e10c50`, `5f0c978`)
**Scope:** Close the v3 design loop, harden terminal UX, deepen scenario realism, surface tool outputs as teaching artifacts for all three missions.

---

## 0. Where v3 left off (audit summary)

What v3 shipped (verified from `CONTINUOUS_STATE.md` 2026-05-16 entries + filesystem):
- ✅ Phase 1: Foundation tokens, motion tokens, focus rings, perf tier
- ✅ Phase 2: UI primitives (Button, Card, Badge, Stat, Modal, Empty, PerfTier, useTilt)
- ✅ Phase 3: WorkspaceTopBar + ConnectionPill, Red+Blue workspaces re-skinned
- ✅ Phase 4 (partial): ScenarioCard built; Dashboard still uses ad-hoc layout for filters, briefing modal, session list
- ✅ Phase 5: HeroScene3D + perf-tier fallback on Landing
- ✅ Phase 7 (partial): Cmd+K palette mounted, only Navigate/Scenarios/Account; no Mission/Tool/Copy actions
- ⏳ Phase 6: Debrief polish — not started
- ⏳ Phase 8: SIEM/Notebook/AiHint micro-polish — not started
- ⏳ Phase 9: Settings/Profile/Theme — not started
- ⏳ Phase 10: Responsive + a11y pass — partially via media queries in `index.css:757`

Bug-fix pass also shipped: phase_update WS, MED severity render, SIEM cache, alert() removal.

---

## 1. Workstreams (parallel-safe groupings)

| WS | Theme | Time | Risk |
|----|-------|------|------|
| **WS-A** | Terminal usability (scroll/copy/paste/resize/find/font) | 1.5 d | Low |
| **WS-B** | Resizable + customizable workspace shell | 1.5 d | Low |
| **WS-C** | Scenario realism — SC-01 webapp deepening | 2 d | Med |
| **WS-D** | Scenario realism — SC-02 AD deepening | 2 d | Med |
| **WS-E** | Scenario realism — SC-03 phishing deepening | 1.5 d | Med |
| **WS-F** | "Read-the-output" guided panels + annotated outputs | 2 d | Low |
| **WS-G** | Multiple methodology paths + hint diversification | 1.5 d | Low |
| **WS-H** | Design v3 close-out (Phases 4-rest, 6, 7-rest, 8, 9) | 2 d | Low |

Order recommendation: WS-A + WS-B (unblocks usability fastest) → WS-C/D/E in parallel → WS-F/G layered on top → WS-H polish last.

---

## 2. WS-A — Kali terminal usability

**Files:**
- `frontend/src/components/terminal/Terminal.jsx`
- `frontend/src/hooks/useTerminal.js`
- (new) `frontend/src/components/terminal/TerminalToolbar.jsx`
- `frontend/package.json` (xterm-addon-search, xterm-addon-canvas)

**Problems today:**
1. The absolute `<textarea>` at `Terminal.jsx:130` (z-20, full-bleed) intercepts mousedown — kills xterm's native mouse selection. Copy via Ctrl-C is captured as SIGINT (`keyToTerminalData` line 54). Paste only works because of the `handlePaste` fallback.
2. No visible scroll affordances; user must rely on wheel.
3. No find / no font-size / no clear-screen button / no "open new tab".
4. Resize is automatic via ResizeObserver but panel size is fixed.

**Actions:**

| # | Change | File | Effort |
|---|--------|------|--------|
| A1 | Add xterm-addon-search; expose `findNext` / `findPrev` via ref | `useTerminal.js` | S |
| A2 | Wire native selection: when user holds Shift OR has selection length > 0, set `pointer-events: none` on capture textarea so xterm receives mouse | `Terminal.jsx` | S |
| A3 | Ctrl-Shift-C → copy selection (`term.getSelection()` + `navigator.clipboard.writeText`); Ctrl-Shift-V → paste; preserve Ctrl-C SIGINT default behavior | `Terminal.jsx` keyboard handler | S |
| A4 | Right-click context menu: Copy / Paste / Clear / Find / Reset | new `TerminalContextMenu.jsx` | M |
| A5 | Toolbar above terminal: font-size −/+, find, clear (`\x1b[2J\x1b[H` sent locally), copy-all, scroll-to-top, scroll-to-bottom, new-tab (deferred) | new `TerminalToolbar.jsx` | M |
| A6 | Persist user font-size & theme in `localStorage` (`cs.terminal.font`, `cs.terminal.theme`) | `useTerminal.js` | S |
| A7 | Add `xterm-addon-canvas` renderer with WebGL fallback for perf-tier 3 | `useTerminal.js` | S |
| A8 | Scrollback bar styling (thin teal scrollbar via `.xterm-viewport { scrollbar-width: thin }`) | `index.css` | S |
| A9 | Selection clipboard mode toggle — when "auto-copy on select" enabled, copy to clipboard automatically | `Terminal.jsx` | S |
| A10 | Touch support: long-press → context menu; pinch-zoom font size | `Terminal.jsx` | M |

**Acceptance:** Student can drag-select an IP from nmap output and Ctrl-Shift-C it into a note. Ctrl-C still sends SIGINT. Toolbar font-size persists across reload. Right-click works.

---

## 3. WS-B — Resizable / customizable workspace

**Files:**
- `frontend/src/index.css:680` (`.workspace-grid`)
- `frontend/src/pages/RedWorkspace.jsx` + `BlueWorkspace.jsx`
- (new) `frontend/src/components/workspace/ResizableSplit.jsx`
- (new) `frontend/src/components/workspace/LayoutPicker.jsx`
- (new) `frontend/src/store/layoutStore.js`

**Today:** Grid is `1fr / 300–360px` columns + `1fr / 1fr / 0.48fr` rows — fixed. No drag handles. No collapse/expand.

**Actions:**

| # | Change | Effort |
|---|--------|--------|
| B1 | Replace CSS grid with `react-resizable-panels` (vetted, tiny, no jQuery). Three named regions: `mainCol` (terminal+notebook), `sideCol` (AI Tutor+SIEM), and within `mainCol` a vertical split (terminal vs notebook). | M |
| B2 | Drag handles styled as 4-px borders that highlight on hover with the role accent color | S |
| B3 | Each panel gets collapse/expand chevron in its header (PanelHeader extension) | S |
| B4 | `layoutStore` persists user preferences per-role and per-scenario: pane sizes, collapsed state, font-size, AI mode | M |
| B5 | LayoutPicker dropdown in WorkspaceTopBar with 3 presets: **Focus** (terminal 80%, side hidden, notebook in popout), **Balanced** (current), **Debug** (SIEM 50%, terminal 50%, notebook hidden) | M |
| B6 | Reset-layout button | XS |
| B7 | Full-screen toggle per panel (`Esc` to exit) — uses Fullscreen API on panel element | S |

**Acceptance:** User drags terminal vertical edge → SIEM column shrinks; reload preserves it. "Focus" preset hides AI Tutor pane.

---

## 4. WS-C — SC-01 realism deepening (NovaMed)

**Files:**
- `infrastructure/docker/scenarios/sc01/Dockerfile.webapp`
- `infrastructure/docker/scenarios/sc01/index.php`
- `infrastructure/docker/scenarios/sc01/init.sql`
- `infrastructure/docker/scenarios/sc01/entrypoint.sh`
- (new) `infrastructure/docker/scenarios/sc01/.env_leak`
- (new) `infrastructure/docker/scenarios/sc01/.git/` seed
- (new) `infrastructure/docker/scenarios/sc01/backup.zip` seed
- `docs/scenarios/SC-01-webapp-pentest.yaml`
- `docker-compose.yml` (scenario services block)

**Today:** Single PHP/Apache + MySQL. SQLi + LFI + IDOR + upload. Banner *claims* Apache 2.4.49 + PHP 7.4.3 but image is `php:7.4-apache` (Apache 2.4.x but version mismatches; CVE-2021-41773 is for Apache 2.4.49–2.4.50 path-traversal). FTP and SSH exist but aren't wired to scenario goals.

**Pillars:**

### C1 — Match banner ↔ real vulnerable version
Pin Apache to `httpd:2.4.49` in a sidecar reverse-proxy container OR use `vulhub/httpd:2.4.49` as the public-facing service. Result: `nmap -sV` returns true `Apache 2.4.49`; CVE-2021-41773 path traversal `/cgi-bin/.%2e/...%2e/etc/passwd` succeeds. Backend PHP stays separate (Tomcat-style).

### C2 — Add realistic ancillary services
Inside `sc01-web` container (or sidecar):
- **vsftpd 2.3.4** (backdoor CVE — already in image as vsftpd but pin version + drop deliberate `:)` smiley in user list)
- **Redis 4.0.10** on 6379 bound to internal 172.20.1.x — no auth, gives RCE via `CONFIG SET dir`
- **phpMyAdmin** at `/phpmyadmin/` with weak creds in commented config
- **Apache mod_status** open at `/server-status?refresh=5` — leaks visitor IPs and request URIs

### C3 — Discoverable artifacts (guide the student)
- `/.git/config` + objects pack (truncated) — `git-dumper` reveals commit history with hardcoded credentials
- `/backup.zip` (404 on link, 200 on direct GET) — contains `db_backup.sql` with admin hash
- `/.env.bak` with `JWT_SECRET=` and `DB_PASS=` (also referenced from index.php as a comment hint)
- `/uploads/.htaccess` permissive (allows `.phtml` exec — bypass for filename filter)
- `/robots.txt` with `Disallow: /admin`, `Disallow: /backup`, `Disallow: /api/v1/`
- HTML comment in login page: `<!-- TODO: migrate from MD5, ticket NM-1284 -->`
- `/swagger.json` exposing `/api/v1/patients/{id}` and `/api/v1/users/{id}` (IDOR breadcrumb)
- Server `X-Powered-By: PHP/7.4.3` + `Server: Apache/2.4.49 (Ubuntu)` headers actually emitted (currently only in HTML comment)

### C4 — Methodology branching
Add **3 valid paths to root** (the student picks one, AI Tutor recognizes which):
1. **SQLi → admin → upload .phtml shell → RCE** (current path)
2. **CVE-2021-41773 path traversal → /etc/shadow → john crack** (new)
3. **Redis unauth → CONFIG SET dir + dbfilename → write `authorized_keys`** (new)

YAML adds `methodologies` block listing each path's required tools + flag chain; `scenarios/engine.py` evaluates whichever the student is closer to completing.

### C5 — Banner realism
Update HTML title to "NovaMed Patient Portal v3.2.1" with a TM, friendly footer "© 2023 NovaMed Healthcare LLC | Powered by HealthStack CMS", and login form with reCAPTCHA-placeholder div (broken anti-bot to teach inspection).

**Effort:** ~2 days. New Dockerfile + 4 seed files + YAML rewrite + 3 detection rules in soc_detection.

**Acceptance:** `nmap -sV 172.20.1.20` lists Apache 2.4.49, vsftpd, openssh, redis. `curl http://172.20.1.20/cgi-bin/.%2e/.%2e/.%2e/.%2e/etc/passwd` returns the file. `git-dumper http://172.20.1.20/.git /tmp/x` works.

---

## 5. WS-D — SC-02 realism deepening (NEXORA AD)

**Files:**
- `infrastructure/docker/scenarios/sc02/provision-dc.sh`
- `infrastructure/docker/scenarios/sc02/smb.conf`
- (new) `infrastructure/docker/scenarios/sc02/sysvol-seed/`
- (new) `infrastructure/docker/scenarios/sc02/Dockerfile.workstation`
- `docs/scenarios/SC-02-ad-compromise.yaml`

**Today:** 5 users + 2 SPN service accounts + RC4 enabled → Kerberoasting works. Good baseline. Missing realism:

### D1 — Realistic share content (file server)
In `Dockerfile.fileserver` shares, seed:
- `\\NEXORA-FS01\HR$\onboarding\new_hire_checklist.docx` (decoy)
- `\\NEXORA-FS01\IT$\scripts\backup.ps1` containing **plaintext password** `$Cred = 'svc_sql:SqlPass456!'`
- `\\NEXORA-FS01\Public\readme.txt` with hint about a `Groups.xml` in SYSVOL

### D2 — GPP Groups.xml in SYSVOL
Drop `/var/lib/samba/sysvol/nexora.local/Policies/{GUID}/Machine/Preferences/Groups/Groups.xml` containing the well-known GPP **cpassword** for local admin account `gpadmin:CPasswordHere` (use the publicly known AES key — this is the documented Microsoft fail). Tool: `gpp-decrypt` extracts.

### D3 — AS-REP roastable user
```bash
samba-tool user create rgreen "Spring2024" --userou='OU=Users'
samba-tool user setexpiry rgreen --noexpiry
# Set DONT_REQ_PREAUTH bit
ldbmodify ... -- userAccountControl: 4194304
```
Tool: `GetNPUsers.py` extracts AS-REP hash without creds.

### D4 — Realistic event audit log
Enable Samba audit module: `vfs objects = full_audit recycle`. Configure `full_audit:prefix = %u|%I|%S` and pipe to `/var/log/samba/audit.log` formatted to match Windows Event IDs (4624 logon, 4625 fail, 4768 TGT, 4769 service ticket, 4670 file access). Blue team's SIEM tails this file.

### D5 — Workstation host with cached creds
New `nexora-ws01` Ubuntu container with `gsamba` to simulate `jsmith` cached cred and a `mimikatz`-style dump file at `/tmp/lsass.dmp` (synthetic) the student can `scp` after lateral movement. Note: **no real LSASS exposure** — file is a marker; AI Tutor confirms "credential dump captured".

### D6 — Banner realism
DC welcome banner on SMB connect: `\\NEXORA-DC01\IPC$ — Windows Server 2019 Standard 17763.4737 (Samba 4.15.13)`. Adds to fingerprinting realism.

**Acceptance:** `enum4linux-ng 172.20.2.10` returns users + shares + OS guess "Windows Server 2019". `GetNPUsers.py NEXORA.LOCAL/ -no-pass -usersfile users.txt` returns rgreen's AS-REP hash. `gpp-decrypt cpassword` returns the plaintext.

---

## 6. WS-E — SC-03 realism deepening (Phishing)

**Files:**
- `infrastructure/docker/scenarios/sc03/Dockerfile.gophish`
- `infrastructure/docker/scenarios/sc03/init-gophish.sh`
- `infrastructure/docker/scenarios/sc03/victim-simulator.py`
- (new) `infrastructure/docker/scenarios/sc03/landing-pages/`
- (new) `infrastructure/docker/scenarios/sc03/payloads/`
- `docs/scenarios/SC-03-phishing.yaml`

### E1 — Realistic landing page
Replace generic Bootstrap with a **fake NEXORA SSO portal** (visual clone of Okta/Azure login). Captures username + password + 2FA prompt. Server logs go to GoPhish events.

### E2 — Payload variety
Three deliverable payloads under `/payloads/`:
- `Q4_Bonus_Schedule.docm` (macro auto-runs PowerShell beacon — synthetic)
- `IT_VPN_Setup.iso` (containerized LNK file pointer)
- `Invoice_2024.pdf` (embeds JS — harmless `console.log` proves execution)

### E3 — Victim simulator response patterns
Today simulator probabilistically clicks. Enhance:
- Three persona classes — **fast clicker (CFO)**, **suspicious (security-aware)**, **average user**
- Probabilities pulled from `personas.json` not hardcoded
- After click, simulator emits a fake C2 beacon to `attacker.local:443` HTTPS — Blue Team must spot beacon pattern in SIEM (regular interval + low data volume)

### E4 — DMARC/SPF misconfig as breadcrumb
- `dig TXT nexora.local` returns intentionally weak SPF: `v=spf1 ~all` (soft-fail allows spoof)
- No DMARC record — phishing-from-domain succeeds
- Red Team learns this in OSINT phase; Blue Team's IR report must flag it

### E5 — Beacon detection rules
Update `soc_detection` in YAML:
- `trigger_regex: "beacon|/api/cmd|/api/check-in"`, severity high, MITRE T1071.001
- `trigger_regex: "smtp.*reply-to.*nexora"`, severity medium, T1566.002

**Acceptance:** Student launches GoPhish campaign → simulator clicks within 30–120s → SIEM shows `beacon` event chain → student can trace timeline.

---

## 7. WS-F — "Read-the-Output" guided panels

**Files:**
- (new) `frontend/src/components/terminal/OutputAnnotator.jsx`
- (new) `frontend/src/components/terminal/OutputInsightPanel.jsx`
- (new) `backend/src/scenarios/output_patterns.py`
- (new) `backend/src/scenarios/patterns/sc01_outputs.json`, `sc02_outputs.json`, `sc03_outputs.json`
- `backend/src/ws/routes.py` (after PTY output, run pattern scan)
- `frontend/src/hooks/useWebSocket.js` (handle `output_insight` event)

**Concept:** When the PTY output stream emits a recognized fingerprint (e.g., nmap's `22/tcp open ssh OpenSSH_7.4`), backend pushes a `output_insight` WS event to the frontend. The OutputAnnotator overlays a small underline in the terminal at the matched line; clicking opens an explanation card.

**Pattern format (`sc01_outputs.json`):**
```json
[
  {
    "id": "nmap-apache-2449",
    "regex": "Apache/2\\.4\\.49",
    "what": "Apache 2.4.49 is vulnerable to CVE-2021-41773 (path traversal)",
    "why": "This version slipped a regression that lets %2e bypass URL normalization",
    "next": "Try: curl --path-as-is 'http://{target}/cgi-bin/.%2e/.%2e/.%2e/etc/passwd'",
    "tags": ["recon", "cve"]
  }
]
```

**Effort:** ~2 days. Backend pattern engine + JSON catalogs (~40 patterns total) + frontend overlay component.

**Acceptance:** Running `nmap -sV 172.20.1.20` lights up the Apache line; clicking shows the CVE explanation + ready-to-copy exploit command. Same for SC-02 `samba-tool` and SC-03 GoPhish output.

---

## 8. WS-G — Methodology diversification + hints

**Files:**
- `backend/src/scenarios/hints/sc01_hints.json` etc.
- `docs/scenarios/*.yaml` — add `methodologies:` block per scenario
- `frontend/src/components/methodology/PhaseTrail.jsx` — show branch chosen
- `frontend/src/components/hints/AiHintPanel.jsx` — render branch-aware hints

**Today:** Hints are linear L1/L2/L3 per phase. AI doesn't acknowledge alternative paths.

**Action:** Each scenario gets 2–3 valid attack paths. Hints split by branch:

```json
"3": {
  "branch_sqli": { "L1": [...], "L2": [...], "L3": [...] },
  "branch_lfi":  { "L1": [...], "L2": [...], "L3": [...] },
  "branch_redis":{ "L1": [...], "L2": [...], "L3": [...] }
}
```

`engine.py` infers active branch from tools used (`whatweb` only → unknown; `sqlmap` → sqli; `--path-as-is` → lfi; `redis-cli` → redis). PhaseTrail shows a tiny branch icon next to the phase chip.

**Acceptance:** Two students running SC-01 with different tool sequences get different hint trees and both reach completion.

---

## 9. WS-H — Design v3 close-out

| Phase | Change | File |
|-------|--------|------|
| 4-rest | Dashboard search/filter chips (by tactic, difficulty, time), session-history rail, "resume last session" CTA | `pages/Dashboard.jsx` |
| 6 | Debrief: kill-chain SVG timeline, score breakdown stat tiles, learning-insights cards, export-PDF button (jsPDF) | `pages/Debrief.jsx` |
| 7-rest | Cmd+K: add Mission actions (Submit flag, Request hint L1/L2/L3, Toggle AI mode, Switch role); Tool actions (Copy target IP, Insert command); Terminal actions (Clear, Find, New tab) | `components/palette/CommandPalette.jsx` |
| 8 | SIEM row: severity gradient bar, hover for raw event JSON, click → open in EventDrawer; Notebook: tag chips colored by type (`#finding` red, `#evidence` blue, `#question` amber), markdown preview pane | `components/siem/`, `components/notes/` |
| 9 | Settings modal: theme (dark/contrast), font, animations on/off, terminal preferences, AI verbosity, reset learning data | new `pages/Settings.jsx` |
| 10 | A11y: keyboard-only operability check (all CTAs Tab-reachable, focus visible), ARIA-live for SIEM events, reduced-motion respected end-to-end | sweep |

---

## 10. Execution order & milestones

| Day | Workstreams |
|-----|-------------|
| 1 | WS-A (terminal toolbar + selection + clipboard) ; WS-B start (react-resizable-panels swap) |
| 2 | WS-B finish (layout presets + persistence) ; WS-H Phase 7-rest (palette actions) |
| 3 | WS-C (SC-01 deepening) ; WS-F backend pattern engine + sc01_outputs.json |
| 4 | WS-D (SC-02 deepening) ; WS-F frontend OutputAnnotator |
| 5 | WS-E (SC-03 deepening) ; WS-G branch-aware hints for SC-01 |
| 6 | WS-G remaining hints (SC-02/03) ; WS-H Phase 6 Debrief polish |
| 7 | WS-H Phase 8 (SIEM/Notebook polish) ; Phase 9 (Settings) |
| 8 | Phase 10 a11y sweep ; full E2E verification ; CONTINUOUS_STATE update |

---

## 11. Verification gates (Empirical Verification rule)

Per `CLAUDE.md` "Empirical Verification" — every workstream must end with:

- **WS-A**: Manual: open Red workspace, run `cat /etc/passwd`, drag-select, Ctrl-Shift-C, paste into notebook. ✅
- **WS-B**: Manual: resize panel, reload, sizes persist. Cycle 3 presets. ✅
- **WS-C/D/E**: `docker compose -f infrastructure/docker/scenarios/sc0X/docker-compose.yml up -d` + `pytest backend/tests/integration/test_sc0X_realism.py` (new) — assert each fingerprint reachable. ✅
- **WS-F**: Run nmap in real session, confirm `output_insight` WS frame in network tab. ✅
- **WS-G**: Two test sessions with different tool sequences hit different hint paths. ✅
- **WS-H**: `npx vite build` green ; manual smoke of dashboard, debrief, settings, palette, SIEM drawer. ✅

---

## 12. Risk + mitigation

| Risk | Mitigation |
|------|-----------|
| Pinning Apache 2.4.49 image may collide with PHP container bridge | Use sidecar reverse-proxy pattern: vulnerable Apache fronts PHP-FPM on internal port |
| GPP cpassword + AS-REP setup needs root in samba-tool LDIF edits | Run as part of `provision-dc.sh` post-provision step with `--simple-bind-dn` |
| react-resizable-panels SSR + xterm.js timing | Mount xterm inside Panel `onLayout` callback after size settles |
| Output-pattern engine running on every chunk could be hot | Cache compiled regex; only run on lines containing `\n`; throttle to 5/sec |
| Branch detection misclassifies → wrong hints | Default to "generic" branch when uncertain; hints fall back to current linear set |

---

## 13. Out of scope (explicit non-goals)

- Multi-tenant / multiplayer mode
- Real Internet egress for any container
- Windows-native AD (Samba stays)
- Mobile-first workspace (tablet acceptable target)
- New scenarios (SC-04+) — out of v2.0 scope per `MEMORY.md`

---

## 14. Deliverable on completion

1. Updated `CONTINUOUS_STATE.md` with timestamped entry per workstream
2. Updated `PROJECT_UNDERSTANDING.md` reflecting new realism layer
3. Demo recording (or screenshots) for: terminal copy/paste, resizable panels, SC-01 CVE-41773 exploit working, output insight overlay
4. `pytest -q` green
5. `npx vite build` green
6. Commit chain: `feat(terminal): usability + clipboard`, `feat(workspace): resizable layout`, `feat(sc01): cve-41773 + ancillary services`, `feat(sc02): gpp + asrep`, `feat(sc03): personas + dmarc`, `feat(scenarios): output-pattern engine`, `feat(hints): branch-aware`, `feat(ui): debrief + settings + palette`, `chore(a11y): keyboard + reduced-motion sweep`
