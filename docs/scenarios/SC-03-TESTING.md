# SC-03 Testing & Verification Guide

## Overview
This document provides step-by-step verification procedures for the SC-03 Orion Logistics Phishing infrastructure.

**Completed Components**:
- ✅ GoPhish Campaign Manager (port 3333 admin, 80 phishing)
- ✅ Postfix SMTP Mail Relay (port 25, routing to victim)
- ✅ Victim Endpoint Simulator (SMTP receive + Flask API)
- ✅ SIEM Event Mapping (40+ events, 7 categories)
- ✅ Deterministic victim behavior simulation
- ✅ Network isolation (internal bridge, no internet)

---

## Prerequisites

1. Docker & Docker Compose installed
2. `.env` file with required variables:
   ```bash
   GEMINI_API_KEY=your_key_here
   JWT_SECRET=your_64_hex_chars_here
   ```
3. Network isolation enforced (`internal: true` in compose)
4. Disk space: ~1.5GB for images and containers
5. Patience: Victim simulation has realistic time delays (2-5 minutes for email open)

---

## Test Phase 1: Infrastructure Launch

### 1.1 Start SC-03 Services
```bash
cd /path/to/JUTerminal1
docker-compose --profile sc03 up -d
```

**Expected Output**:
```
Creating network sc03-net
Building sc03-phish
Building sc03-mailrelay
Building sc03-victim
Starting sc03-mailrelay  ... done
Starting sc03-phish      ... done
Starting sc03-victim     ... done
```

### 1.2 Verify Container Status
```bash
docker-compose ps --profile sc03
```

**Expected Output**:
```
NAME              STATUS            PORTS
sc03-phish        Up (healthy)      80/tcp, 443/tcp, 3333/tcp
sc03-mailrelay    Up (healthy)      25/tcp
sc03-victim       Up (healthy)      25/tcp, 8080/tcp
```

### 1.3 Verify Network Configuration
```bash
docker network inspect sc03-net
```

**Expected Output**:
```
"Internal": true,
"IPAM": {
    "Config": [
        {
            "Subnet": "172.20.3.0/24"
        }
    ]
},
"Containers": {
    "<phish-id>": {
        "IPv4Address": "172.20.3.10/24"
    },
    "<relay-id>": {
        "IPv4Address": "172.20.3.20/24"
    },
    "<victim-id>": {
        "IPv4Address": "172.20.3.30/24"
    }
}
```

---

## Test Phase 2: GoPhish Service Validation

### 2.1 Verify Admin Panel Accessibility
```bash
curl -I http://127.0.0.1:3333
```

**Expected Output**:
```
HTTP/1.1 302 Found
Location: /login
```

### 2.2 Check GoPhish Logs
```bash
docker logs sc03-phish | tail -20
```

**Expected Output** (sample):
```
[*] GoPhish started (PID: 1234)
[+] GoPhish admin API is ready
[+] Admin panel available at: http://172.20.3.10:3333/
[+] Phishing pages served at: http://172.20.3.10/
[+] SMTP relay available at: 172.20.3.20:25
```

### 2.3 Access Admin Panel (Browser)
Navigate to: `http://localhost:3333`

**Expected**: Login page with "GoPhish" branding

---

## Test Phase 3: Mail Relay Validation

### 3.1 Verify SMTP Port Availability
```bash
docker exec sc03-mailrelay nc -zv 127.0.0.1 25
```

**Expected Output**:
```
Connection to 127.0.0.1 25 port [tcp/smtp] succeeded!
```

### 3.2 Test SMTP Connection
```bash
docker exec sc03-phish curl -v smtp://172.20.3.20:25
```

**Expected Output**:
```
< 220 mail.orion-logistics.sim ESMTP Postfix
> EHLO
< 250-mail.orion-logistics.sim
< 250-SIZE 51200000
< 250-VRFY
< 250 HELP
```

### 3.3 Check Virtual Alias Maps
```bash
docker exec sc03-mailrelay cat /etc/postfix/virtual
```

**Expected Output**:
```
info@orion-logistics.sim           victim@172.20.3.30
support@orion-logistics.sim        victim@172.20.3.30
helpdesk@orion-logistics.sim       victim@172.20.3.30
it-security@orion-logistics.sim    victim@172.20.3.30
...
```

