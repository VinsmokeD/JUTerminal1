# SC-02 — Active Directory Compromise: Nexora Financial

## Client briefing
**Client**: Nexora Financial Services
**Type**: Internal Network Penetration Test (Gray Box)
**Starting position**: Valid domain credentials provided (jsmith / Welcome1!)
**Goal**: Demonstrate path from low-privilege user to Domain Admin

## Scope
- Domain: nexora.local (192.168.50.0/24 in sim: 172.20.2.0/24)
- All workstations, servers, DC in scope
- No destruction of AD objects
- No disabling of the DC itself
- Document every privilege escalation step in real time

## ROE
```
1. You have been given credentials for a standard domain user: jsmith / Welcome1!
2. You may NOT create new domain admin accounts permanently — document the path only.
3. You may NOT delete or modify GPOs in a way that affects all users.
4. DCSync attack is permitted ONLY against the simulated DC container.
5. All lateral movement must be documented with source/destination and technique used.
6. Mimikatz usage is permitted but all output must be captured in notes immediately.
7. Stop condition: Once you have DA hash or Golden Ticket material, the engagement ends.
```

## Target environment
- DC: NEXORA-DC01 (172.20.2.20) — Samba4 AD, Windows Server 2019-compatible
- WS01: NEXORA-WS01 (172.20.2.30) — jsmith's workstation
- WS02: NEXORA-WS02 (172.20.2.31) — helpdesk workstation
- FS01: NEXORA-FS01 (172.20.2.40) — file server, SMB shares

## Pre-seeded misconfigurations
1. svc_backup account — Kerberoastable (RC4 only, weak password: Backup2023)
2. WS02 has local admin password same as domain admin (credential reuse)
3. Unconstrained delegation on FS01 (allows Kerberos ticket capture)
4. jsmith has SeImpersonatePrivilege on WS01 (potato attack possible)
5. LAPS not deployed — local admin passwords not randomized
6. SMB signing disabled on workstations (enables relay attacks)

## Phase breakdown

### Phase 1 — Domain reconnaissance
MITRE: T1087 (Account Discovery), T1069 (Permission Groups Discovery), T1482 (Domain Trust Discovery)

Objectives:
- Enumerate all domain users and groups
- Identify high-value targets (DA members, service accounts)
- Map computer accounts and their roles
- Find Kerberoastable accounts (servicePrincipalName set)
- Identify unconstrained delegation objects

Tool hints:
- L1: "With valid domain credentials, you can query the directory. Think about what protocol Active Directory uses for directory queries — and what tools speak that protocol."
- L2: "There's a graph-based tool that ingests domain data and shows you attack paths visually — it runs a collector on a domain-joined host first."
- L3: "Run BloodHound with SharpHound collector: `./SharpHound.exe -c All`. Import the ZIP into BloodHound. Find the shortest path to Domain Admin from jsmith."

Expected findings:
- svc_backup has SPN set → Kerberoastable
- FS01 has TrustedForDelegation → unconstrained delegation
- DA group members: Administrator, it.admin (only 2 — small org)

### Phase 2 — Kerberoasting
MITRE: T1558.003 (Steal or Forge Kerberos Tickets — Kerberoasting)

Process:
1. Request TGS ticket for svc_backup's SPN
2. Extract ticket hash (RC4-HMAC)
3. Crack offline with hashcat rule-based attack
4. Obtain svc_backup plaintext: Backup2023

Tool hints:
- L1: "You've found a service account with an SPN. This creates an opportunity to request a service ticket that contains an encrypted portion — encrypted with the account's password hash. What can you do with that?"
- L2: "Impacket has a module specifically for requesting these tickets. The output is a hash format that cracking tools understand directly."
- L3: "Run `GetUserSPNs.py nexora.local/jsmith:Welcome1! -dc-ip 172.20.2.20 -request` then crack with `hashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt -r best64.rule`"

SOC detection:
- Event ID 4769 — Kerberos Service Ticket Request
- Flag: RC4 encryption type requested for svc_backup (weak encryption — anomaly)
- Splunk query: `index=wineventlog EventCode=4769 TicketEncryptionType=0x17 | stats count by TargetUserName`
- Alert: "Kerberoasting pattern — multiple RC4 TGS requests from single source"

### Phase 3 — Lateral movement
MITRE: T1550.002 (Pass the Hash), T1021.002 (Remote Services — SMB/Windows Admin Shares)

With svc_backup credentials:
- Verify access to FS01 (svc_backup has rights to file server)
- Check if svc_backup has local admin on any workstations
- Use CrackMapExec to spray credentials across all hosts

