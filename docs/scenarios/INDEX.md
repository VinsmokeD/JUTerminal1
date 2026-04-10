# Scenario Index

Complete guide to all five CyberSim training scenarios. Each scenario teaches specific cybersecurity skills through realistic, hands-on attack and defense exercises.

---

## Overview Table

| ID | Name | Focus | Difficulty | Duration | Students | Educators |
|----|------|-------|-----------|----------|----------|-----------|
| **SC-01** | NovaMed Healthcare | Web App Security | Intermediate | 60 min | SQL Injection, LFI, IDOR | Log analysis, anomaly detection |
| **SC-02** | Nexora Financial AD | Active Directory | Advanced | 90 min | Kerberoasting, Lateral Movement | Domain logon analysis |
| **SC-03** | Orion Logistics | Phishing & OSINT | Intermediate | 75 min | Social Engineering, Initial Access | Email headers, threat intel |
| **SC-04** | StratoStack Cloud | Cloud Security | Advanced | 120 min | S3 misconfiguration, IAM | CloudTrail events, forensics |
| **SC-05** | Veridian Ransomware | Incident Response | Advanced | 180 min | Full Attack Chain, IR | SIEM analysis, containment |

---

## SC-01: NovaMed Healthcare Portal

**Difficulty**: Intermediate  
**Recommended for**: Beginners with basic command-line skills  
**Duration**: 60 minutes  
**Status**: ✅ Fully Implemented

### Overview

NovaMed is a healthcare portal with a vulnerable web application. Students practice common web vulnerabilities while educators monitor attack patterns for detection opportunities.

### Attack Path

```
Reconnaissance → SQL Injection → Data Exfiltration → Privilege Escalation
    ↓               ↓                  ↓                    ↓
Port scan    Extract user data   Export DB        Accessing admin panel
Enum paths   Bypass auth         Patient records  Full system control
```

### Red Team (Student Attacker)

**Objectives**:
1. Identify web application technologies (Fingerprinting)
2. Discover SQL injection vulnerability in login form
3. Bypass authentication to access patient database
4. Extract sensitive patient information
5. Escalate privileges to administrator account
6. Document findings and attack timeline

**Tools Typically Used**:
- `nmap` — Port scanning and service discovery
- `gobuster` — Directory enumeration
- `sqlmap` — SQL injection automation
- `burp suite` / `curl` — HTTP request manipulation
- `hashcat` — Password cracking

**Vulnerabilities**:
- CWE-89: SQL Injection
- CWE-434: Unrestricted File Upload
- CWE-639: IDOR (Insecure Direct Object Reference)
- CWE-613: Insufficient Session Invalidation

### Blue Team (Educator Defender)

**Objectives**:
1. Detect reconnaissance activity (port scans, directory enumeration)
2. Identify SQL injection attempts in Application logs
3. Spot unauthorized database access
4. Alert on file upload anomalies
5. Investigate privilege escalation patterns
6. Create incident report

**SIEM Events**:
- Port scan attempts
- 404 Not Found flooding (directory brute force)
- SQL syntax errors in logs
- Unusual database queries
- File upload activity
- Failed login spikes

### Learning Outcomes

- SQL injection vulnerability types and exploitation
- Web application fingerprinting techniques
- Database query manipulation
- Log-based anomaly detection
- Attack timeline reconstruction

### Files

- **Spec**: [SC-01-webapp-pentest.md](SC-01-webapp-pentest.md)
- **Config**: [SC-01-webapp-pentest.yaml](SC-01-webapp-pentest.yaml)
- **SIEM Events**: `backend/src/siem/events/sc01_events.json`
- **Hints**: `backend/src/scenarios/hints/sc01_hints.json`
- **Docker Setup**: `infrastructure/docker/scenarios/sc01/`

### Getting Started

1. Clone the repo
2. Start services: `docker-compose up -d`
3. Login to http://localhost:3000
4. Select "SC-01: NovaMed Healthcare Portal"
5. Choose "Beginner" or "Intermediate" skill level
6. Follow the mission briefing

---

## SC-02: Nexora Financial AD

**Difficulty**: Advanced  
**Recommended for**: Intermediate pentesting skills  
**Duration**: 90 minutes  
**Status**: ✅ Fully Implemented

### Overview

Nexora Financial operates a Windows-based Active Directory infrastructure. Students exploit AD vulnerabilities to escalate from low-privilege domain user to domain administrator while educators detect attack patterns.

### Attack Path

