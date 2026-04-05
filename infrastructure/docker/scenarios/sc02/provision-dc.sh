#!/bin/bash
set -e

# Configuration
DOMAIN="NEXORA.LOCAL"
REALM="NEXORA.LOCAL"
NETBIOS_NAME="NEXORA"
ADMIN_PASS="NexoraAdmin2024!"

# Provision the domain
if [ ! -f /etc/samba/smb.conf.bak ]; then
    echo "Provisioning Domain: $DOMAIN"
    mv /etc/samba/smb.conf /etc/samba/smb.conf.bak
    
    samba-tool domain provision \
        --use-rfc2307 \
        --realm=$REALM \
        --domain=$NETBIOS_NAME \
        --server-role=dc \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass=$ADMIN_PASS
        
    # Standard users
    samba-tool user create jsmith "Welcome1!"
    samba-tool user create it.admin "Welcome1!"
    samba-tool group addmembers "Domain Admins" it.admin
    
    # Service account for Kerberoasting
    samba-tool user create svc_backup "Backup2023"
    samba-tool user addspn svc_backup "CIFS/NEXORA-FS01.nexora.local"
else
    echo "Domain already provisioned."
fi

# Start Samba
exec samba -i
