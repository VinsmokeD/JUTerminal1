# SC-02: Nexora Financial Active Directory Compromise Incident Response Playbook

## Executive Summary

This playbook addresses incident response for Active Directory attacks targeting the Nexora Financial domain. Attacks include reconnaissance, Kerberoasting, lateral movement, and DCSync attacks to achieve Domain Admin privilege escalation. This guide follows the **NIST SP 800-61 Computer Security Incident Handling Guide** framework and **MITRE ATT&CK** AD-specific techniques.

---

## 1. Detection

### 1.1 SIEM Detection Queries

#### Kerberos Reconnaissance (Kerberoasting Setup)
```sql
severity IN ("MED", "HIGH") AND (id IN ("bloodhound_spn_enum", "getuserspns_scan", "kerberoasting_tgs_request"))
Event ID 4768: Kerberos Authentication Service (AS-REQ)
Event ID 4769: Kerberos Service Ticket (TGS-REQ) with Encryption=RC4-HMAC

Query Pattern:
  event_id = 4769 AND encryption_type = "RC4-HMAC (0x17)" AND service_account IN ("svc_backup", "svc_sqlserver", "svc_*")
```

**Alert Thresholds:**
- Single TGS-REQ for service account with RC4 → Investigate
- 5+ TGS-REQ for SAME service account in 5 minutes → CRITICAL (hash cracking in progress)
- Multiple unique service account TGS-REQ in 1 minute → Kerberoasting sweep

#### Lateral Movement Detection (4624/4648/4625 chains)
```sql
severity IN ("HIGH", "CRITICAL") AND (id IN ("lateral_movement_share_access", "lateral_movement_pass_the_hash", "logon_explicit_credentials", "smb_connection_admin_shares"))
Event ID 4624: Successful Logon (Logon Type 3 = Network)
Event ID 4625: Failed Logon (multiple attempts = brute force)
Event ID 4648: Explicit Logon (RunAs, runas /netonly)

Lateral Movement Chain Pattern:
  4625 (failed login jsmith) → 4625 (20x from same IP) → 4624 (success svc_backup) → 5143 (share access Finance)
```

**Alert Thresholds:**
- 5+ Event ID 4625 from single IP in 2 minutes → Brute-force attempt
- 4624 (Network logon) followed by 5143 (Share access) → Suspicious lateral movement
- Event ID 4648 (Explicit credentials) from unusual user/time → Investigate

#### DCSync Attack Detection (Directory Service Replication)
```sql
severity = "CRITICAL" AND (id IN ("dcsync_replication_request", "dcsync_domain_admin_activity"))
Event ID 4662: Directory Service Access
  Operation = "GetNCChanges"
  Source = non-DC host
  Result = Success (!!!)

Event ID 4624: Successful Logon
  Account = "administrator" OR "Domain Admins"
  Source IP = Attacker IP
  Logon Type 3 = Network
```

**Alert Thresholds:**
- Event ID 4662 (GetNCChanges) from non-DC → CRITICAL + Immediate Incident
- Multiple GetNCChanges from same IP → DCSync active

#### Privilege Escalation Patterns
```sql
severity = "HIGH" AND (id IN ("privilege_use_backup_operator", "privilege_use_debug", "group_member_added", "builtin_group_modified"))
Event ID 4672: Special Privileges Assigned (SeBackupPrivilege, SeDebugPrivilege)
Event ID 4756: Global Group Member Added (Domain Admins)
Event ID 4737: Domain Group Modified

Query Pattern:
  event_id IN (4672, 4756, 4737) AND source_account NOT IN (approved_admins_list)
```

### 1.2 Early Warning Signs

| Indicator | Severity | Action |
|-----------|----------|--------|
| **nmap_syn_sweep** (port scan 88, 389, 445, 3268) | MED | Document IP, check for AD enumeration |
| **enum4linux_user_enum** | MED | Check for null session binding (Event ID 4662) |
| **bloodhound_acl_query** or **bloodhound_spn_enum** | MED | ACL attack reconnaissance, Kerberoasting prep |
| **crackmapexec_brute_force** (4625 x50 in 1m) | HIGH | Active brute-force, enable account lockout alerts |
| **kerberoasting_tgs_request** x5+ | HIGH | Hash extraction in progress |
| **dcsync_replication_request** | CRITICAL | Immediate isolation + forensics |
| **group_member_added to Domain Admins** | CRITICAL | IMMEDIATE: Revoke privilege, force reset |

---

## 2. Analysis Phase

