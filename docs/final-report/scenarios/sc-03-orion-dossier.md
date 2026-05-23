# Scenario Dossier: SC-03 Orion Logistics

## 1. Overview

| Field | Value |
| --- | --- |
| Scenario ID | SC-03 |
| Scenario title | Orion Logistics Initial Access Lab |
| Difficulty | Beginner to intermediate |
| Estimated duration | 180 minutes |
| Primary focus | Phishing simulation, email telemetry, endpoint-behavior simulation, and SOC response |

SC-03 is the phishing and initial-access scenario in CyberSim. It represents a fictional logistics company with an internal mail relay, a campaign-management service, and a simulated endpoint. The scenario teaches how social-engineering activity and endpoint behavior can be analyzed safely without sending real campaigns or running real malware.

This dossier avoids publishing unsafe payload construction details, live campaign instructions, real target data, or exact solution steps.

## 2. Learning Objectives

Red Team students should learn to:

- Understand how phishing-pretext design works in a controlled classroom simulation.
- Configure a lab-only campaign workflow without targeting real users.
- Record campaign assumptions and evidence responsibly.
- Explain how simulated endpoint behavior creates defensive telemetry.

Blue Team students should learn to:

- Analyze email-header and mail-relay evidence.
- Identify suspicious simulated user-execution events.
- Correlate endpoint activity with email-delivery events.
- Recommend containment and awareness actions based on evidence.

## 3. Target Infrastructure

| Component | Role | Report-safe description |
| --- | --- | --- |
| Orion mail relay | Email simulation | Internal mail service used only inside the SC-03 lab |
| Campaign service | Training campaign management | Lab-only campaign orchestration service |
| Endpoint simulator | Victim behavior simulator | Python-based endpoint model that emits safe telemetry markers |
| Filebeat and Elasticsearch | Telemetry path | Log forwarding and searchable SIEM evidence |

The scenario is deployed only on the SC-03 internal Docker network.

## 4. Methodology Phases

| Phase | Student intent | Evidence expected |
| --- | --- | --- |
| Reconnaissance | Review fictional personas and organizational context | Notes describing target assumptions and scope boundaries |
| Campaign design | Build a safe, lab-only pretext and landing flow | Evidence notes on rationale, expected signals, and ethics |
| Delivery simulation | Trigger controlled mail and endpoint telemetry | SIEM observations and event timestamps |
| Impact analysis | Explain user-execution and callback concepts safely | Report-safe impact statement and recommendations |
| Blue Team response | Triage email, endpoint, and network-like events | Classifications, containment notes, and awareness actions |

## 5. Defensive Telemetry

SC-03 produces defensive evidence such as:

- Mail relay and delivery events.
- Campaign interaction markers.
- Endpoint simulator alerts.
- Callback or beacon-like educational markers.
- Background mail activity for triage realism.

The scenario is designed to teach detection and response reasoning, not real-world social-engineering operations.

## 6. Assessment Evidence

The final report and instructor review can use:

- Campaign-design notes.
- Email and endpoint-event triage.
- Containment actions.
- Time-to-detect and classification evidence.
- Debrief timeline entries.

## 7. Safety Boundary

SC-03 must be described as a simulated phishing lab. It must not include real recipients, live payloads, functional malware, real external infrastructure, or instructions for attacking real organizations.