### 3.4 Monitor Mail Logs
```bash
docker logs -f sc03-mailrelay
```

---

## Test Phase 4: Victim Simulator Validation

### 4.1 Verify Flask API Health
```bash
curl http://127.0.0.1:8080/health
```

**Expected Output**:
```json
{
  "status": "healthy",
  "victim_simulator": "ready"
}
```

### 4.2 Check Victim Simulator Logs
```bash
docker logs sc03-victim | tail -20
```

**Expected Output** (sample):
```
[*] Victim Endpoint Simulator Initialization
[+] Initializing Postfix...
[+] SMTP service ready
[+] Starting victim simulation service (port 8080)...
[+] Victim Endpoint Ready
[+] Services:
    - SMTP (receive): 172.20.3.30:25
    - Simulation API: 172.20.3.30:8080
```

### 4.3 Query Campaign Status (empty initially)
```bash
curl http://127.0.0.1:8080/api/campaigns | jq
```

**Expected Output**:
```json
{
  "total_emails_received": 0,
  "campaigns_tracked": {},
  "callbacks_received": 0,
  "emails": []
}
```

---

## Test Phase 5: End-to-End Campaign Simulation

### 5.1 Create GoPhish Campaign (Manual)
This requires using the GoPhish web interface at `http://localhost:3333`

Steps:
1. Login (default: admin/default)
2. **Sending Profiles** → New profile:
   - Name: "Orion Relay"
   - Host: `172.20.3.20:25`
   - Save
3. **Landing Pages** → New page:
   - Name: "Orion MFA"
   - Import site: `https://outlook.office365.com`
   - Save
4. **Users & Groups** → Import:
   - Add target: `helpdesk@orion-logistics.sim`
5. **Campaigns** → New campaign:
   - Name: `Orion_Test_Campaign`
   - Email template: (create simple test email)
   - Landing page: "Orion MFA"
   - Sending profile: "Orion Relay"
   - Groups: Select imported user
   - Launch

### 5.2 Monitor Campaign Progress in Victim Simulator
```bash
# Watch victim simulator logs
docker logs -f sc03-victim
```

**Expected**: Events will appear after delays

```
[2026-04-10 14:23:45] [VICTIM] INFO: [MAIL_RECEIVED] From: gophish@... | Campaign: ...
[2026-04-10 14:25:30] [VICTIM] INFO: [EMAIL_OPEN] Campaign: ... | Sender: gophish@...
[2026-04-10 14:26:15] [VICTIM] INFO: [LINK_CLICK] Campaign: ... | URL: http://172.20.3.10/landing/...
[2026-04-10 14:27:00] [VICTIM] WARNING: [MACRO_EXECUTION] Campaign: ... | Process: winword.exe
[2026-04-10 14:27:30] [VICTIM] CRITICAL: [CALLBACK_BEACON] Campaign: ... | Destination: 172.20.3.10:4444
```

### 5.3 Query Campaign Events
```bash
curl http://127.0.0.1:8080/api/events | jq
```

**Expected Output** (sample, after delays):
```json
[
  {
    "type": "email_received",
    "data": {
      "timestamp": "2026-04-10T14:23:45.123Z",
      "from": "gophish@orion-logistics.sim",
      "subject": "Test Phishing Email",
      "campaign_id": "Orion_Test_Campaign",
      "has_macro": true
    }
  },
  {
    "type": "email_open",
    "data": {
      "timestamp": "2026-04-10T14:25:30.456Z",
      "event_type": "email_open",
      "campaign_id": "Orion_Test_Campaign",
      ...
    }
  },
  ...
]
```

### 5.4 Check GoPhish Campaign Statistics
Return to GoPhish admin panel → **Campaigns** → Select campaign

**Expected**: 
- Sent: 1
- Opened: 1 (check after 2-5 minutes)
- Clicked: 1 (check after email open)
- Submitted Data: 1 (if credentials submitted)

---

## Test Phase 6: SIEM Event Validation

### 6.1 Check Event JSON Structure
```bash
cat backend/src/siem/events/sc03_events.json | jq 'keys'
```

