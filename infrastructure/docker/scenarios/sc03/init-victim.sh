#!/bin/bash
set -e

echo "[*] Victim Endpoint Simulator Initialization"
echo "[*] Scenario: Orion Logistics Target Workstation (SC-03)"

# Start SMTP receiver for phishing mail delivery
echo "[+] Initializing Postfix..."
MAIL_LOG=/var/log/mail.log
touch "$MAIL_LOG"

postfix -c /etc/postfix new 2>/dev/null || true
if postfix -c /etc/postfix start; then
    echo "[+] Postfix SMTP started"
else
    echo "[!] Postfix failed to start, using Python SMTP fallback"
    python3 -u -m smtpd -n -c DebuggingServer 0.0.0.0:25 >> "$MAIL_LOG" 2>&1 &
fi

# Wait for SMTP to be ready
echo "[*] Waiting for SMTP service (port 25)..."
for i in {1..30}; do
    if nc -zv 127.0.0.1 25 > /dev/null 2>&1; then
        echo "[+] SMTP service ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[!] SMTP service failed to start"
    fi
    sleep 1
done

# Start victim simulation Flask app in background
echo "[+] Starting victim simulation service (port 8080)..."
python3 /victim-simulator.py > /var/log/victim-simulator.log 2>&1 &
SIMULATOR_PID=$!

# Wait for Flask app to start
echo "[*] Waiting for victim simulator API (port 8080)..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8080/health > /dev/null 2>&1; then
        echo "[+] Victim simulator API ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[!] Victim simulator API failed to start"
    fi
    sleep 1
done

echo "[+] Victim Endpoint Ready"
echo "[+] Services:"
echo "    - SMTP (receive): 172.20.3.30:25"
echo "    - Simulation API: 172.20.3.30:8080"
echo "    - Hostname: target-ws-sc03"
echo ""
echo "[*] SC-03 Victim Endpoint:"
echo "    - Receives emails from mail relay (172.20.3.20)"
echo "    - Simulates user interactions (open, click, macro exec)"
echo "    - Generates callback beacons on macro execution"
echo "    - Events logged for SIEM integration"
echo ""

# Monitor logs
echo "[*] Monitoring victim simulator..."
tail -f /var/log/victim-simulator.log &
tail -f "$MAIL_LOG"