Tool hints:
- L1: "You have new credentials. Before using them interactively, you should verify what access they grant across the network — quietly, one check at a time."
- L2: "There's a tool designed for network-wide credential testing that can simultaneously verify SMB access across many hosts and show you which ones allow admin access."
- L3: "Run `crackmapexec smb 172.20.2.0/24 -u svc_backup -p Backup2023 --shares` — hosts showing (Pwn3d!) indicate local admin access."

### Phase 4 — Privilege escalation to Domain Admin
MITRE: T1003.006 (DCSync), T1558.001 (Golden Ticket)

Via unconstrained delegation on FS01:
1. Access FS01 as svc_backup (local admin)
2. Run Rubeus to monitor for TGTs hitting FS01 (wait for DA to connect)
3. Extract DA TGT from memory
4. Use DA TGT for DCSync: dump all NTLM hashes from NTDS.dit

Alternative path via WS02 credential reuse:
1. CrackMapExec confirms svc_backup has local admin on WS02
2. Dump local SAM: finds local admin hash
3. Local admin hash works on DC (same password — reuse)
4. PTH to DC → DA access

SOC detection (Phase 4):
- Event ID 4624 (Type 3 logon) from svc_backup to FS01
- Event ID 4662 — replication rights exercised (DCSync)
- Alert: "CRITICAL — DCSync detected: replication request from non-DC host"

---

# SC-03 — Phishing Campaign: Orion Logistics

## Client briefing
**Client**: Orion Logistics International
**Type**: Phishing Simulation + Initial Access Assessment
**Goal**: Determine susceptibility of IT helpdesk staff to targeted phishing; demonstrate initial access and post-access enumeration

## ROE
```
1. Phishing targets are SIMULATED employees only — no real email addresses.
2. You must submit your pretext narrative for approval before sending (platform gate).
3. Payload must be a simulated reverse shell — no functional ransomware or destructive code.
4. Credential harvesting pages must use the .novamed.sim domain only.
5. GoPhish campaign must be configured with tracking enabled (for report metrics).
6. Once shell obtained, enumerate host only — no lateral movement in this scenario.
7. Document open-source intelligence sources used in pretext development.
```

## Scenario phases

### Phase 1 — OSINT target research
Objectives:
- Find target employee names (simulated LinkedIn profiles in-platform)
- Identify email format (firstname.lastname@orion-logistics.com)
- Find recent company news to use as pretext (simulated press releases in-platform)
- Identify technologies from job postings (clues about internal stack)

Tools: theHarvester, maltego (educational mode), OSINT framework concepts

Tool hints:
- L1: "Before crafting your email, you need to know who you're targeting and what would make them click. Think about what a legitimate sender from inside their organization would talk about right now."
- L2: "Job postings are often overlooked OSINT sources — they reveal internal tools, security stack, and organizational structure. What technologies does Orion use?"

### Phase 2 — Pretext design (requires platform approval gate)
The student writes a pretext and submits it. Platform evaluates:
- Does it impersonate a plausible sender?
- Does it create appropriate urgency without being obviously suspicious?
- Does it have a clear call to action?

Example strong pretext: "IT Security Team" sending "Required: MFA enrollment by Friday" with a link.
Example weak pretext: "Nigerian prince" — platform rejects, explains why.

### Phase 3 — Payload creation
Simulate a macro-enabled document with a reverse shell:
- Create .docx with embedded macro (VBA) that calls back to attacker IP
- Obfuscation challenge: Defender (simulated) blocks obvious msfvenom payloads
- Student must apply basic obfuscation techniques

Tool hints:
- L1: "Your payload will be scanned by endpoint security before it executes. Think about what makes a payload 'look' malicious to a signature scanner — and what techniques attackers use to evade that detection."
- L2: "Encoding and obfuscation change the payload's byte pattern without changing its behavior. msfvenom has built-in encoders, but more sophisticated obfuscation can be done at the VBA level."

### Phase 4 — Campaign delivery and results
- Configure GoPhish with tracking pixels and link tracking
- Send to 3 simulated employees
- Platform simulates click-through rates based on pretext quality score
- One employee 'clicks' and executes the payload → callback received

SOC detection:
- Email gateway (Proofpoint sim): flags suspicious sender domain (typosquat)
- Alert: "External email with macro-enabled attachment — sender: it-security@orion-1ogistics.com (lookalike)"
- User reports email as phishing → IR ticket created
- SOC must: analyze headers, extract IOCs, determine if anyone clicked, block sender domain