**Expected Output**:
```json
[
  "callback_activity",
  "campaign_preparation",
  "email_campaign",
  "email_interactions",
  "ir_response",
  "osint",
  "payload_execution"
]
```

### 6.2 Verify Event Coverage
```bash
cat backend/src/siem/events/sc03_events.json | jq '.. | select(.id? != null) | .id' | sort | uniq | wc -l
```

**Expected**: 40+ unique event IDs

### 6.3 Check Event ID Mapping
```bash
cat backend/src/siem/events/sc03_events.json | jq '.. | select(.raw_log? != null) | .raw_log' | grep -o "\[.*\]" | sort | uniq
```

**Expected Output** (sample):
```
[CALLBACK_BEACON]
[CREDENTIAL_SUBMISSION]
[DNS]
[EMAIL_GATEWAY]
[ENDPOINT]
[ENDPOINT_DETECTION]
[ENDPOINT_EDR]
[ENDPOINT_REMEDIATION]
[FIREWALL]
[GOPHISH]
[MAIL_RELAY]
[SECURITY]
[SMTP]
[TICKETING]
[VICTIM_SMTP]
```

### 6.4 Verify MITRE Technique Mapping
```bash
cat backend/src/siem/events/sc03_events.json | jq '.. | select(.mitre_technique? != null) | .mitre_technique' | grep -o "T[0-9]*" | sort | uniq
```

**Expected Output** (sample):
```
T1020
T1027
T1046
T1059
T1071
T1083
T1087
T1110
T1203
T1204
T1204.002
T1566
T1566.001
T1566.002
T1583
T1583.006
T1596
T1598
T1598.003
```

---

## Test Phase 7: Phishing Attack Simulation (with Payload)

**This test requires macro-enabled document creation** — optional advanced step

### 7.1 Create Macro-Enabled Document
```powershell
# On attacker machine, create .docm with VBA payload
# (Out of scope for this test, requires Office or libreoffice with macro support)
```

### 7.2 Add Macro Attachment to GoPhish Campaign
In GoPhish email template, add attachment: `SecurityUpdate.docm`

### 7.3 Launch Campaign
**Wait 2-5 minutes for victim to open email and document**

### 7.4 Verify Macro Execution Events
```bash
curl http://127.0.0.1:8080/api/events | jq '.[] | select(.type == "macro_execution")'
```

**Expected Output**:
```json
{
  "type": "macro_execution",
  "data": {
    "timestamp": "2026-04-10T14:27:00.789Z",
    "event_type": "macro_execution",
    "campaign_id": "Orion_Test_Campaign",
    "process_name": "winword.exe",
    "parent_process": "explorer.exe",
    "macro_obfuscation": "base64 encoded PowerShell",
    "victim_hostname": "target-ws-sc03"
  }
}
```

### 7.5 Verify Callback Beacon Event
```bash
curl http://127.0.0.1:8080/api/events | jq '.[] | select(.type == "callback_beacon")'
```

**Expected Output**:
```json
{
  "type": "callback_beacon",
  "data": {
    "timestamp": "2026-04-10T14:27:30.012Z",
    "event_type": "callback_beacon",
    "campaign_id": "Orion_Test_Campaign",
    "source_ip": "172.20.3.30",
    "destination_ip": "172.20.3.10",
    "destination_port": 4444,
    "process_initiating": "powershell.exe",
    "connection_type": "reverse shell callback"
  }
}
```

---

## Test Phase 8: Stress Testing & Limits

### 8.1 Check Resource Limits
```bash
docker inspect sc03-phish | jq '.[0].HostConfig | {CpuQuota, Memory}'
```

**Expected Output**:
```json
{
  "CpuQuota": 500000,
  "Memory": 536870912
}
```

(0.5 CPU cores = 500000, 512MB = 536870912 bytes)

### 8.2 Test Multiple Concurrent Campaigns
```bash
# Reset simulator
curl -X POST http://127.0.0.1:8080/api/reset

# Manually create 3 campaigns in GoPhish
# Launch all 3 simultaneously
# Monitor victim simulator
docker logs -f sc03-victim
```

**Expected**: All events logged without resource exhaustion

---

## Troubleshooting Guide

### Issue: GoPhish admin panel won't start
**Symptoms**: sc03-phish container exists but curl to 3333 fails

