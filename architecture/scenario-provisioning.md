# SOP: Scenario Provisioning (AD & Infrastructure)

## Overview
This document defines how complex scenarios like SC-02 (AD Compromise) are provisioned in the CyberSim environment using Docker.

## SC-02 (Nexora AD) Specifications
- **Domain**: nexora.local
- **Domain Controller**: `sc02-dc` (172.20.2.20)
- **File Server**: `sc02-fileserver` (172.20.2.40)
- **Pre-seeded Credentials**:
  - `jsmith:Welcome1!` (Standard User)
  - `svc_backup:Backup2023` (Kerberoastable service account)
  - `it.admin:Welcome1!` (Domain Admin)

## Provisioning Logic
1. **DC (Samba4)**:
   - Initialized via `provision-dc.sh`.
   - Provisions domain with `samba-tool`.
   - Creates users and sets SPN for `svc_backup`.
   - Networks are `internal: true` to prevent internet egress.

2. **File Server (FS01)**:
   - Joins (or simulates) the domain.
   - Configures SMB shares via `smb.conf`.
   - Sets up sensitive file mock-ups in `/srv/shares/backups` and `/srv/shares/admin`.

## Verification Steps
- `docker-compose up --build sc02-dc sc02-fileserver`
- Attacker (Kali) can `nmap 172.20.2.20` and see ports 88 (Kerberos), 389 (LDAP), 445 (SMB).
- Attacker can `impacket-GetUserSPNs` against 172.20.2.20.