### 2.1 Investigation Checklist

#### Step 1: Confirm Scope of Compromise
1. **Identify all affected accounts**:
   ```
   Q1: Which user account was initially compromised?
       → Look for source IP + first successful 4624
       
   Q2: Which service accounts were targeted?
       → svc_backup? svc_sqlserver? svc_exchange?
       
   Q3: Did attacker achieve Domain Admin?
       → Check Event ID 4624 with account=administrator
       → Check Event ID 4756 (Domain Admins group modification)
   ```

2. **Timeline attack progression**:
   ```
   Phase 1 (Recon):      Nmap + Enum4linux
   Phase 2 (Discovery):  BloodHound queries (4662)
   Phase 3 (Targeting):  Kerberoasting (4769 RC4)
   Phase 4 (Cracking):   Offline hash cracking (no events)
   Phase 5 (Lateral):    4625 brute-force → 4624 success
   Phase 6 (Privilege):  4756 Domain Admins membership
   Phase 7 (Persistence): DCSync (4662 GetNCChanges)
   ```

3. **Identify attack window**:
   ```
   Start Time: First reconnaissance event (nmap, enum4linux)
   Peak Time: Kerberoasting or brute-force activity
   End Time: Last lateral movement or DCSync attempt
   Duration: [X hours/days]
   ```

#### Step 2: Extract IOCs (Indicators of Compromise)
```
Attacker IP:              {src_ip} from 4625/4624 chains
Targeted Accounts:        svc_backup, jsmith, administrator
Kerberoasted Services:    CIFS/NEXORA-FS01.nexora.local
Lateral Movement:         Finance share (\\NEXORA-FS01\Finance)
Compromised Credentials:  jsmith (password), svc_backup (TGT)
Domain Admin Access:      administrator account
Attack Tools:             crackmapexec, GetUserSPNs.py, Impacket
Timestamps:               Event ID times (4625, 4624, 4769, 4662)
```

#### Step 3: Query Active Directory for Abuse Indicators
```bash
# List all recent password changes (potential persistence)
Get-ADUser -Filter * -Properties PasswordLastSet | Where {$_.PasswordLastSet -gt (Get-Date).AddDays(-1)} | Select Name, PasswordLastSet

# Find suspicious group memberships (Domain Admins additions)
Get-ADGroupMember -Identity "Domain Admins" | Select Name, Enabled, lastLogonTimestamp

# Check for suspicious SPN (Service Principal Names)
Get-ADUser -Filter "servicePrincipalName -like '*'" -Properties servicePrincipalName | Select Name, servicePrincipalName

# Find accounts with high privileges (Backup Operators, Account Operators)
Get-ADGroupMember -Identity "Backup Operators"
Get-ADGroupMember -Identity "Account Operators"
```

#### Step 4: Trace Attack Path Using Event Logs
```
Query 1: First reconnaissance activity
  Event ID: 4662, 4625
  Time Range: [Attack window start]
  Filter: Source IP = {src_ip}
  
Query 2: Kerberoasting attempt
  Event ID: 4769
  Filter: Encryption=RC4, Service=CIFS/*, Source IP = {src_ip}
  
Query 3: Lateral movement chain
  Event ID Sequence: 4625 (fail) → 4625 (fail x50) → 4624 (success)
  Filter: Destination = NEXORA-DC or NEXORA-FS01
  
Query 4: Domain Admin compromise
  Event ID: 4756 (group membership change)
  Filter: Group=Domain Admins, Modified=Last 24 hours
  
Query 5: DCSync activity
  Event ID: 4662
  Filter: Operation=GetNCChanges, Source NOT NEXORA-DC
```

### 2.2 Sample Kerberoasting Analysis
```
Attack Progression:
1. Attacker runs: GetUserSPNs.py -request -dc-ip 172.20.2.20 nexora.local/jsmith:password
2. SIEM detects: Event ID 4768 (jsmith TGT issued), 4769 (TGS for svc_backup)
3. Event 4769 shows: Encryption=RC4-HMAC (weak), Service=CIFS/NEXORA-FS01
4. Attacker extracts: TGS hash from network traffic
5. Attacker cracks: Offline with hashcat (no DC event detection)
6. Result: svc_backup credentials compromised

Detection Window: 0-5 minutes (phase 1-3)
Evasion: Offline hash cracking leaves no forensic trail
```

