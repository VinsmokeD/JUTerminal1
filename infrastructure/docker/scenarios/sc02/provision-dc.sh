#!/bin/bash
set -e

# Use environment variables with fallbacks
DOMAIN="${DOMAIN:-nexora.local}"
REALM="${REALM:-NEXORA.LOCAL}"
NETBIOS_NAME="${NETBIOS_NAME:-NEXORA}"
ADMIN_PASS="${ADMINPASS:-NexoraAdmin2024!}"

echo "[*] Domain Controller Provisioning Script"
echo "[*] Domain: $DOMAIN"
echo "[*] Realm: $REALM"
echo "[*] NetBIOS: $NETBIOS_NAME"

# Provision the domain (idempotent - check for actual database file)
if [ ! -f /var/lib/samba/private/sam.ldb ]; then
    echo "[+] Provisioning Samba4 AD DC..."
    # Clean up partial/corrupted state if directory exists
    [ -d /var/lib/samba/private ] && rm -rf /var/lib/samba/private

    samba-tool domain provision \
        --use-rfc2307 \
        --realm=$REALM \
        --domain=$NETBIOS_NAME \
        --server-role=dc \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass="$ADMIN_PASS"
    echo "[+] Domain provisioned successfully"
else
    echo "[*] Domain already provisioned (sam.ldb exists), skipping provision step"
fi

# Configure Kerberos for RC4 (weaker, for educational context - enables Kerberoasting)
echo "[+] Configuring Kerberos with RC4 support for educational vulnerability testing..."
cat > /etc/krb5.conf << 'EOF'
[libdefaults]
    default_realm = NEXORA.LOCAL
    rdns = false
    fcc_mit_compatibility = true
    dns_lookup_realm = false
    dns_lookup_kdc = false
    ignore_acceptor_hostname = true
    # Enable RC4 for Kerberoasting vulnerability demonstration
    default_tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
    default_tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    permitted_enctypes = aes256-cts rc4-hmac des-cbc-md5
    # Allow weaker algorithms for testing
    allow_weak_crypto = true

[realms]
    NEXORA.LOCAL = {
        kdc = 127.0.0.1:88
        admin_server = 127.0.0.1:749
        master_kdc = 127.0.0.1:88
        # Allow RC4 tickets for service requests
        tkt_enctypes = aes256-cts rc4-hmac des-cbc-md5
        tgs_enctypes = aes256-cts rc4-hmac des-cbc-md5
    }

[domain_realm]
    .nexora.local = NEXORA.LOCAL
    nexora.local = NEXORA.LOCAL
EOF

# Setup users and SPNs
echo "[+] Setting up users and service accounts..."

# Create low-privilege user: jsmith
if samba-tool user create jsmith "Password123" 2>/dev/null; then
    echo "[+] Created user: jsmith (low-privilege)"
else
    echo "[*] User jsmith already exists"
fi

# Create service account for Kerberoasting (SPN-based vulnerability)
if samba-tool user create svc_backup "Backup2023!" 2>/dev/null; then
    echo "[+] Created user: svc_backup (service account)"
else
    echo "[*] User svc_backup already exists"
fi

# Add SPN (Service Principal Name) to svc_backup for Kerberoasting vulnerability
if ! samba-tool user addspn svc_backup "CIFS/NEXORA-FS01.nexora.local" 2>/dev/null; then
    echo "[*] SPN CIFS/NEXORA-FS01.nexora.local already exists for svc_backup"
fi

# Create domain admin user
if samba-tool user create it.admin "DomainAdmin2024!" 2>/dev/null; then
    echo "[+] Created user: it.admin"
else
    echo "[*] User it.admin already exists"
fi

# Add it.admin to Domain Admins group
if ! samba-tool group addmembers "Domain Admins" it.admin 2>/dev/null; then
    echo "[*] User it.admin already in Domain Admins"
fi

# Reset administrator account password (built-in, created during provision)
echo "[+] Configuring Administrator account..."
samba-tool user setpassword Administrator --newpassword="$ADMIN_PASS" 2>/dev/null || true
samba-tool user setexpiry Administrator --noexpiry 2>/dev/null || true

# Set password expiry policy for all users (never expire for testing)
echo "[+] Setting password expiry policies..."
samba-tool user setexpiry jsmith --noexpiry 2>/dev/null || true
samba-tool user setexpiry svc_backup --noexpiry 2>/dev/null || true
samba-tool user setexpiry it.admin --noexpiry 2>/dev/null || true

echo "[+] Users configured successfully:"
samba-tool user list | head -10

# Enable audit logging for educational event tracking
echo "[+] Setting up audit logging..."
# Create audit log directory
mkdir -p /var/log/samba/audit
chmod 755 /var/log/samba/audit

# Configure Samba audit logging in smb.conf
# Note: Full Windows Event ID mapping requires Samba 4.14+ with full audit plugin
echo "[+] Audit directories prepared"

echo "[+] DC Setup Complete — Starting Samba"
exec samba -i
