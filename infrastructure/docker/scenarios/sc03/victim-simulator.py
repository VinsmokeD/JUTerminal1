#!/usr/bin/env python3
"""
SC-03 Victim Endpoint Simulator
Simulates user interactions with phishing emails:
- Polls GoPhish API for campaign events
- Simulates user clicking links after variable delays
- Simulates macro execution
- Emits SIEM events that map to sc03_events.json patterns
"""

import os
import sys
import time
import json
import logging
import threading
import random
import requests
from datetime import datetime
from flask import Flask, jsonify

# Configure logging for SIEM integration
logging.basicConfig(
    format='[%(asctime)s] [VICTIM] %(levelname)s: %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Victim simulation state
EMAILS_RECEIVED = {}
CAMPAIGNS_TRACKED = {}
EVENTS_LOG = []
PROCESSED_RESULTS = set()

# GoPhish API configuration
GOPHISH_API_URL = os.environ.get('GOPHISH_API_URL', 'http://172.20.3.10:3333')
GOPHISH_API_KEY = os.environ.get('GOPHISH_API_KEY', 'admin')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '10'))  # seconds

class VictimSimulator:
    """Simulates victim endpoint behavior"""

    def __init__(self):
        self.processed_emails = set()
        self.active_simulations = {}

    def poll_gophish_campaigns(self):
        """Poll GoPhish API for active campaigns and their status"""
        try:
            headers = {'Authorization': f'Bearer {GOPHISH_API_KEY}'}
            response = requests.get(
                f'{GOPHISH_API_URL}/api/campaigns?limit=100',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                campaigns = response.json()
                logger.info(f"[GOPHISH_POLL] Found {len(campaigns)} campaigns")
                return campaigns
            else:
                logger.warning(f"[GOPHISH_POLL] API returned status {response.status_code}")
                return []
        except Exception as e:
            logger.warning(f"[GOPHISH_POLL] Connection error: {e}")
            return []

    def get_campaign_results(self, campaign_id):
        """Get results for a specific campaign"""
        try:
            headers = {'Authorization': f'Bearer {GOPHISH_API_KEY}'}
            response = requests.get(
                f'{GOPHISH_API_URL}/api/campaigns/{campaign_id}',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                campaign = response.json()
                return campaign.get('results', [])
            return []
        except Exception as e:
            logger.warning(f"[GOPHISH_RESULTS] Error getting results: {e}")
            return []

    def simulate_email_open(self, campaign_id, email_to, campaign_name):
        """Simulate victim opening email (mapped to T1566.002)"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'scenario': 'SC-03',
            'type': 'email_open',
            'source': 'attacker',
            'severity': 'MED',
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'recipient': email_to,
            'event_details': f'Email opened: {email_to}',
            'mitre_technique': 'T1566.002',
            'raw_log': f'Tracking pixel loaded for {email_to} in campaign {campaign_id}',
            'victim_hostname': 'target-ws-sc03'
        }

        EVENTS_LOG.append(event)
        logger.info(f"[EMAIL_OPEN] Campaign: {campaign_name} | Recipient: {email_to}")
        return event

    def simulate_link_click(self, campaign_id, email_to, campaign_name):
        """Simulate victim clicking phishing link (mapped to T1598.003)"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'scenario': 'SC-03',
            'type': 'link_click',
            'source': 'attacker',
            'severity': 'HIGH',
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'user': email_to,
            'clicked_url': f'http://172.20.3.10/landing',
            'event_details': f'Phishing link clicked by {email_to}',
            'mitre_technique': 'T1598.003',
            'raw_log': f'HTTP GET /landing from {email_to} (User-Agent: Mozilla)',
            'victim_hostname': 'target-ws-sc03'
        }

        EVENTS_LOG.append(event)
        logger.info(f"[LINK_CLICK] Campaign: {campaign_name} | User: {email_to}")
        return event

    def simulate_macro_execution(self, campaign_id, email_to, campaign_name):
        """Simulate macro execution in Office document (mapped to T1204.002)"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'scenario': 'SC-03',
            'type': 'macro_execution',
            'source': 'attacker',
            'severity': 'CRITICAL',
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'user': email_to,
            'process': 'winword.exe',
            'parent_process': 'explorer.exe',
            'event_details': 'Office macro execution detected',
            'mitre_technique': 'T1204.002',
            'raw_log': 'Event 4688: Process Creation - winword.exe spawned by explorer.exe',
            'victim_hostname': 'target-ws-sc03'
        }

        EVENTS_LOG.append(event)
        logger.warning(f"[MACRO_EXECUTION] Campaign: {campaign_name} | User: {email_to}")
        return event

    def simulate_powershell_payload(self, campaign_id, email_to, campaign_name):
        """Simulate PowerShell download cradle (mapped to T1059.001)"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'scenario': 'SC-03',
            'type': 'powershell_execution',
            'source': 'attacker',
            'severity': 'CRITICAL',
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'user': email_to,
            'process': 'powershell.exe',
            'command': 'IEX(New-Object System.Net.WebClient).DownloadString(...)',
            'event_details': 'PowerShell download cradle detected',
            'mitre_technique': 'T1059.001',
            'raw_log': 'Event 4688: powershell.exe with suspicious command-line arguments',
            'victim_hostname': 'target-ws-sc03'
        }

        EVENTS_LOG.append(event)
        logger.critical(f"[POWERSHELL_PAYLOAD] Campaign: {campaign_name} | User: {email_to}")
        return event

    def simulate_callback_beacon(self, campaign_id, email_to, campaign_name):
        """Simulate C2 callback/beacon (mapped to T1071.001)"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'scenario': 'SC-03',
            'type': 'callback_beacon',
            'source': 'attacker',
            'severity': 'CRITICAL',
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'initiating_user': email_to,
            'source_ip': '172.20.3.30',
            'destination_ip': '172.20.3.10',
            'destination_port': 4444,
            'protocol': 'TCP',
            'process': 'powershell.exe',
            'event_details': 'C2 beacon callback detected',
            'mitre_technique': 'T1071.001',
            'raw_log': 'Network Connection: powershell.exe -> 172.20.3.10:4444 (ESTABLISHED)',
            'victim_hostname': 'target-ws-sc03'
        }

        EVENTS_LOG.append(event)
        logger.critical(f"[CALLBACK_BEACON] Campaign: {campaign_name} | User: {email_to} -> 172.20.3.10:4444")
        return event

# Create global simulator instance
simulator = VictimSimulator()

def gophish_polling_loop():
    """Background task to poll GoPhish API and simulate victim interactions"""
    logger.info("[GOPHISH_POLLER] Starting GoPhish API polling loop")

    while True:
        try:
            campaigns = simulator.poll_gophish_campaigns()

            for campaign in campaigns:
                campaign_id = campaign.get('id')
                campaign_name = campaign.get('name', 'Unknown')

                if not campaign_id:
                    continue

                # Get campaign results
                results = simulator.get_campaign_results(campaign_id)

                for result in results:
                    email_to = result.get('email', 'unknown')
                    result_id = f"{campaign_id}_{email_to}"

                    # Skip if already processed
                    if result_id in PROCESSED_RESULTS:
                        continue

                    PROCESSED_RESULTS.add(result_id)

                    # Log the email received
                    email_event = {
                        'timestamp': datetime.utcnow().isoformat(),
                        'campaign_id': campaign_id,
                        'campaign_name': campaign_name,
                        'recipient': email_to,
                        'status': result.get('status', 'unknown')
                    }
                    EMAILS_RECEIVED[result_id] = email_event

                    # Simulate victim chain in background
                    def victim_chain(cid, cname, email):
                        try:
                            # Open email after 15-60s
                            delay = random.randint(15, 60)
                            time.sleep(delay)
                            simulator.simulate_email_open(cid, email, cname)

                            # Click link after 10-30s more
                            delay = random.randint(10, 30)
                            time.sleep(delay)
                            simulator.simulate_link_click(cid, email, cname)

                            # Macro execution after 5-15s more (50% chance)
                            if random.random() > 0.5:
                                delay = random.randint(5, 15)
                                time.sleep(delay)
                                simulator.simulate_macro_execution(cid, email, cname)

                                # PowerShell payload after 3-10s more
                                delay = random.randint(3, 10)
                                time.sleep(delay)
                                simulator.simulate_powershell_payload(cid, email, cname)

                                # C2 callback after 2-8s more
                                delay = random.randint(2, 8)
                                time.sleep(delay)
                                simulator.simulate_callback_beacon(cid, email, cname)
                        except Exception as e:
                            logger.error(f"[VICTIM_CHAIN_ERROR] {e}")

                    # Start simulation in background thread
                    thread = threading.Thread(
                        target=victim_chain,
                        args=(campaign_id, campaign_name, email_to),
                        daemon=True
                    )
                    thread.start()
                    logger.info(f"[VICTIM_SIMULATION] Started for {email_to} in campaign {campaign_name}")

            # Poll at regular interval
            time.sleep(POLL_INTERVAL)

        except Exception as e:
            logger.error(f"[GOPHISH_POLLER_ERROR] {e}")
            time.sleep(POLL_INTERVAL)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'victim_simulator': 'ready',
        'gophish_api': GOPHISH_API_URL,
        'events_logged': len(EVENTS_LOG),
        'campaigns_tracked': len(CAMPAIGNS_TRACKED)
    }), 200

@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """Get status of all tracked campaigns"""
    return jsonify({
        'total_emails_received': len(EMAILS_RECEIVED),
        'total_events': len(EVENTS_LOG),
        'emails': list(EMAILS_RECEIVED.values())[-20:]
    }), 200

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all simulated events in chronological order"""
    return jsonify({
        'events': sorted(EVENTS_LOG, key=lambda x: x.get('timestamp', ''))
    }), 200

@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset simulation state"""
    global EMAILS_RECEIVED, CAMPAIGNS_TRACKED, EVENTS_LOG, PROCESSED_RESULTS
    EMAILS_RECEIVED = {}
    CAMPAIGNS_TRACKED = {}
    EVENTS_LOG = []
    PROCESSED_RESULTS = set()

    logger.info("[RESET] Victim simulator state cleared")
    return jsonify({'status': 'reset'}), 200

if __name__ == '__main__':
    logger.info("Starting Victim Endpoint Simulator (SC-03)")
    logger.info(f"GoPhish API URL: {GOPHISH_API_URL}")
    logger.info(f"Polling interval: {POLL_INTERVAL}s")
    logger.info("Listening on 0.0.0.0:8080")

    # Start GoPhish polling thread
    polling_thread = threading.Thread(target=gophish_polling_loop, daemon=True)
    polling_thread.start()
    logger.info("GoPhish polling thread started")

    # Run Flask app
    logger.info("Starting Flask API server...")
    app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