### 2.3 Sample Lateral Movement Analysis
```
Attack Progression:
1. Attacker uses: svc_backup credentials to access Finance share
2. Share path: \\NEXORA-FS01\Finance
3. SIEM detects: Event ID 5143 (Share access), 4624 (Network logon)
4. Behavior: svc_backup normally has CIFS access, but attacker accessing unusual times
5. Data exposed: Finance spreadsheets, salary information, customer data

Timeline:
  14:30 - svc_backup TGS obtained (normal)
  14:31 - 4625 brute-force against jsmith (ABNORMAL)
  14:35 - 4624 successful logon as svc_backup (SUSPICIOUS)
  14:36 - 5143 Finance share access (CONFIRMED compromise)
```

---

## 3. Containment

### 3.1 Immediate Actions (0-15 minutes)

#### 3.1.1 Block Attacker Network Access
```powershell
# Windows Firewall
New-NetFirewallRule -DisplayName "Block-Attacker-IP" `
  -Direction Inbound -Action Block `
  -RemoteAddress {src_ip}

# Samba/SMB firewall
smbcontrol all reload-config

# Verify block
Test-NetConnection -ComputerName NEXORA-DC -Port 445 -SourceAddress {src_ip}
```

#### 3.1.2 Disable Compromised Service Accounts
```powershell
# Disable svc_backup account
Disable-ADAccount -Identity "svc_backup"

# Disable jsmith account (if brute-forced)
Disable-ADAccount -Identity "jsmith"

# Verify
Get-ADUser "svc_backup" -Properties Enabled | Select Enabled
```

#### 3.1.3 Reset Administrator Password (Immediate)
```powershell
# Force reset administrator account
$NewPassword = ConvertTo-SecureString "NewAdminPassword2024!Complex" -AsPlainText -Force
Set-ADAccountPassword -Identity "administrator" -NewPassword $NewPassword -Reset

# Force user to change on next logon
Set-ADUser -Identity "administrator" -ChangePasswordAtLogon $true

# Log out all administrator sessions
logoff /v {administrator_session_id}
```

#### 3.1.4 Revoke Compromised Kerberos Tickets
```powershell
# Flush Kerberos ticket cache (DC-level)
# Note: No direct PowerShell cmdlet; use klist.exe on affected systems
klist purge

# On Domain Controller, reset Krbtgt password
# WARNING: This requires careful coordination to avoid service disruption
Set-ADAccountPassword -Identity "krbtgt" -NewPassword (ConvertTo-SecureString "NewKrbtgtPassword2024!" -AsPlainText -Force) -Reset

# Reset must be done TWICE to invalidate old tickets
# 1st reset: Current master key
# 2nd reset (10+ minutes later): Previous master key
```

### 3.2 Mid-Containment (15-60 minutes)

#### 3.2.1 Scope Lateral Movement Damage
```powershell
# Identify which systems compromised account accessed
$Events = Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4624
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[5].Value -eq "svc_backup"}

# Export accessed computers
$Events | Select-Object @{N='Computer';E={$_.MachineName}}, TimeCreated | Export-Csv compromised_systems.csv

# Check share access logs
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 5140  # Share access
} | Where {$_.Properties[3].Value -eq "Finance"} | Select TimeCreated, @{N='User';E={$_.Properties[1].Value}}
```

#### 3.2.2 Revoke All Sessions for Compromised Users
```powershell
# Kill all SMB sessions (disconnects file shares)
Get-SMBSession | Where {$_.ClientUserName -like "*svc_backup*" -or $_.ClientComputerName -eq "{src_ip}"} | Close-SMBSession -Force

# Reset RDP sessions
quser  # List all RDP sessions
logoff [sessionid]  # Kill specific session

# Force logoff via Group Policy
gpupdate /force  # Reapply password policy, force client re-auth
```

#### 3.2.3 Check for DC-Sync Persistence
```powershell
# Query DCSync attempts (Event ID 4662, Operation=GetNCChanges)
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4662
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[4].Value -like "*GetNCChanges*"} | Select TimeCreated, @{N='Source';E={$_.Properties[0].Value}}

# If DCSync successful: Check if attacker has ntds.dit copy
# Search endpoint logs for NTDS.DIT file access
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4656  # File object access request
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[6].Value -like "*NTDS.DIT*"}
```

#### 3.2.4 Validate Domain Controller Health
```powershell
# Check Kerberos distribution
dcdiag /test:Kerberos /verbose

# Check replication
Get-ADReplicationFailure

# Check time sync (critical for Kerberos)
w32tm /query /status
w32tm /resync

# Check for suspicious processes
tasklist | findstr /i "mimikatz hashcat impacket"
```