```
AD Enumeration → Kerberoasting → TGT Cracking → Lateral Movement → DCSync
      ↓              ↓                ↓                ↓              ↓
List users    Request TGTs    Crack hashes     PS Remoting    Extract secrets
Find services  Extract hashes  Password spray    Relay attacks   AzureAD sync
```

### Red Team (Student Attacker)

**Objectives**:
1. Enumerate Active Directory structure
2. Identify Kerberoastable accounts
3. Request and crack TGTs
4. Recover valid credentials
5. Perform lateral movement
6. Execute DCSync attack
7. Achieve domain administrator access

**Tools Typically Used**:
- `bloodhound` / `sharphound` — AD visualization
- `impacket` suite — Kerberos utilities
- `crackmapexec` — Credential testing
- `hashcat` — Hash cracking
- `powershell` — Command execution
- `mimikatz` — Credential dumping

**Vulnerabilities**:
- CWE-916: Use of Password Hash With Insufficient Computational Effort
- Kerberos pre-authentication disabled
- Weak password policies
- Overprivileged service accounts
- Unconstrained delegation

### Blue Team (Educator Defender)

**Objectives**:
1. Detect LDAP enumeration queries
2. Alert on TGT requests (Kerberoasting patterns)
3. Identify lateral movement attempts
4. spot credential dumping activity
5. Detect DCSync operations
6. Create incident timeline

**SIEM Events**:
- Logon Type 3 (Network) spikes
- TGT request volume anomalies
- Account lockout patterns
- PowerShell remote execution
- Registry access to SECURITY hive
- DRSUAPI calls (DCSync)

### Learning Outcomes

- Active Directory architecture and trust relationships
- Kerberos protocol and exploitation
- Credential dumping and cracking techniques
- Lateral movement strategies
- Domain controller compromise indicators

### Files

