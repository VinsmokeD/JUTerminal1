# Known Limitations and Future Work

This document outlines the technical boundaries, architectural constraints, and future expansion roadmap for the CyberSim training platform. Acknowledging these parameters ensures a realistic assessment of the system's current footprint and sets the course for commercial and academic progression.

---

## 1. Technical & Architectural Limitations

As a single-node sandbox platform designed for local university labs and VPS deployments, CyberSim has several built-in constraints:

### 1.1 Sandbox Resource Overhead
* **Memory & Storage Footprint**: Running full Linux sandboxes (Kali Linux) alongside targets (Samba4 Active Directory, Postfix, MariaDB) and the Elastic Stack (Elasticsearch, Filebeat) requires substantial host memory. Elasticsearch alone requires a minimum of 2 GB heap memory. When 10 concurrent students launch sessions on a single host, memory consumption can exceed 16 GB, causing performance degradation on standard lab hardware.
* **Samba4 AD Initialization Lag**: SC-02 Domain Controller container requires up to 90 seconds to fully register directory services and answer Kerberos requests on first boot. This initialization time creates start-up latency during live classroom session starts.

### 1.2 AI Context & Token Constraints
* **Stateless Token Boundaries**: Socratic AI hints are generated per command or user query. To prevent resource drain and comply with API limits, the system prompt restricts inputs to the last 5 PTY lines and enforces a strict 150-token output limit. This prevents the AI from analyzing complex attack chains spanning multiple hours or remembering student context across session restarts.
* **Rate Limits**: The 10-second request cooldown is necessary to prevent API key exhaustion on OpenRouter but can create minor user friction during rapid scanning cycles.

### 1.3 Single-Node Orchestration Constraints
* **Docker Host Access**: The backend communicates directly with `/var/run/docker.sock` to provision containers. This locks the application to a single Docker host, preventing the platform from scaling horizontally across a cluster of servers to host large multi-class university challenges (e.g., >100 concurrent students).

---

## 2. Future Work & Roadmap

To transition CyberSim from a graduation project prototype to a high-capacity, commercial-grade training platform, the following features are planned for subsequent phases:

### 2.1 Multi-Node Clustering (Kubernetes Migration)
* **Kubernetes Orchestration**: Replace the direct Docker SDK manager with a Kubernetes API integration (`Kube-SDK`). Kali and target environments will be provisioned as isolated Kubernetes Pods under dedicated namespaces.
* **Horizontal Scaling**: Allow the platform to spawn container sandboxes dynamically across multiple physical nodes, enabling scaling to 1,000+ concurrent students for inter-university competitions.

### 2.2 LMS and Academic Integrity Integrations
* **LTI Standard Compliance**: Implement Learning Tools Interoperability (LTI 1.3) to allow CyberSim to plug directly into university Learning Management Systems (LMS) such as Moodle, Canvas, and Blackboard.
* **Grades Synchronization**: Automate the export of final debrief scores, flag capture timestamps, and instructor session reports directly to the LMS gradebook.
* **AI Plagiarism Flags**: Integrate basic heuristic comparisons on command histories to flag students submitting identical sequences of exploit commands within the same timeframe.

### 2.3 Expanded SIEM & Forensics Capabilities
* **Full SIEM Integration (Wazuh / Splunk)**: Expand the Blue Team experience by routing raw target logs directly to a dedicated Wazuh or Splunk instance inside the sandbox network, allowing students to use full Query Languages (Splunk SPL / Elastic KQL) instead of pre-correlated severity alerts.
* **Dynamic Containment Execution**: Enable Blue Team analysts to execute active containment scripts (e.g., locking Active Directory accounts, isolating target IPs, or terminating parent processes) that dynamically alter the Red Team's active environment in real-time.
* **Scenario Customization SDK**: Publish a YAML-based Scenario Spec SDK allowing instructors to write and package custom scenarios with rules, sigma detections, and hint trees.