---

## 4. Eradication

### 4.1 Credential & Access Remediation

#### 4.1.1 Reset All Domain Admin Passwords
```powershell
# Get all Domain Admins
$DomainAdmins = Get-ADGroupMember -Identity "Domain Admins" | Select -ExpandProperty Name

# Reset each account
foreach ($Admin in $DomainAdmins) {
  $NewPass = ConvertTo-SecureString "NewPassword123!@#$%^&*()" -AsPlainText -Force
  Set-ADAccountPassword -Identity $Admin -NewPassword $NewPass -Reset
  Set-ADUser -Identity $Admin -ChangePasswordAtLogon $true
  Write-Host "Reset: $Admin"
}
```

#### 4.1.2 Reset Service Account Passwords
```powershell
# Affected service accounts
$ServiceAccounts = @("svc_backup", "svc_sqlserver", "svc_exchange")

foreach ($Account in $ServiceAccounts) {
  $NewPass = ConvertTo-SecureString "NewServicePassword123!@#$" -AsPlainText -Force
  Set-ADAccountPassword -Identity $Account -NewPassword $NewPass -Reset
  
  # Update application service bindings
  # (Would trigger system restart in production)
  Write-Host "Remember to update service password in: IIS, SQL Server, Exchange"
}
```

#### 4.1.3 Force Full Domain Password Reset
```powershell
# Create Group Policy to force password change on next logon
New-GPO -Name "Force-Password-Reset-SC02" -Comment "Emergency password reset post-incident"
Set-GPRegistryValue -Name "Force-Password-Reset-SC02" `
  -Key "HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\System" `
  -ValueName "PromptForPasswordAfterReset" `
  -Value 1 -Type DWORD

# Link to Domain
Link-GPO -Name "Force-Password-Reset-SC02" -Target "DC=nexora,DC=local"

# Verify application
gpupdate /force
```

#### 4.1.4 Audit and Remove Unauthorized Group Memberships
```powershell
# Export current Domain Admins
Get-ADGroupMember -Identity "Domain Admins" | Export-Csv before_incident.csv

# Remove any unauthorized members added during incident
# (Compare with pre-incident baseline)
$UnauthorizedMember = "compromised_account"
Remove-ADGroupMember -Identity "Domain Admins" -Members $UnauthorizedMember -Confirm:$false

# Verify removal
Get-ADGroupMember -Identity "Domain Admins"
```

### 4.2 Clean Up Kerberos Infrastructure

#### 4.2.1 Reset Krbtgt Password (TWICE)
```powershell
# CRITICAL: This invalidates ALL Kerberos tickets domain-wide
# Ensure change management approval before executing

# Step 1: First reset
$KrbtgtAccount = Get-ADUser -Identity "krbtgt"
$NewPassword = ConvertTo-SecureString "KrbtgtNewPassword123!@#$" -AsPlainText -Force
Set-ADAccountPassword -Identity "krbtgt" -NewPassword $NewPassword -Reset

# Wait 10+ minutes for AD replication
Start-Sleep -Seconds 600

# Step 2: Second reset (invalidates previous master key)
$NewPassword2 = ConvertTo-SecureString "KrbtgtNewPassword456!@#$" -AsPlainText -Force
Set-ADAccountPassword -Identity "krbtgt" -NewPassword $NewPassword2 -Reset

# Force replication
repadmin /syncall /d /p
```

#### 4.2.2 Check for Forged Kerberos Tickets
```powershell
# Golden Ticket detection: Look for TGTs issued to non-standard users
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4768  # TGT issued
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[0].Value -notlike "*$"} | Select TimeCreated, @{N='Account';E={$_.Properties[0].Value}}

# Check TGS requests from suspicious accounts
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4769  # TGS issued
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[2].Value -match "unusual_pattern"} | Select TimeCreated
```

### 4.3 Check for Persistence Mechanisms

#### 4.3.1 Search for Backdoor Accounts
```powershell
# Find recently created accounts
Get-ADUser -Filter * -Properties whenCreated | 
  Where {$_.whenCreated -gt (Get-Date).AddDays(-1)} | 
  Select Name, whenCreated, Enabled

# Remove suspicious accounts
Remove-ADUser -Identity "backdoor_account" -Confirm:$false
```

#### 4.3.2 Check for Malicious DLL Injection (LSASS Memory)
```powershell
# Windows Defender offline scan
# Boot into Safe Mode and run: mpcmdrun.exe -scan -scantype 3

