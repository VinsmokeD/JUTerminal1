#!/bin/bash
set -e

# Environment variables with defaults
DC_IP="${DC_IP:-172.20.2.20}"
DOMAIN="${DOMAIN:-nexora.local}"
REALM="${REALM:-NEXORA.LOCAL}"
NETBIOS_NAME="${NETBIOS_NAME:-NEXORA}"

echo "[*] File Server Setup Script"
echo "[*] DC IP: $DC_IP"
echo "[*] Domain: $DOMAIN"
echo "[*] Realm: $REALM"

# Wait for DC to be available (timeout 60s)
echo "[*] Waiting for Domain Controller at $DC_IP:389..."
for i in {1..60}; do
    if nc -zv -w 2 "$DC_IP" 389 2>/dev/null; then
        echo "[+] DC is reachable"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "[!] DC did not become reachable, continuing anyway..."
    fi
    sleep 1
done

# Create share directories with proper permissions
echo "[+] Creating share directories..."
mkdir -p /srv/shares/public
mkdir -p /srv/shares/finance
mkdir -p /srv/shares/backups
mkdir -p /srv/shares/admin

chmod 755 /srv/shares/public
chmod 750 /srv/shares/finance
chmod 750 /srv/shares/backups
chmod 750 /srv/shares/admin

# Seed realistic files
echo "[+] Seeding files..."
cat > /srv/shares/finance/budget-2024.xlsx << 'EOF'
=== NEXORA FINANCIAL SERVICES ===
FY2024 Budget Report
CONFIDENTIAL - Finance Department Only

Q1: $2.4M
Q2: $2.1M
Q3: $2.8M
Q4: $2.5M
Total: $9.8M
EOF

cat > /srv/shares/finance/salary-grid-2024.xlsx << 'EOF'
=== NEXORA SALARY ADMINISTRATION ===
CONFIDENTIAL
Last Updated: 2024-01-15

Employee Salary Data:
jsmith: $65,000
it.admin: $85,000
svc_backup: $0 (Service Account)
EOF

cat > /srv/shares/public/employee-handbook.pdf << 'EOF'
NEXORA FINANCIAL SERVICES
Employee Handbook 2024

Welcome to Nexora!
This handbook contains our policies, procedures, and contact information.

Key Contacts:
- IT Help Desk: ext. 2000
- HR: ext. 3000
- Security: security@nexora.local
EOF

cat > /srv/shares/public/welcome.txt << 'EOF'
Welcome to Nexora Financial Services
Central File Storage Server
NEXORA-FS01

For assistance, contact IT Help Desk
helpdesk@nexora.local | ext. 2000
EOF

cat > /srv/shares/backups/db_backup_20240115.bak << 'EOF'
NEXORA DATABASE BACKUP
Date: 2024-01-15
Type: Full System Backup
Location: Production Database Cluster

[BACKUP DATA - ENCRYPTED]
This backup contains sensitive production data.
Contact IT for recovery procedures.
EOF

cat > /srv/shares/admin/audit_log.txt << 'EOF'
=== NEXORA IT AUDIT LOG ===
Administrative Access Log - CONFIDENTIAL

2024-01-15 08:00 - it.admin: Domain backup
2024-01-15 09:30 - it.admin: Password policy review
2024-01-15 14:00 - it.admin: GPO update
2024-01-15 16:45 - system: Scheduled backup completed
EOF

# Set file ownership and permissions
chown -R nobody:nogroup /srv/shares
chmod 640 /srv/shares/finance/*
chmod 640 /srv/shares/backups/*
chmod 640 /srv/shares/admin/*
chmod 644 /srv/shares/public/*

# Configure Kerberos client for domain join (with RC4 support for Kerberoasting)
echo "[+] Configuring Kerberos..."
cat > /etc/krb5.conf << EOF
[libdefaults]
    default_realm = $REALM
    rdns = false
    dns_lookup_realm = false
    dns_lookup_kdc = false
    kdc_timesync = 1
    # Match DC configuration for consistency
    default_tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
    default_tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    permitted_enctypes = aes256-cts rc4-hmac des-cbc-md5
    allow_weak_crypto = true

[realms]
    $REALM = {
        kdc = $DC_IP:88
        admin_server = $DC_IP:749
        master_kdc = $DC_IP:88
        tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
        tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    }

[domain_realm]
    .$DOMAIN = $REALM
    $DOMAIN = $REALM
EOF

# Update NSS to use winbind
echo "[+] Configuring winbind..."
cat > /etc/nsswitch.conf << 'EOF'
passwd:         files winbind
shadow:         files
group:          files winbind
hosts:          files dns
EOF

# Update DNS to use DC as resolver
echo "[+] Configuring DNS..."
cat > /etc/resolv.conf << EOF
nameserver $DC_IP
search $DOMAIN
EOF

# Attempt domain join (may fail initially if DC not ready, that's OK)
echo "[+] Attempting domain join..."
net ads join -U administrator%NexoraAdmin2024! -d 2>/dev/null || {
    echo "[*] Domain join may need retrying (DC might not be fully ready)"
    sleep 5
    net ads join -U administrator%NexoraAdmin2024! -d 2>/dev/null || echo "[*] Domain join attempted"
}

# Check domain membership
echo "[+] Checking domain status..."
net ads info 2>/dev/null || echo "[*] Not yet joined, smbd will attempt at startup"

# Start file server
echo "[+] Starting Samba file server..."
exec smbd -F --no-process-group --log-stdout
