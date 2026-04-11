#!/usr/bin/env python3
"""
SC-03 Victim Endpoint Simulator
Simulates user interactions with phishing emails:
- Receives emails via SMTP
- Extracts tracking pixels and links
- Simulates user clicking links
- Simulates macro execution
- Emits SIEM events for callback activity
"""

import os
import sys
import time
import json
import logging
import threading
import random
from datetime import datetime
from email.parser import BytesParser
from flask import Flask, request, jsonify

# Configure logging for SIEM integration
logging.basicConfig(
    format='[%(asctime)s] [VICTIM] %(levelname)s: %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Victim simulation state
EMAILS_RECEIVED = []
CAMPAIGNS_TRACKED = {}
CALLBACKS_SENT = []

class VictimSimulator:
    """Simulates victim endpoint behavior"""

    def __init__(self):
        self.emails = []
        self.callbacks = []
        self.macro_simulated = False

    def simulate_email_open(self, campaign_id, email_from):
        """Simulate victim opening email after 2-5 minutes"""
        delay = random.randint(120, 300)  # 2-5 minutes
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'event_type': 'email_open',
            'campaign_id': campaign_id,
            'sender': email_from,
            'delay_seconds': delay,
            'victim_hostname': 'target-ws-sc03',
            'user': 'user',
            'event_details': f'Email opened from {email_from} after {delay}s delay'
        }

        logger.info(f"[EMAIL_OPEN] Campaign: {campaign_id} | Sender: {email_from} | User: target-ws-sc03")
        CAMPAIGNS_TRACKED[campaign_id] = event
        return event

    def simulate_link_click(self, campaign_id):
        """Simulate victim clicking on phishing link"""
        delay = random.randint(30, 120)  # 30s-2min after open
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'event_type': 'link_click',
            'campaign_id': campaign_id,
            'clicked_url': f'http://172.20.3.10/landing/?cid={campaign_id}',
            'referer': 'Microsoft Outlook',
            'victim_hostname': 'target-ws-sc03',
            'event_details': f'Victim clicked phishing link after {delay}s delay'
        }

        logger.info(f"[LINK_CLICK] Campaign: {campaign_id} | URL: {event['clicked_url']}")
        return event

    def simulate_macro_execution(self, campaign_id):
        """Simulate macro execution in Office document"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'event_type': 'macro_execution',
            'campaign_id': campaign_id,
            'process_name': 'winword.exe',
            'macro_obfuscation': 'base64 encoded PowerShell',
            'parent_process': 'explorer.exe',
            'victim_hostname': 'target-ws-sc03',
            'event_details': 'Office document macro execution detected - possible reverse shell'
        }

        logger.warning(f"[MACRO_EXECUTION] Campaign: {campaign_id} | Process: winword.exe")
        self.macro_simulated = True
        return event

    def simulate_callback_beacon(self, campaign_id, callback_ip):
        """Simulate C2 callback/beacon to attacker infrastructure"""
        timestamp = datetime.utcnow().isoformat()

        event = {
            'timestamp': timestamp,
            'event_type': 'callback_beacon',
            'campaign_id': campaign_id,
            'source_ip': '172.20.3.30',
            'destination_ip': callback_ip,
            'destination_port': 4444,
            'protocol': 'TCP',
            'victim_hostname': 'target-ws-sc03',
            'process_initiating': 'powershell.exe',
            'connection_type': 'reverse shell callback',
            'event_details': f'Suspicious outbound connection to {callback_ip}:4444'
        }

        logger.critical(f"[CALLBACK_BEACON] Campaign: {campaign_id} | Destination: {callback_ip}:4444")
        self.callbacks.append(event)
        return event

# Create global simulator instance
simulator = VictimSimulator()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'victim_simulator': 'ready'}), 200

@app.route('/api/receive-email', methods=['POST'])
def receive_email():
    """Endpoint for mail relay to notify of received email"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    campaign_id = data.get('campaign_id', 'unknown')
    email_from = data.get('from', 'unknown')
    email_subject = data.get('subject', 'No subject')
    has_macro = data.get('has_macro', False)
    callback_ip = data.get('callback_ip', '172.20.3.10')

    logger.info(f"[MAIL_RECEIVED] From: {email_from} | Campaign: {campaign_id} | Subject: {email_subject}")

    # Store email
    email_record = {
        'timestamp': datetime.utcnow().isoformat(),
        'from': email_from,
        'subject': email_subject,
        'campaign_id': campaign_id,
        'has_macro': has_macro
    }
    EMAILS_RECEIVED.append(email_record)

    # Simulate victim interactions asynchronously
    def simulate_victim_chain():
        # Simulate email open (2-5 min delay)
        time.sleep(random.randint(120, 300))
        event1 = simulator.simulate_email_open(campaign_id, email_from)

        # Simulate link click (30s-2min after open)
        time.sleep(random.randint(30, 120))
        event2 = simulator.simulate_link_click(campaign_id)

        # If macro-enabled, simulate execution
        if has_macro:
            time.sleep(random.randint(10, 60))
            event3 = simulator.simulate_macro_execution(campaign_id)

            # Simulate callback beacon
            time.sleep(random.randint(5, 30))
            event4 = simulator.simulate_callback_beacon(campaign_id, callback_ip)

    # Start simulation in background thread
    thread = threading.Thread(target=simulate_victim_chain, daemon=True)
    thread.start()

    return jsonify({
        'status': 'received',
        'campaign_id': campaign_id,
        'victim': 'target-ws-sc03',
        'simulation_scheduled': True
    }), 202

@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """Get status of all campaigns"""
    return jsonify({
        'total_emails_received': len(EMAILS_RECEIVED),
        'campaigns_tracked': CAMPAIGNS_TRACKED,
        'callbacks_received': len(CALLBACKS_SENT),
        'emails': EMAILS_RECEIVED[-10:]  # Last 10 emails
    }), 200

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all simulated events (for SIEM integration)"""
    events = []

    # Collect all events in chronological order
    for email in EMAILS_RECEIVED:
        events.append({
            'type': 'email_received',
            'data': email
        })

    for campaign_id, event in CAMPAIGNS_TRACKED.items():
        events.append({
            'type': event['event_type'],
            'data': event
        })

    for callback in CALLBACKS_SENT:
        events.append({
            'type': 'callback_beacon',
            'data': callback
        })

    # Sort by timestamp
    events.sort(key=lambda x: x['data'].get('timestamp', ''))

    return jsonify(events), 200

@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset simulation state"""
    global EMAILS_RECEIVED, CAMPAIGNS_TRACKED, CALLBACKS_SENT
    EMAILS_RECEIVED = []
    CAMPAIGNS_TRACKED = {}
    CALLBACKS_SENT = []
    simulator.macro_simulated = False

    logger.info("[RESET] Victim simulator state cleared")
    return jsonify({'status': 'reset'}), 200

if __name__ == '__main__':
    logger.info("Starting Victim Endpoint Simulator (SC-03)")
    logger.info("Listening on 0.0.0.0:8080")
    logger.info("Ready to receive emails and simulate victim interactions")

    # Run Flask app
    app.run(host='0.0.0.0', port=8080, debug=False, threaded=True)