# Look for suspicious LSASS process access
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4690  # Process handle closed
  StartTime = (Get-Date).AddHours(-24)
} | Where {$_.Properties[0].Value -like "*lsass*"} | Select TimeCreated
```

---

## 5. Recovery

### 5.1 Validate Active Directory Integrity

```powershell
# Run full domain diagnostics
dcdiag /verbose /a

# Check all domain controllers
repadmin /replsummary

# Verify FsmoCheck
netdom query fsmo
```

### 5.2 Restore Domain Services

```powershell
# Restart Domain Controller (after validation)
Restart-Computer -ComputerName NEXORA-DC -Force

# Wait for reboot and service startup (~2 minutes)
Start-Sleep -Seconds 120

# Verify Kerberos, LDAP, DNS services
Get-Service -Name kdc, ldap, dns | Select Name, Status
```

### 5.3 Force Full AD Replication

```powershell
# Replicate all changes to other DCs
repadmin /syncall /d /p /e

# Verify replication status
repadmin /replsummary

# Check DNS zone transfer
nslookup nexora.local
```

### 5.4 Re-enable Service Accounts (Post-Verification)

```powershell
# After confirming clean state, re-enable service accounts
Enable-ADAccount -Identity "svc_backup"
Enable-ADAccount -Identity "jsmith"

# Verify
Get-ADUser "svc_backup" -Properties Enabled | Select Enabled
```

---

## 6. Post-Incident Activities

### 6.1 Root Cause Analysis

#### Questions for RCA
1. **Why was Kerberoasting successful?**
   - Service account with weak encryption (RC4-HMAC)
   - No RC4 policy enforcement
   - No hash cracking detection

2. **Why was lateral movement undetected?**
   - No baseline for service account behavior
   - Alert fatigue from normal 4624/4625 events
   - No SIEM correlation rules

3. **Why did DCSync succeed?**
   - High privilege account compromised
   - No monitoring of GetNCChanges operations
   - No endpoint protection on DC

#### Action Items
```
[ ] Enforce AES encryption for all Kerberos tickets (disable RC4)
[ ] Implement tiered AD administration (Tier 0/1/2 model)
[ ] Deploy endpoint detection on DC (Sysmon, Windows Defender)
[ ] Create SIEM correlation rule: 4625 (50+ fails) → 4624 (success) = CRITICAL
[ ] Implement MFA for Domain Admin accounts
[ ] Schedule quarterly AD security audits
[ ] Implement AD recycle bin + replication monitoring
[ ] Enforce password policy: 20+ chars, complexity=high, history=24
```

### 6.2 Documentation & Knowledge Base

```markdown
## Incident Summary
- **Date**: 2026-04-10
- **Severity**: CRITICAL
- **Attack Vector**: Kerberoasting → Lateral Movement → DCSync
- **Duration**: 4 hours (detection to containment)
- **Accounts Compromised**: jsmith, svc_backup, administrator
- **Data Exposed**: Finance share, salary data, customer records

## Prevention Improvements
1. RC4 disablement policy implemented
2. AD tiered administration enforced
3. SIEM DC monitoring deployed
4. Krbtgt reset process documented

## Lessons Learned
- Kerberoasting often goes undetected (offline cracking)
- Service account passwords should rotate annually
- Domain Admin should have separate MFA-protected account
- Event log forwarding to SIEM is critical
```

### 6.3 Incident Metrics

```
Key Metrics:
- Time to Detect: 15 minutes (kerberoasting alert)
- Time to Respond: 8 minutes (isolation + password reset)
- Time to Recover: 45 minutes (service restart + validation)
- Total Time: 68 minutes (below 2-hour SLA)

Success Indicators:
- All compromised accounts reset
- Kerberos infrastructure cleaned (Krbtgt reset)
- DCSync confirmed unsuccessful
- No persistent backdoor found
- Services restored to normal operation
```

---

## 7. References & Detection Rules

| Item | Link | Use |
|------|------|-----|
| NIST 800-61 | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf | Incident Handling |
| MITRE ATT&CK AD | https://attack.mitre.org/tactics/TA0006/ | Privilege Escalation |
| Kerberoasting | https://attack.mitre.org/techniques/T1558/003/ | TGS Hash Attack |
| DCSync | https://attack.mitre.org/techniques/T1003/006/ | Directory Sync Attack |
| Microsoft Event IDs | https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/audit-account-management | AD Audit Events |

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-13  
**Next Review:** 2026-05-13  
**Approved By:** Security Team Lead
