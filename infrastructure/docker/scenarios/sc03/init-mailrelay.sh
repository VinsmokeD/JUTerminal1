#!/bin/bash
set -e

echo "[*] Postfix SMTP Relay Initialization"
echo "[*] Scenario: Orion Logistics Mail Server (SC-03)"

# Initialize Postfix
echo "[+] Initializing Postfix..."
postfix -c /etc/postfix new 2>/dev/null || true
postfix -c /etc/postfix start

# Wait for Postfix to be ready
echo "[*] Waiting for SMTP service..."
for i in {1..30}; do
    if nc -zv 127.0.0.1 25 > /dev/null 2>&1; then
        echo "[+] SMTP service is ready on port 25"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[!] SMTP service failed to start"
    fi
    sleep 1
done

# Create virtual alias map for testing
echo "[+] Setting up virtual alias maps..."
cat > /etc/postfix/virtual << 'EOF'
# Virtual alias map for Orion Logistics domain
# Maps simulated employees to the victim simulator

info@orion-logistics.sim           victim@172.20.3.30
support@orion-logistics.sim        victim@172.20.3.30
helpdesk@orion-logistics.sim       victim@172.20.3.30
it-security@orion-logistics.sim    victim@172.20.3.30
finance@orion-logistics.sim        victim@172.20.3.30
hr@orion-logistics.sim             victim@172.20.3.30
admin@orion-logistics.sim          victim@172.20.3.30

# Catch-all for any other addresses
@orion-logistics.sim               victim@172.20.3.30
EOF

# Create transport map for routing to victim simulator
echo "[+] Setting up mail transport routing..."
cat > /etc/postfix/transport << 'EOF'
# Route all local mail to victim simulator
orion-logistics.sim     smtp:[172.20.3.30]:25
EOF

# Build alias databases
postmap /etc/postfix/virtual
postmap /etc/postfix/transport

# Reload Postfix to apply configuration
echo "[+] Reloading Postfix configuration..."
postfix -c /etc/postfix reload

echo "[+] SMTP Relay Ready"
echo "[+] Service: SMTP relay at 172.20.3.20:25"
echo "[+] Domain: orion-logistics.sim"
echo "[+] All mail routed to victim simulator at 172.20.3.30"
echo ""
echo "[*] SC-03 Mail Server:"
echo "    - Accepts SMTP from GoPhish (172.20.3.10)"
echo "    - Routes all mail to victim simulator (172.20.3.30)"
echo "    - Logs all SMTP transactions for SIEM"
echo ""

# Keep service running and show logs
echo "[*] Monitoring Postfix logs..."
touch /var/log/maillog
tail -F /var/log/maillog
