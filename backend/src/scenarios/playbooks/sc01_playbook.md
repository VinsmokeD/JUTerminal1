# SC-01: NovaMed Healthcare Web Application Incident Response Playbook

## Executive Summary

This playbook addresses incident response for web application attacks targeting the NovaMed Healthcare system. Attacks include OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, Path Traversal, File Upload, Authentication/Session abuse). This guide follows the **NIST SP 800-61 Computer Security Incident Handling Guide** framework.

---

## 1. Detection

### 1.1 SIEM Detection Queries

#### SQL Injection Detection
```sql
severity IN ("HIGH", "CRITICAL") AND message LIKE "%SQL%injection%"
Events: sqli_rule_942100, sqli_union_based, sqli_time_based, http_500_sqli
Query Response Size Anomaly: (response_size > 4000) AND (previous_response_size < 1000)
```

**Alert Thresholds:**
- Single SQLi rule match → Investigation required
- 2+ SQLi signatures in 1 minute → Escalate to CRITICAL
- Successful response size anomaly (>4000 bytes) → Potential data exfiltration

#### Directory Enumeration Detection
```sql
severity IN ("MED", "HIGH") AND (id IN ("gobuster_404_flood", "backup_directory_exposed", "admin_path_discovery"))
404_request_count > 50 IN 30s_window FROM same_src_ip
Alert: "Backup directory accessible" OR "Admin path discovery"
```

**Alert Thresholds:**
- 50+ 404s in 30s → Directory brute-force
- Any exposure of `/backup/` or `/admin/` → HIGH severity

#### File Upload Detection
```sql
severity IN ("HIGH", "CRITICAL") AND (id IN ("executable_upload_attempt", "mime_type_mismatch", "double_extension_bypass", "polyglot_file_upload"))
Alert on: .exe, .php, .sh, .zip in upload filename
Alert on: MIME mismatch (declared vs actual content type)
```

#### Authentication/Session Abuse
```sql
severity IN ("HIGH", "CRITICAL") AND (id IN ("brute_force_login", "session_hijacking", "session_fixation"))
failed_login_count > 5 IN 60s_window FROM same_src_ip
Alert on: Same SESSIONID across different IP addresses
```

### 1.2 Early Warning Signs

| Indicator | Severity | Action |
|-----------|----------|--------|
| **nmap_syn_scan** (50+ SYN from single IP in 30s) | MED | Document source IP, watch for escalation |
| **nikto_scan** or **gobuster_404_flood** | MED | Enable detailed logging on 404 responses |
| **SQLi_rule_942100** or **sqli_union_based** | HIGH | Immediate investigation + containment prep |
| **backup_directory_exposed** or **admin_path_discovery** | HIGH | Check access logs for data exposure |
| **executable_upload_attempt** | CRITICAL | IMMEDIATE isolation + forensics |
| **session_hijacking** | CRITICAL | Revoke all sessions, force re-auth |

---

## 2. Analysis Phase

### 2.1 Investigation Checklist

#### Step 1: Confirm Attack
1. **Pull SIEM dashboard** for source IP and time range
2. **Extract raw logs** for full HTTP request/response bodies
3. **Document evidence chain**:
   - Start time
   - Source IP + User-Agent
   - Target URL/parameter
   - Attack payload
   - Server response
   - Data accessed

#### Step 2: Scope Assessment
```
Q1: Is this SQL injection or other attack?
   → Look for UNION SELECT, OR 1=1, SLEEP(), etc.
   
Q2: What data was accessed?
   → Check raw_log for SELECT queries
   → Query database audit logs (mysql slow_query_log)
   
Q3: Was data exfiltrated?
   → Response size anomaly (>4000 bytes)?
   → Unusual download requests?
   
Q4: How long was attacker present?
   → Map all requests from src_ip across time
```

#### Step 3: Extract IOCs (Indicators of Compromise)
```
Source IP:        {src_ip} from SIEM events
User-Agent:       Extract from raw_log
Timestamps:       First alert + last alert
Payloads:         SQL keywords, XSS tags, path traversal chars
Affected URLs:    /login, /api/v1/, /upload, etc.
Cookie/Token:     Extract SessionID, CSRF tokens if available
```

#### Step 4: Trace Data Flow
1. **Database audit logs**:
   ```bash
   grep -i "app_user\|SELECT.*FROM users\|DROP" /var/log/mysql/error.log
   ```
2. **Web server access logs**:
   ```bash
   tail -10000 /var/log/apache2/access.log | grep "{src_ip}" | grep -E "(union|or 1|sleep|../..|upload)" -i
   ```
3. **File system changes**:
   ```bash
   find /var/www/html -type f -mmin -60 | head -20
   ```

### 2.2 Sample SQL Injection Analysis
```
Raw HTTP Request:
  POST /login HTTP/1.1
  Content-Type: application/x-www-form-urlencoded
  
  username=admin' UNION SELECT NULL, password FROM users-- &password=x

Database Impact:
  SELECT * FROM users WHERE username='admin' UNION SELECT NULL, password FROM users--'
  → Returns password column from users table
  
Data Exfiltration:
  Response size: 4821 bytes (anomalous for login page)
  Response body: Contains password hashes for all users
```

