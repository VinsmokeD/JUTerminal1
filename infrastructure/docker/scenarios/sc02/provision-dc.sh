#!/bin/bash
set -e

# Use environment variables with fallbacks
DOMAIN="${DOMAIN:-nexora.local}"
REALM="${REALM:-NEXORA.LOCAL}"
NETBIOS_NAME="${NETBIOS_NAME:-NEXORA}"
ADMIN_PASS="${ADMINPASS:-NexoraAdmin2024!}"

echo "[*] CyberSim SC-02 Domain Controller Provisioner"
echo "[*] Realm: $REALM"
echo "[*] Domain: $DOMAIN"
echo "[*] NetBIOS: $NETBIOS_NAME"

PROVISION_MARKER="/var/lib/samba/private/.cybersim_provisioned"

if [ ! -f "$PROVISION_MARKER" ]; then
    echo "[+] Initializing Samba AD DC Provisioning..."

    # Remove existing samba config to ensure clean provision
    rm -f /etc/samba/smb.conf
    rm -rf /var/lib/samba/private/*

    # Provision Domain
    if samba-tool domain provision \
        --realm=$REALM \
        --domain=$NETBIOS_NAME \
        --server-role=dc \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass="$ADMIN_PASS" \
        --option="acl_xattr:ignore system acls=yes"; then
        echo "[+] Provision command succeeded"
        touch "$PROVISION_MARKER"
        # Ensure we know where smb.conf actually is
        if [ ! -f /etc/samba/smb.conf ] && [ -f /var/lib/samba/private/smb.conf ]; then
            echo "[*] Linking /var/lib/samba/private/smb.conf to /etc/samba/smb.conf"
            ln -sf /var/lib/samba/private/smb.conf /etc/samba/smb.conf
        fi
        cp /etc/samba/smb.conf /var/lib/samba/private/smb.conf.bak 2>/dev/null || true
    else
        echo "[!] Samba domain provision failed"
        exit 1
    fi
else
    echo "[*] Domain already provisioned, ensuring smb.conf exists..."
    if [ ! -f /etc/samba/smb.conf ] || ! grep -qi "^[[:space:]]*server role[[:space:]]*=[[:space:]]*active directory domain controller" /etc/samba/smb.conf; then
        if [ -f /var/lib/samba/private/smb.conf.bak ]; then
            cp /var/lib/samba/private/smb.conf.bak /etc/samba/smb.conf
        elif [ -f /var/lib/samba/private/smb.conf ]; then
            ln -sf /var/lib/samba/private/smb.conf /etc/samba/smb.conf
        fi
    fi
fi

# Verify 'server role' is correct
if ! grep -qi "^[[:space:]]*server role[[:space:]]*=[[:space:]]*active directory domain controller" /etc/samba/smb.conf; then
    echo "[!] WARNING: smb.conf does not have DC role set correctly!"
    grep "server role" /etc/samba/smb.conf || echo "No server role found"
    exit 1
fi

# Persist the ACL workaround if not present
if [ -f /etc/samba/smb.conf ] && ! grep -q "ignore system acls" /etc/samba/smb.conf; then
    sed -i '/^\[global\]/a\        acl_xattr:ignore system acls = yes' /etc/samba/smb.conf
fi

# ── Seed Users ───────────────────────────────────────────────────────
# We seed users regardless of marker to ensure session-consistency
echo "[+] Seeding users and service accounts..."

function add_user() {
    local username=$1
    local password=$2
    if ! samba-tool user show "$username" >/dev/null 2>&1; then
        echo "    Adding user: $username"
        samba-tool user add "$username" "$password"
    fi
}

add_user "jsmith" "Password123"
add_user "svc_backup" "Backup2023!"
add_user "it.admin" "DomainAdmin2024!"
add_user "rgreen" "Summer2024!"

# ── Configure AS-REP Roasting (rgreen) ─────────────────────────────
# Set DONT_REQ_PREAUTH (0x00400000) bit in userAccountControl
echo "[+] Configuring AS-REP Roasting for 'rgreen'..."
SAM_PATH="/var/lib/samba/private/sam.ldb"
UAC_VAL=$(ldbsearch -H "$SAM_PATH" "CN=rgreen,CN=Users,DC=nexora,DC=local" userAccountControl | grep userAccountControl | awk '{print $2}')
if [ -n "$UAC_VAL" ]; then
    NEW_UAC=$((UAC_VAL | 4194304))
    cat <<EOF | ldbmodify -H "$SAM_PATH"
dn: CN=rgreen,CN=Users,DC=nexora,DC=local
changetype: modify
replace: userAccountControl
userAccountControl: $NEW_UAC
EOF
    echo "    Success: rgreen UAC updated to $NEW_UAC"
else
    echo "    [!] Could not find rgreen user for UAC update"
fi

# ── Configure Kerberoasting (svc_backup) ───────────────────────────
# Add an SPN for the service account
echo "[+] Configuring Kerberoasting for 'svc_backup'..."
samba-tool spn add "MSSQLSvc/nexora-fs01.nexora.local:1433" svc_backup 2>/dev/null || true

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

echo "[+] DC Setup Complete — Starting Samba via Supervisord"
exec /usr/bin/supervisord -n
