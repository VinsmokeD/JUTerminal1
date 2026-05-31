# Scenario Dossier: SC-02 Nexora Financial

## 1. Overview

| Field | Value |
| --- | --- |
| Scenario ID | SC-02 |
| Scenario title | Nexora Financial Domain Lab |
| Difficulty | Advanced |
| Estimated duration | 150 minutes |
| Primary focus | Directory-service security, authentication telemetry, lateral-movement reasoning, and SOC correlation |

SC-02 is the directory-services scenario in Parallax. It represents a fictional financial organization with a domain-controller service and a file-server service. The scenario teaches how identity enumeration, service-account abuse concepts, authentication anomalies, and privileged-access attempts appear in a defensive event stream.

This dossier documents the scenario design without exposing a complete solution path, lab-only passwords, hashes, or exact command sequences.

## 2. Learning Objectives

Red Team students should learn to:

- Enumerate identity and service relationships inside a scoped lab.
- Understand directory-service attack concepts at a controlled educational level.
- Connect methodology phases to evidence collection and reporting.
- Explain privilege-escalation risk without applying the technique outside the lab.

Blue Team students should learn to:

- Analyze authentication and directory-service events.
- Detect abnormal service-ticket and logon patterns.
- Correlate file-share access with identity context.
- Produce a concise domain-compromise investigation summary.

## 3. Target Infrastructure

| Component | Role | Report-safe description |
| --- | --- | --- |
| Nexora domain controller | Identity service | Samba4 Active Directory style domain service on the SC-02 internal network |
| Nexora file server | Shared resource host | SMB-style file service containing fictional business artifacts |
| Filebeat and Elasticsearch | Telemetry path | Forward selected authentication and service logs for Blue Team triage |
| Parallax backend | Scenario engine | Evaluates phase progress, notes, scoring, and SIEM mappings |

The scenario is deployed only on the SC-02 internal Docker network.

## 4. Methodology Phases

| Phase | Student intent | Evidence expected |
| --- | --- | --- |
| Reconnaissance | Identify domain services and reachable shares | Notes describing service observations and scope boundaries |
| Enumeration | Map fictional users, groups, and service relationships | Evidence notes about account roles and access-control assumptions |
| Credential-risk reasoning | Analyze service-account exposure concepts | Report-safe explanation of risk, without including recovered secrets |
| Privilege-impact analysis | Explain the effect of excessive privileges | Impact statement and defensive recommendations |
| Blue Team response | Triage authentication and lateral-access events | SIEM classification, containment notes, and timeline evidence |

## 5. Defensive Telemetry

SC-02 produces defensive evidence such as:

- Authentication failures and successful logons.
- Service-ticket request patterns.
- File-share access events.
- Privilege-change or replication-style alert categories.
- Background authentication traffic that simulates normal employee activity.

The defensive goal is not only to see a single alert. Students must build a sequence of events that explains identity, host, time, and action.

## 6. Assessment Evidence

The final report and instructor review can use:

- Methodology notes for identity enumeration and access analysis.
- SIEM triage decisions for authentication events.
- Timeline evidence linking Red Team activity to Blue Team observations.
- Hint usage and methodology-gating records.
- Generated debrief summaries.

## 7. Safety Boundary

SC-02 must be presented as a fictional, internal-only directory-services lab. The report should redact lab credentials, password material, hashes, and exact offensive command chains.