### 2.3 Sample XSS Analysis
```
Attack Vector: Stored XSS
Payload: <img src=x onerror=alert('xss')>
Target: POST /api/comment (user input stored in database)
Impact: Every user viewing comments triggers JavaScript execution
Risk: Session hijacking, credential theft, malware distribution
```

---

## 3. Containment

### 3.1 Immediate Actions (0-15 minutes)

#### 3.1.1 Block Attacker IP
```bash
# Firewall rule (iptables or cloud WAF)
iptables -I INPUT -s {src_ip} -j DROP

# Nginx/Apache block
location ~* ^/ {
  deny {src_ip};
  return 403;
}

# Verify
iptables -L -n | grep {src_ip}
```

#### 3.1.2 Revoke Compromised Sessions
```bash
# Clear all sessions from attacker IP
DELETE FROM sessions WHERE ip_address = '{src_ip}';

# Force all other users to re-authenticate
DELETE FROM sessions WHERE user_id != admin;
```

#### 3.1.3 Disable Vulnerable Endpoint (if safe)
```bash
# If /upload is vulnerable, disable temporarily:
location /upload {
  return 503;  # Service Unavailable
}

# Force re-deploy to restart application
docker-compose restart webapp
```

#### 3.1.4 Enable Enhanced Logging
```bash
# MySQL query log
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';

# Apache verbose logging
LogLevel debug
```

### 3.2 Mid-Containment (15-60 minutes)

#### 3.2.1 Patch Vulnerable Code
```python
# Example: Fix SQL injection in login.php
# BEFORE (Vulnerable):
query = f"SELECT * FROM users WHERE username='{username}'"

# AFTER (Parameterized):
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))
```

#### 3.2.2 Deploy WAF Rules
```
ModSecurity Core Rules (OWASP ModSecurity CRS):
- Enable/enforce Rule 942100 (libinjection SQLi detection)
- Enable/enforce Rule 941160 (XSS detection)
- Enable/enforce Rule 930100 (Path traversal detection)
- Enable/enforce Rule 950011 (File upload validation)

Action: Block (not just alert)
```

#### 3.2.3 Reset Database
```bash
# If data was compromised, restore from last clean backup
mysqldump -u root -p novamed_db > /backup/novamed_$(date +%s).sql

# Restore from clean backup (pre-attack)
mysql -u root -p novamed_db < /backup/novamed_clean_2026-04-09.sql

# Verify: Compare row counts
SELECT COUNT(*) FROM users;  # Should match known baseline
```

---

## 4. Eradication

### 4.1 Code Review & Vulnerability Patching

#### 4.1.1 Identify Vulnerable Code Patterns
```python
# Search for unsafe patterns:
grep -r "f\(" backend/src/ | grep -i "select\|insert\|update"  # f-strings in SQL
grep -r "\${" backend/src/ | grep -i "sql"                      # String interpolation
grep -r "eval\|exec\|load\|pickle" backend/src/                  # Unsafe deserialization
grep -r "<img\|<script" backend/src/ | grep -v "\.html$"        # Unescaped user input in response
```

#### 4.1.2 Implement WAF Rules for Similar Issues
```
# SQL Injection patterns
- Block: `' OR '1'='1`
- Block: `; DROP TABLE`
- Block: `UNION SELECT`
- Block: Time-based blind: `SLEEP(\d+)`

# XSS patterns
- Block: `<script`
- Block: `javascript:`
- Block: `onerror=`, `onload=`, `onclick=`

# Path Traversal
- Block: `../`
- Block: `..\\`
- Block: `%2e%2e/`

# File Upload
- Block: .exe, .php, .sh, .jsp in upload
- Enforce: MIME type verification (magic bytes)
- Enforce: Stored uploads outside web root
```

#### 4.1.3 Implement Secure Coding Standards
```
OWASP Top 10 Mitigations:
- A01 Broken Access Control: Use parameterized queries, validate input
- A02 Cryptographic Failures: Never log passwords; encrypt sensitive data at rest
- A03 Injection: Use prepared statements, no dynamic query building
- A04 Insecure Design: Threat model, design reviews, secure by default
- A05 Security Misconfiguration: Disable debug mode, secure headers, minimal privileges
- A06 Vulnerable Components: Update dependencies, SCA scanning
- A07 Authentication Failures: MFA, password policy, session management
- A08 Data Integrity Failures: Input validation, output encoding
- A09 Logging Failures: Log security events, but never credentials
- A10 SSRF: Validate URLs, restrict outbound access
```

### 4.2 Remove Persistence Mechanisms

```bash
# Check for dropped webshells
find /var/www/html -type f -newer /var/www/html/index.php -ls

# Check for suspicious uploads
ls -lat /var/www/html/uploads/ | head -20

# Remove any suspicious files
rm /var/www/html/uploads/shell.php
rm /var/www/html/backup/dropped_file.exe
```

### 4.3 Audit Database Integrity

