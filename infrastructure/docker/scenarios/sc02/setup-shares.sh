#!/bin/bash
set -e

# Create share directories
mkdir -p /srv/shares/public
mkdir -p /srv/shares/finance
mkdir -p /srv/shares/backups
mkdir -p /srv/shares/admin

# Set permissions
chmod 777 /srv/shares/public
chmod 750 /srv/shares/finance
chmod 700 /srv/shares/backups
chmod 700 /srv/shares/admin

# Seed mock files — Finance
echo "Q1-2024 Revenue Report — NEXORA INTERNAL" > /srv/shares/finance/Q1_2024_Revenue.xlsx
echo "Employee Salary Grid 2024 — CONFIDENTIAL" > /srv/shares/finance/Salary_Grid_2024.xlsx
echo "Nexora Budget Forecast FY2025" > /srv/shares/finance/Budget_FY2025.docx

# Seed mock files — Public
echo "Nexora Financial Services — Public Information Package" > /srv/shares/public/welcome.txt
echo "IT Help Desk: helpdesk@nexora.local | Ext 2000" > /srv/shares/public/it_support.txt

# Seed mock files — Backups
echo "BACKUP 2024-01-15 — NEXORA DATABASE DUMP" > /srv/shares/backups/db_backup_20240115.bak

# Seed mock files — Admin
echo "ADMINISTRATOR LOGS — NEXORA IT" > /srv/shares/admin/audit_log.txt

# Start Samba
exec smbd -F --no-process-group --log-stdout