- **Spec**: [SC-02-05-specs.md#sc-02](SC-02-05-specs.md#sc-02)
- **Config**: [SC-02-ad-compromise.yaml](SC-02-ad-compromise.yaml)
- **SIEM Events**: `backend/src/siem/events/sc02_events.json`
- **Hints**: `backend/src/scenarios/hints/sc02_hints.json`
- **Docker Setup**: `infrastructure/docker/scenarios/sc02/`

---

## SC-03: Orion Logistics Phishing

**Difficulty**: Intermediate  
**Recommended for**: Intermediate social engineering interest  
**Duration**: 75 minutes  
**Status**: ✅ Fully Implemented

### Overview

Orion Logistics receives a sophisticated phishing campaign. Students conduct OSINT to identify targets, craft social engineering attacks, and gain initial access while educators detect phishing indicators.

### Attack Path

```
OSINT → Target Identification → Phishing Campaign → Credential Harvesting → Access
   ↓            ↓                      ↓                     ↓             ↓
LinkedIn    Employee research   Email campaign        Fake login page   Mail server
Company blog  Job titles         Attachment delivery   Credential logger Network foothold
```

### Red Team (Student Attacker)

**Objectives**:
1. Conduct OSINT on target company
2. Identify key personnel and roles
3. Create convincing phishing content
4. Set up credential harvesting infrastructure
5. Execute phishing email campaign
6. Capture valid credentials
7. Establish initial system access

**Tools Typically Used**:
- `whois` / `dig` — Domain information
- `shodan` — Public information gathering
- `social-engineer toolkit (SET)` — Phishing framework
- `gophish` / `phishlet` — Phishing infrastructure
- Cloud hosting for phishing site

**Vulnerabilities**:
- CWE-640: Weak Password Recovery Mechanism
- Social engineering susceptibility
- Insufficient email authentication (SPF/DKIM/DMARC)
- Credential reuse across systems

### Blue Team (Educator Defender)

**Objectives**:
1. Detect phishing emails (headers, content)
2. Identify malicious links and file types
3. Track credential theft attempts
4. Monitor email gateway logs
5. Alert on unusual login locations
6. Create phishing incident report

**SIEM Events**:
- Email gateway blocks/actions
- Failed login attempts with new geolocations
- Credential submission patterns  
- Email header anomalies (SPF/DKIM failures)
- Account access from unusual IPs
- Exchange audit logs

### Learning Outcomes

- OSINT techniques and information gathering
- Social engineering psychology
- Phishing campaign mechanics
- Email security headers (SPF, DKIM, DMARC)
- Credential theft detection

### Files

- **Spec**: [SC-02-05-specs.md#sc-03](SC-02-05-specs.md#sc-03)
- **Config**: [SC-03-phishing.yaml](SC-03-phishing.yaml)
- **SIEM Events**: `backend/src/siem/events/sc03_events.json`
- **Hints**: `backend/src/scenarios/hints/sc03_hints.json`
- **Docker Setup**: `infrastructure/docker/scenarios/sc03/`

---

## SC-04: StratoStack Cloud Audit

**Difficulty**: Advanced  
**Recommended for**: Intermediate+ cloud security knowledge  
**Duration**: 120 minutes  
**Status**: ✅ Fully Implemented

### Overview

StratoStack hosts a cloud infrastructure with misconfigured S3 buckets and overprivileged IAM roles. Students perform cloud security assessment, identify privilege escalation paths, and achieve full account compromise while educators analyze CloudTrail events.

### Attack Path

```
Cloud Reconnaissance → S3 Enumeration → Credential Discovery → IAM Privesc → Account Takeover
        ↓                    ↓                    ↓                  ↓                ↓
aws s3 ls        Bucket listing          Environment secrets   Assume admin role  Full control
Service enums     Public objects          CLI credentials       CloudFormation     Data access
```

### Red Team (Student Attacker)

**Objectives**:
1. Enumerate AWS services and resources
2. Identify misconfigured S3 buckets
3. Discover credential material in bucket objects
4. Extract AWS access keys / credentials
5. Enumerate IAM policies
6. Identify privilege escalation paths
7. Assume admin role and compromise account
8. Access confidential data

**Tools Typically Used**:
- `aws cli` — AWS resource enumeration
- `s3scanner` — S3 bucket scanning
- `cloudmapper` — Cloud asset visualization
- `pacu` — AWS exploitation framework
- `awswhoami` / `iamazon` — Credential enumeration

**Vulnerabilities**:
- S3 buckets with public read/write
- Credentials stored in bucket objects or environment
- Overprivileged IAM roles
- Missing bucket encryption
- Unused access keys
- Trust relationships allowing cross-account access

### Blue Team (Educator Defender)

**Objectives**:
1. Detect S3 ListBucket operations
2. Identify unauthorized API calls
3. Alert on access key usage anomalies
4. Detect AssumeRole attacks
5. Monitor CloudTrail for privilege escalation
6. Create forensic timeline

**SIEM Events**:
- S3 ListBucket API calls
- Unauthorized GetObject requests
- IAM policy changes
- AssumeRole calls with anomalous principals
- EC2 RunInstances from unusual accounts
- CloudFormation template deployments

### Learning Outcomes

- AWS architecture and service interactions
- IAM role and policy basics
- S3 security best practices
- Cloud privilege escalation
- CloudTrail audit log analysis

### Files

- **Spec**: [SC-02-05-specs.md#sc-04](SC-02-05-specs.md#sc-04)
- **Docker Setup**: `infrastructure/docker/scenarios/sc04/`

---

## SC-05: Veridian Ransomware IR

**Difficulty**: Advanced (Comprehensive)  
**Recommended for**: Advanced (incident response focus)  
**Duration**: 180 minutes (3 hours)  
**Status**: ✅ Fully Implemented

### Overview

Veridian Manufacturing experiences a ransomware attack. This comprehensive scenario combines multiple attack types and teaches full incident response lifecycle from detection through recovery while educators conduct SOC response operations.

### Attack Path (Full Kill Chain)

```
Initial Access → Persistence → Escalation → Lateral Movement → Exfiltration → Execution
      ↓               ↓             ↓               ↓                ↓             ↓
Phishing email  Scheduled task  UAC bypass       RDP lateral     Dbdump       Encrypt
Drive-by        Scheduled task  Token theft      PowerShell       Staging      Ransom note
                Backdoor        Mimikatz         Replication       Exfil
```

### Red Team (Student Attacker)

**Objectives** (in order):
1. Gain initial access via phishing/drive-by
2. Establish persistence (scheduled task, backdoor)
3. Escalate privileges (UAC bypass, token theft)
4. Move laterally to file servers
5. Discover and exfiltrate sensitive data
6. Deploy ransomware payload
7. Document entire kill chain

**Tools Typically Used**:
- Complete penetration testing toolkit
- Ransomware simulation (does NOT encrypt actual files)
- C2 framework (Merlin, Empire simulation)
- All previous scenarios' tools

### Blue Team (Educator Defender/IR Team)

**Objectives** (in order):
1. **Detection Phase**: Identify attack indicators
2. **Analysis Phase**: Determine scope and impact
3. **Containment Phase**: Stop spread, isolate affected systems
4. **Eradication Phase**: Remove malware and backdoors
5. **Recovery Phase**: Restore systems from backups
6. **Post-Incident**: Document and improve

**SIEM Events** (comprehensive):
- Phishing email delivery
- Suspicious process creation chains
- Unusual network connections
- File encryption patterns
- Registry modifications
- Service installation attempts
- Data staging activity
- RDP lateral movement
- Threat intel alerts

### Learning Outcomes

- Complete cybersecurity kill chain (ATT&CK framework)
- Incident response procedures (NIST 800-61)
- Log correlation and forensics
- Threat intelligence and indicators
- Containment and remediation strategies
- Business impact assessment

### Files

- **Spec**: [SC-02-05-specs.md#sc-05](SC-02-05-specs.md#sc-05)
- **Docker Setup**: `infrastructure/docker/scenarios/sc05/` (includes Splunk SIEM)
- **SIEM Events**: `backend/src/siem/events/sc05_events.json`
- **Hints**: `backend/src/scenarios/hints/sc05_hints.json`

---

## Scenario Progression Recommendation

### For Complete Beginners

```
Start with SC-01 (Web App) → SC-03 (Phishing) → SC-02 (AD) → SC-04 (Cloud) → SC-05 (IR)
```

- SC-01 teaches fundamentals: reconnaissance, exploitation, data exfiltration
- SC-03 adds social engineering and thinking like an attacker
- SC-02 introduces Windows/directory services complexity
- SC-04 brings cloud infrastructure knowledge
- SC-05 ties everything together in comprehensive IR scenario

### For Experienced Pentesters

```
Jump directly to SC-02, SC-04, or SC-05
```

Self-select based on skill area:
- **Active Directory specialist?** → SC-02
- **Cloud infrastructure?** → SC-04
- **Want full challenge?** → SC-05

---

## Common Questions

### Q: How long does a scenario take?
**A**: See the "Duration" column in overview table. Beginners may take 20% longer. Times include reading mission briefing and documenting findings.

### Q: Can multiple students run the same scenario?
**A**: Yes! Each session gets isolated Docker containers. No interference between sessions.

### Q: What if I get stuck?
**A**: Use the hint system (L1→L2→L3). Hints are AI-powered and adapt to your skill level. See the AI tutor panel in-game.

### Q: Are there walkthroughs?
**A**: No intentional walkthroughs, but hints progressively guide you toward solution.

### Q: Can I skip scenarios?
**A**: Yes, but recommended order above provides building-block learning.

### Q: How realistic are the targets?
**A**: Very! Based on real vulnerable applications and actual Active Directory configurations. All contained safely.

---

## Technical Details

### Each Scenario Includes

- **Mission Briefing**: Objectives, narrative, network diagram
- **Target Network**: 1-5 isolated containers per scenario
- **SIEM Events**: 20-50 unique event types mapped to attacker actions
- **Scoring**: Automatic scoring based on discoveries and time
- **Notes**: Phase-based templates for documentation
- **Hints**: 90+ hints across L1/L2/L3 levels
- **Debrief**: Comprehensive report with attack timeline

### Scenario Files

Each scenario `SC-XX` has:

```
docs/scenarios/
├── SC-01-webapp-pentest.md       (full specification)
├── SC-01-webapp-pentest.yaml     (backend config)

backend/src/siem/events/
├── sc01_events.json              (20+ event templates)

backend/src/scenarios/hints/
├── sc01_hints.json               (90+ hints L1-L3)

infrastructure/docker/scenarios/
├── sc01/
│   ├── docker-compose.yml
│   └── Dockerfile.target
```

---

## Contributing New Scenarios

Want to create SC-06 or improve existing scenarios?

1. Read [CONVENTIONS.md](../CONVENTIONS.md) for code standards
2. Follow [Scenario Specification Template](SPECIFICATION_TEMPLATE.md) (coming soon)
3. Create PR with scenario files
4. Request review from maintainers

---

## Support

- **Docs**: Full documentation at [docs/INDEX.md](../INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/cybersim/issues)
- **Questions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/cybersim/discussions)

---

**Status**: All 5 scenarios fully implemented and tested ✅  
**Last Updated**: 2026-04-10  
**Version**: 1.0.0 Release Candidate
