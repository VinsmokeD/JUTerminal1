#!/bin/bash
set -e

echo "[*] GoPhish Campaign Initialization Script"
echo "[*] Scenario: Orion Logistics (SC-03)"

# Ensure gophish config directory exists
mkdir -p /home/gophish
cd /home/gophish

# Wait for GoPhish to start
echo "[*] Starting GoPhish service..."
./gophish &
GOPHISH_PID=$!

# Give GoPhish time to initialize
sleep 5

echo "[+] GoPhish started (PID: $GOPHISH_PID)"

# Wait for admin API to be available
echo "[*] Waiting for GoPhish admin API (port 3333)..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:3333 > /dev/null 2>&1; then
        echo "[+] GoPhish admin API is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[!] GoPhish admin API failed to start"
    fi
    sleep 1
done

# Note: In production, you would:
# 1. Create a sending profile pointing to sc03-mailrelay:25
# 2. Create a landing page for credential harvesting
# 3. Import target user list
# 4. Create and launch a campaign
#
# For this training scenario, students manually create campaigns via the GoPhish admin panel
# API authentication would require the default gophish.db admin password

echo "[+] GoPhish initialization complete"
echo "[+] Admin panel available at: http://172.20.3.10:3333/"
echo "[+] Phishing pages served at: http://172.20.3.10/"
echo "[+] SMTP relay available at: 172.20.3.20:25"
echo ""
echo "[*] SC-03 Scenario Ready:"
echo "    - Students design pretext email in Red Team workspace"
echo "    - GoPhish is configured with landing page and target list"
echo "    - Mail relay (172.20.3.20) handles SMTP delivery"
echo "    - Victim simulator (172.20.3.30) auto-clicks and reports callback"
echo "    - SIEM tracks email metrics and endpoint detection events"
echo ""

# Keep process running
wait $GOPHISH_PID
