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

PROVISION_MARKER="/var/lib/samba/private/.cybersim_provisioned"

# Provision the domain. A plain sam.ldb file can exist after a failed partial
# provision, so use an explicit marker written only after success.
if [ ! -f "$PROVISION_MARKER" ]; then
    echo "[+] Provisioning Samba4 AD DC..."
    # Clean up default/partial/corrupted state before provisioning.
    rm -rf /var/lib/samba/private /var/lib/samba/sysvol /var/cache/samba/*
    mkdir -p /var/lib/samba/private
    rm -f /etc/samba/smb.conf

    # NOTE: On Docker/WSL2 overlay filesystems the kernel may reject the NT
    # ACL system xattr set during sysvol setup with NT_STATUS_ACCESS_DENIED.
    # Telling Samba to ignore system ACLs sidesteps the xattr write path while
    # keeping the AD database functional for the training scenario.
    if samba-tool domain provision \
        --use-rfc2307 \
        --realm=$REALM \
        --domain=$NETBIOS_NAME \
        --server-role=dc \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass="$ADMIN_PASS" \
        --option="acl_xattr:ignore system acls=yes" \
        --option="vfs objects = "; then
        touch "$PROVISION_MARKER"
    else
        echo "[!] Samba domain provision failed; removing partial state before exit"
        rm -rf /var/lib/samba/private /var/lib/samba/sysvol /var/cache/samba/*
        exit 1
    fi

    # Persist the ACL workaround into smb.conf so subsequent Samba runs do not
    # try to read/write system NT ACLs on directories that lack xattr support.
    if [ -f /etc/samba/smb.conf ] && ! grep -q "ignore system acls" /etc/samba/smb.conf; then
        sed -i '/^\[global\]/a\        acl_xattr:ignore system acls = yes\n        vfs objects =' /etc/samba/smb.conf
    fi
    echo "[+] Domain provisioned successfully"
else
    echo "[*] Domain already provisioned (success marker exists), skipping provision step"
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

# Create more realistic users
for user in "mross:Winter2024!" "bclark:Spring2024!" "ajones:Summer2024!" "lwilliams:Autumn2024!"; do
    username=$(echo $user | cut -d: -f1)
    password=$(echo $user | cut -d: -f2)
    if samba-tool user create $username "$password" 2>/dev/null; then
        echo "[+] Created user: $username"
    else
        echo "[*] User $username already exists"
    fi
done

# AS-REP roastable training user marker. The ldbmodify step is best-effort
# because Samba schema behavior differs across image builds.
if samba-tool user create rgreen "Spring2024!" 2>/dev/null; then
    echo "[+] Created user: rgreen (AS-REP training path)"
else
    echo "[*] User rgreen already exists"
fi
samba-tool user setexpiry rgreen --noexpiry 2>/dev/null || true
cat > /tmp/rgreen-no-preauth.ldif << 'EOF'
dn: CN=rgreen,CN=Users,DC=nexora,DC=local
changetype: modify
replace: userAccountControl
userAccountControl: 4194816
EOF
ldbmodify -H /var/lib/samba/private/sam.ldb /tmp/rgreen-no-preauth.ldif 2>/dev/null || \
    echo "[*] AS-REP flag best-effort marker retained for rgreen"

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

# Add another SPN for SQL service
if samba-tool user create svc_sql "SqlPass456!" 2>/dev/null; then
    samba-tool user addspn svc_sql "MSSQLSvc/NEXORA-SQL01.nexora.local:1433" 2>/dev/null || true
    echo "[+] Created user: svc_sql with SPN"
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

# Seed SYSVOL artifacts for GPP and AS-REP methodology branches
echo "[+] Seeding SYSVOL training artifacts..."
mkdir -p /var/lib/samba/sysvol/$DOMAIN/Policies
cp -R /opt/cybersim/sysvol-seed/* /var/lib/samba/sysvol/$DOMAIN/Policies/ 2>/dev/null || true
cat > /var/lib/samba/sysvol/$DOMAIN/ASREP_ROASTABLE_rgreen.txt << 'EOF'
Training marker: rgreen is configured as the AS-REP roasting branch user.
Expected defensive finding: require Kerberos pre-authentication.
EOF

echo "[+] DC Setup Complete — Starting Samba"
exec samba -i