**Solution**:
```bash
docker logs sc03-phish | tail -50
# Look for: "Error", "panic", "listen"

# Common causes:
# 1. Port 3333 already in use (docker ps | grep 3333)
# 2. gophish.db corrupted (rm gophish.db, restart)
# 3. Permissions issue (check /home/gophish ownership)

docker-compose restart sc03-phish
```

### Issue: Mail relay won't accept connections
**Symptoms**: `nc -zv 127.0.0.1 25` fails

**Solution**:
```bash
docker logs sc03-mailrelay | tail -30
# Look for: "fatal", "error", "cannot bind"

# If Postfix won't start:
docker exec sc03-mailrelay postfix -c /etc/postfix status
docker exec sc03-mailrelay postfix -c /etc/postfix start

# If port conflict:
docker port sc03-mailrelay
netstat -tulpn | grep 25
```

### Issue: Victim simulator doesn't receive emails
**Symptoms**: `/api/campaigns` shows 0 emails, but GoPhish shows sent

**Solution**:
```bash
# 1. Verify mail relay routing
docker exec sc03-mailrelay postmap -q "@orion-logistics.sim" /etc/postfix/virtual
# Should return: victim@172.20.3.30

# 2. Check mail logs on relay
docker logs sc03-mailrelay | grep -i "to=.*victim"

# 3. Verify victim SMTP is listening
docker exec sc03-victim nc -zv 127.0.0.1 25

# 4. Manually test email send
docker exec sc03-phish /bin/bash
# telnet 172.20.3.20 25
# > MAIL FROM:<test@orion-logistics.sim>
# > RCPT TO:<victim@172.20.3.30>
# > DATA
# > Subject: Test
# > Test message
# > .
```

### Issue: Victim simulator API returns 500 errors
**Symptoms**: `/api/events` or `/api/campaigns` returns HTTP 500

**Solution**:
```bash
docker logs sc03-victim | tail -50
# Look for: "Exception", "Traceback", "TypeError"

# Restart victim simulator
docker-compose restart sc03-victim
docker logs sc03-victim | grep "Listening"
```

### Issue: Timeout waiting for victims to open email
**Symptoms**: After 10+ minutes, no email_open event

**Solution** (remember: delays are intentional)
```bash
# Email open: 120-300 seconds (2-5 min)
# Wait at least 5 minutes before checking

curl http://127.0.0.1:8080/api/campaigns | jq '.total_emails_received'
# Should show > 0

# If still 0, check mail relay logs for delivery failure
docker logs sc03-mailrelay | tail -20
```

---

## Cleanup

### Stop SC-03 Services
```bash
docker-compose --profile sc03 down
```

### Remove Data (preserve containers)
```bash
docker-compose --profile sc03 stop
```

### Full Reset (delete all SC-03 data)
```bash
docker-compose --profile sc03 down -v
docker system prune
```

---

## Success Criteria

✅ **All tests pass if**:
1. All 3 containers reach `Up (healthy)` status
2. GoPhish admin panel accessible (3333)
3. Mail relay accepts SMTP (25)
4. Victim simulator API responds (8080 /health)
5. Campaign creation + launch works in GoPhish
6. Victim simulator receives emails
7. Events appear in victim API after time delays (2-5 min email open, then clicks)
8. SIEM event JSON has 40+ events across 7 categories
9. Event format includes severity, MITRE technique, CWE
10. Network isolated (no host/internet routes)
11. Resource limits applied (0.5 CPU, 512MB RAM each)

---

## Time Expectations

| Activity | Duration | Note |
|----------|----------|------|
| Container startup | 30-60s | Health checks may take 30s |
| Email delivery (GoPhish→Relay→Victim) | <1s | Immediate in SIEM |
| Victim email open simulation | 120-300s | Realistic 2-5 min delay |
| Victim link click simulation | 30-120s | After email open |
| Macro execution simulation | 10-60s | After document open |
| Callback beacon generation | 5-30s | After macro execution |

**Total end-to-end time**: ~7-10 minutes from campaign launch to callback

---

**Last Updated**: 2026-04-10  
**Author**: Claude Code  
**Status**: ✅ Complete & Verified  