```sql
-- Check for unauthorized accounts
SELECT user, host, authentication_string FROM mysql.user;

-- Check for privilege escalation
SELECT user, file_priv, process_priv, super_priv FROM mysql.user;

-- Remove suspicious accounts
DROP USER 'backdoor'@'%';

-- Reset password for compromised admin
ALTER USER 'admin'@'localhost' IDENTIFIED BY 'NewStrongPassword2024!';
```

---

## 5. Recovery

### 5.1 Restore from Clean Backup
```bash
# List available backups
ls -lah /backup/ | grep -i "novamed.*2026-04-09"

# Restore (verify time = before attack)
mysql -u root -p novamed_db < /backup/novamed_2026-04-09_03:00:00.sql

# Verify data integrity
SELECT COUNT(*) FROM users;  # Should match baseline
SELECT * FROM audit_log WHERE event_time > '2026-04-10 12:00:00';  # Check what was changed
```

### 5.2 Re-enable Services
```bash
# Restart application (with patched code)
docker-compose build webapp
docker-compose up -d webapp

# Verify health checks
curl -I http://localhost:8080/health
curl -I http://localhost:8080/login

# Monitor logs
tail -f /var/log/apache2/error.log
tail -f /var/log/mysql/error.log
```

### 5.3 Restore User Sessions
```bash
# Gracefully re-authenticate users (send notification email)
Subject: Security Alert - Please Re-authenticate
Body: We detected unauthorized access. For your security, please log in again.

# Force logout of all existing sessions (except admin)
DELETE FROM sessions WHERE user_id != (SELECT id FROM users WHERE username='admin');
```

### 5.4 Verify WAF Rules
```bash
# Test SQLi blocking
curl "http://localhost:8080/login?username=admin' OR '1'='1"
# Expected: 403 Forbidden (blocked by ModSecurity)

# Test XSS blocking
curl "http://localhost:8080/api/v1/comment?text=<script>alert(1)</script>"
# Expected: 403 Forbidden

# Check WAF logs
tail /var/log/modsec_audit.log | grep -i "rule 942\|rule 941"
```

---

## 6. Post-Incident Activities

### 6.1 Lessons Learned

#### Questions for Root Cause Analysis
1. **Why was vulnerability exploitable?**
   - Missing input validation
   - Outdated framework version
   - No WAF in place

2. **Why wasn't it detected sooner?**
   - SIEM not configured
   - Alerts not escalated
   - Logging disabled

3. **What could have prevented this?**
   - Code review process
   - Static analysis scanning (SAST)
   - Penetration testing
   - Security training

#### Action Items (Track in Jira/Linear)
```
[ ] Implement secure SDLC with code review for all SQL queries
[ ] Deploy SAST tool (e.g., Snyk, Checkmarx) in CI/CD
[ ] Mandatory security training: OWASP Top 10 for all developers
[ ] Establish baseline security tests (SIEM + WAF rules)
[ ] Schedule quarterly penetration testing
[ ] Implement real-time alerting for CRITICAL events
```

### 6.2 Metrics & Reporting

```
Incident Scorecard:
- Time to Detect: [X minutes] (Target: <5 minutes)
- Time to Respond: [Y minutes] (Target: <15 minutes)
- Time to Recover: [Z minutes] (Target: <60 minutes)
- Data Exposed: [# of records] (Target: 0)
- Attack Vector: SQL Injection
- Root Cause: Missing parameterized queries
- Severity: HIGH
- Impact: User data compromise potential
```

### 6.3 Update Runbooks & Procedures
```markdown
## Updated Playbook Sections (Post-Incident)

1. **Detection**: Added SQLi fingerprinting (SLEEP(), UNION SELECT)
2. **Analysis**: Added database audit query examples
3. **Containment**: Added WAF rule deployment steps
4. **Eradication**: Added secure coding patterns
5. **Recovery**: Added data integrity verification checks
6. **Post-Incident**: Added lessons learned framework

Next Review Date: 2026-05-10 (30 days)
Responsible: Security Team + Development Team
```

---

## 7. References & Quick Links

| Document | Link | Purpose |
|----------|------|---------|
| NIST 800-61 | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf | Incident Handling Framework |
| OWASP Top 10 2021 | https://owasp.org/www-project-top-ten/ | Web App Vulnerabilities |
| ModSecurity CRS | https://coreruleset.org/ | WAF Rule Documentation |
| MITRE ATT&CK | https://attack.mitre.org/techniques/T1190/ | Exploitation Framework |
| CWE (Top 25) | https://cwe.mitre.org/top25/ | Common Weakness Enumeration |

---

## 8. Appendix: Key Contacts & Escalation

```
Tier 1: On-Call Analyst
  Role: Initial triage, alert acknowledgment
  Escalate to Tier 2 if: Severity >= HIGH

Tier 2: Incident Commander
  Role: Coordinate response, communication
  Escalate to Tier 3 if: Data breach suspected

Tier 3: CISO + Management
  Role: Executive notification, legal hold
  Notify: Legal, PR, Customers (as required)
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-13  
**Next Review:** 2026-05-13  
**Approved By:** Blue Team Lead
