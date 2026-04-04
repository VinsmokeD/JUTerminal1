#!/bin/bash
set -e

# Create share directories
mkdir -p /srv/shares/public
mkdir -p /srv/shares/backups
mkdir -p /srv/shares/admin

# Set permissions
chmod -R 777 /srv/shares/public
chmod -R 700 /srv/shares/backups
chmod -R 700 /srv/shares/admin

# Mock files
echo "Nexora Financial Public Documents" > /srv/shares/public/welcome.txt
echo "BACKUP 2023 - NEXORA DATABASE" > /srv/shares/backups/db_backup.bak
echo "ADMINISTRATOR LOGS - NEXORA" > /srv/shares/admin/logs.txt

# Start Samba
exec smbd -F --no-process-group --log-stdout
