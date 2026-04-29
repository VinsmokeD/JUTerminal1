# Scenario Index

CyberSim's active defense scope contains exactly three training scenarios. SC-04 and SC-05 are historical planning artifacts only and are not launchable in the current MVP.

## Active Scenarios

| ID | Name | Focus | Difficulty | Duration | Red Team Skills | Blue Team Skills |
| --- | --- | --- | --- | --- | --- | --- |
| SC-01 | NovaMed Healthcare | Web application security | Intermediate | 60 min | Reconnaissance, SQL injection, LFI, IDOR | Web log triage, anomaly detection, event correlation |
| SC-02 | Nexora Financial AD | Active Directory compromise | Advanced | 90 min | Enumeration, Kerberoasting, lateral movement | Domain logon analysis, Kerberos alerts, DCSync detection |
| SC-03 | Orion Logistics | Phishing and OSINT | Intermediate | 75 min | OSINT, phishing campaign setup, credential capture | Email header analysis, phishing triage, IOC collection |

## SC-01: NovaMed Healthcare Portal

NovaMed is a vulnerable healthcare portal used to teach web application testing and SOC visibility.

Core red-team objectives:

- Identify web technologies and exposed routes.
- Discover authentication and input-handling weaknesses.
- Validate SQL injection, LFI, IDOR, and file-upload findings inside the isolated target.
- Document requests, evidence, and impact.

Core blue-team objectives:

- Detect scanning and directory enumeration.
- Investigate SQL injection attempts and abnormal application errors.
- Track suspicious file access and authentication behavior.
- Build an incident timeline from SIEM events and notes.

Files:

- Spec: `docs/scenarios/SC-01-webapp-pentest.md`
- Config: `docs/scenarios/SC-01-webapp-pentest.yaml`
- Hints: `backend/src/scenarios/hints/sc01_hints.json`
- SIEM events: `backend/src/siem/events/sc01_events.json`
- Docker target: `infrastructure/docker/scenarios/sc01/`

## SC-02: Nexora Financial AD

Nexora is an Active Directory lab for practicing enterprise compromise and defender-side correlation.

Core red-team objectives:

- Enumerate users, services, and domain relationships.
- Identify and abuse weak Kerberos/service-account configuration.
- Move laterally through the simulated domain.
- Document credential use and privilege escalation.

Core blue-team objectives:

- Detect LDAP and Kerberos enumeration patterns.
- Investigate suspicious logon behavior and account abuse.
- Correlate lateral movement with Windows-style telemetry.
- Build a domain compromise timeline.

Files:

- Config: `docs/scenarios/SC-02-ad-compromise.yaml`
- Hints: `backend/src/scenarios/hints/sc02_hints.json`
- SIEM events: `backend/src/siem/events/sc02_events.json`
- Docker target: `infrastructure/docker/scenarios/sc02/`

## SC-03: Orion Logistics Phishing

Orion is a phishing and initial-access scenario focused on safe social-engineering simulation.

Core red-team objectives:

- Gather OSINT from simulated sources.
- Prepare a controlled phishing campaign.
- Capture training credentials inside the isolated environment.
- Document payload decisions and campaign results.

Core blue-team objectives:

- Analyze email headers and suspicious links.
- Track credential submission indicators.
- Investigate mail relay and endpoint-style events.
- Build a phishing incident report.

Files:

- Config: `docs/scenarios/SC-03-phishing.yaml`
- Hints: `backend/src/scenarios/hints/sc03_hints.json`
- SIEM events: `backend/src/siem/events/sc03_events.json`
- Docker target: `infrastructure/docker/scenarios/sc03/`

## Recommended Order

1. SC-01 for web testing fundamentals and immediate Red-to-Blue telemetry.
2. SC-03 for phishing workflow and email investigation practice.
3. SC-02 for advanced Active Directory compromise and detection.

## Runtime Notes

- Start the core platform with `docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx`.
- Start only the scenario target you need, for example `docker compose --profile sc01 up -d`.
- The scenario catalog API should return exactly SC-01, SC-02, and SC-03.
- All targets run on isolated Docker networks and must not be used against real systems.

## Support

- Maintained docs: `docs/README.md`
- Setup: `docs/SETUP.md`
- Architecture: `docs/ARCHITECTURE.md`
- GitHub issues: `https://github.com/VinsmokeD/JUTerminal1/issues`

**Status**: SC-01 through SC-03 are the active CyberSim defense scope.  
**Last Updated**: 2026-04-29
