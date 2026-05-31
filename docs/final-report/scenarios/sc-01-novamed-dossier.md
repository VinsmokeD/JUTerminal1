# Scenario Dossier: SC-01 NovaMed Healthcare

## 1. Overview

| Field | Value |
| --- | --- |
| Scenario ID | SC-01 |
| Scenario title | NovaMed Healthcare Portal |
| Difficulty | Intermediate |
| Estimated duration | 240 minutes |
| Primary focus | Web application security, OWASP-style testing, WAF telemetry, and healthcare-data handling |

SC-01 is the web application scenario in Parallax. It represents a fictional healthcare portal with a web tier, WAF layer, and database-backed application state. The scenario teaches students how web reconnaissance, input validation weaknesses, authorization mistakes, and file-access anomalies appear from both Red Team and Blue Team perspectives.

The report version of this dossier intentionally avoids solution commands, flags, and lab-only secrets. It documents the scenario design, learning intent, telemetry, and evidence expectations.

## 2. Learning Objectives

Red Team students should learn to:

- Perform scoped web reconnaissance against a lab-only target.
- Identify web application weakness classes without attacking real systems.
- Record findings with enough detail for an examiner or defender to reproduce the reasoning.
- Understand how WAF and application logs reflect probing and exploitation attempts.

Blue Team students should learn to:

- Triage WAF events, web access anomalies, and database-related signals.
- Distinguish background traffic from attacker-driven events.
- Correlate a web request pattern with a scenario phase and student note.
- Produce a concise incident response summary from SIEM and notebook evidence.

## 3. Target Infrastructure

| Component | Role | Report-safe description |
| --- | --- | --- |
| NovaMed WAF | Gateway and detection point | ModSecurity-style filtering, audit logging, and request inspection |
| NovaMed web application | Primary target application | PHP/Apache-style healthcare portal with deliberately vulnerable educational routes |
| NovaMed database | Data tier | MariaDB-style backing store with simulated patient and administrative records |
| Filebeat and Elasticsearch | Telemetry path | Log forwarding and searchable SIEM evidence |

The scenario is deployed only on the SC-01 internal Docker network. It is not reachable as a real public healthcare system.

## 4. Methodology Phases

| Phase | Student intent | Evidence expected |
| --- | --- | --- |
| Reconnaissance | Map visible services and application behavior | Notes describing observed hosts, HTTP responses, and visible application surfaces |
| Enumeration | Identify candidate routes, forms, and access-control boundaries | Notes tagging routes, parameters, and observed errors |
| Exploitation reasoning | Validate weakness classes inside the lab scope | Concise finding notes and SIEM observations, without publishing unsafe payload strings |
| Impact analysis | Explain what the weakness would mean for a fictional organization | Report-ready impact statement and recommended controls |
| Blue Team response | Triage, classify, and summarize detected activity | Event classifications, response notes, and debrief evidence |

## 5. Defensive Telemetry

SC-01 produces defensive evidence such as:

- WAF alerts for suspicious request patterns.
- HTTP status-code spikes caused by enumeration.
- File-access anomalies.
- Authentication and database-related warnings.
- Background web traffic that students must filter out during triage.

The Blue Team workflow uses these signals to explain the causal link between student actions and SIEM observations.

## 6. Assessment Evidence

The final report and instructor review can use:

- Student notes tagged as findings or evidence.
- SIEM events and triage decisions.
- Scenario phase history.
- Hint usage metadata.
- Debrief timeline entries.
- Report summaries generated after the session.

## 7. Safety Boundary

SC-01 must always be described as a fictional, internal-only lab. The report should not include real-world target domains, live exploit payloads, lab-only credentials, or exact flag values.
