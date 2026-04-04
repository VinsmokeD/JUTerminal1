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

---

# SC-04 — Cloud Misconfiguration: StratoStack AWS

## Client briefing
**Client**: StratoStack SaaS
**Type**: Cloud Security Assessment — AWS
**Starting position**: Anonymous (no credentials provided)
**Goal**: Gain administrative access to AWS environment via discovered misconfigurations

## ROE
```
1. Environment is LocalStack simulation — no real AWS resources.
2. Do not delete S3 buckets or IAM users — document access only.
3. Every AWS API call must be logged in your notes with the purpose.
4. Privilege escalation path must be fully documented for the report.
5. Stop condition: When you have AdministratorAccess, document and stop.
6. Out of scope: Billing console, Organization settings.
```

## Scenario phases

### Phase 1 — Public S3 bucket enumeration
Start with no credentials. Enumerate S3 buckets via permutations:
- Common patterns: company-name-backup, company-name-dev, company-name-logs
- Use s3scanner or manual AWS CLI --no-sign-request

Discovery: `stratostack-dev-assets` bucket is public. Contains:
- `deploy-config.json` → AWS access key + secret (hardcoded by developer)
- Source code artifacts (hint at application structure)
- `.env.backup` → database credentials (bonus finding)

Tool hints:
- L1: "S3 bucket names are global and often predictable. Companies frequently use their name combined with common suffixes. There are tools designed to test many permutations quickly."
- L2: "Once you find a bucket, examine every file — configuration files and backup files are the highest value. What file extensions suggest credentials or configuration?"

### Phase 2 — SSRF exploitation → EC2 metadata
The application at app.stratostack.local has an SSRF vulnerability in a URL fetch feature.
Attack: submit `http://169.254.169.254/latest/meta-data/iam/security-credentials/` as the URL.
Returns: temporary IAM credentials for the EC2 instance profile.

SOC (CloudTrail) detection: IMDSv2 bypass attempt, unusual GetCallerIdentity call

### Phase 3 — IAM privilege escalation
With EC2 instance role credentials:
1. Enumerate permissions: `aws iam get-policy`, `aws iam list-attached-user-policies`
2. Find: role has `iam:PassRole` and `lambda:CreateFunction` + `lambda:InvokeFunction`
3. Create Lambda function with AdministratorAccess role → invoke → creates backdoor IAM user

Tool hints:
- L1: "You have AWS credentials. Before using them to do anything, you need to understand what they're allowed to do. What's the least noisy API call that tells you your current identity and permissions?"
- L2: "There's a tool called Pacu designed specifically for AWS post-exploitation — it has modules for privilege escalation path discovery. But first understand what you're looking for conceptually: what combination of IAM permissions allows you to escalate?"

---

# SC-05 — Ransomware IR: Veridian Manufacturing

## Client briefing
**Type**: Incident Response Exercise
**Situation**: You are the on-call SOC analyst. 14:32 — a user calls: "My files have weird extensions and there's a note on my desktop."
**Red team**: Simulated ransomware actor with existing access (Cobalt Strike beacon running on VERIDIAN-WS04)
**Blue team goal**: Detect, contain, eradicate, recover, and report within 4 hours

## ROE (Red Team)
```
1. You start with an active beacon on VERIDIAN-WS04 (172.20.5.30).
2. Follow LockBit 3.0 TTPs documented in the scenario brief.
3. No real encryption. Simulate via: rename files to .locked, write ransom note.
4. Exfiltration simulated: copy files to C2 staging directory (not outside sandbox).
5. Lateral movement: SMB to FS01 only. DC is in scope for enumeration, not encryption.
6. Stop condition: When SOC isolates VERIDIAN-WS04, stop all red activity.
```

## ROE (Blue Team)
```
1. You have: Splunk (pre-indexed logs), Velociraptor (DFIR), firewall console.
2. You may isolate any host at any time — but document your decision rationale.
3. Do NOT wipe and reimage until eradication is confirmed (evidence preservation).
4. Communicate all actions in the IR notebook as if reporting to CISO in real time.
5. RCA must identify: initial vector, how long attacker was present, what data was at risk.
```

## Red team kill chain (LockBit 3.0-inspired TTPs)

Step 1 — Defense evasion:
- Disable Windows Defender (simulated): `Set-MpPreference -DisableRealTimeMonitoring $true`
- Clear event logs: `wevtutil cl System; wevtutil cl Security; wevtutil cl Application`
- MITRE: T1562.001, T1070.001

Step 2 — Credential access:
- Dump LSASS via Task Manager technique (simulated): extracts 3 hashes
- MITRE: T1003.001

Step 3 — Lateral movement:
- PTH to FS01: access file share
- MITRE: T1550.002, T1021.002

Step 4 — Data staging:
- Compress sensitive files on FS01 into archive
- Stage to C2 directory (simulated exfil)
- MITRE: T1560, T1074

Step 5 — Simulated encryption:
- Rename files in /Users/ and /Shares/ to .locked
- Drop ransom note: HOW_TO_RECOVER.txt
- MITRE: T1486

## Blue team IR playbook (NIST 800-61)

### Preparation (pre-scenario)
- Splunk dashboards configured
- Velociraptor agents deployed on all hosts
- IR runbook printed (in-platform reference)
- Communication templates ready

### Detection & Analysis
1. Receive user report → open IR ticket
2. Correlate Splunk alerts:
   - Event 4688: unusual process creation (cmd, powershell from user context)
   - Event 1102: audit log cleared (critical indicator)
   - Sysmon Event 10: LSASS access
   - Network: unusual SMB traffic to FS01
3. Run Velociraptor hunt: `Windows.System.Pslist` on VERIDIAN-WS04
4. Identify beacon process (malicious svchost.exe or similar)
5. Capture memory image before isolation

Critical decision point: "Do we isolate now or monitor to understand full scope?"
Platform presents this as an interactive decision with consequences either way.

### Containment
1. Isolate VERIDIAN-WS04 (firewall rule: block all traffic except forensic channel)
2. Block C2 IP at perimeter
3. Force password reset for any accounts seen in LSASS dump
4. Disable compromised service accounts

### Eradication
1. Velociraptor: hunt for persistence (registry run keys, scheduled tasks, services)
2. Remove beacon binary
3. Verify no other hosts compromised (lateral movement check)
4. Patch initial vector (if identified)

### Recovery
1. Restore .locked files from backup
2. Verify backup integrity
3. Re-enable hosts in clean state
4. Monitor for reinfection 48h

### Post-incident report (required for full score)
Required sections:
- Executive summary (1 page, non-technical)
- Timeline of events (attacker activity + defender response)
- IOCs: IP addresses, file hashes, process names, registry keys
- Root cause analysis: how did attacker get in? how long were they present?
- Lessons learned: what detection rules would catch this earlier?
- Recommendations: 3 specific, prioritized, implementable controls

## SOC scoring — SC-05
- Detected beacon via Splunk within 30 min of start: +20
- Captured memory before isolation: +15
- Correctly identified all 4 persistence mechanisms: +20
- Contained within 90 min: +15
- IR report includes correct IOCs (all 5): +20
- RCA identifies correct initial vector: +10
- Total possible: 100
