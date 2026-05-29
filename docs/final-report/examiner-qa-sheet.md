# Examiner Q&A Sheet

This document compiles anticipated questions from the University of Jordan KASIT graduation project defense panel, along with technically precise, examiner-credible answers.

---

## 1. Sandbox Security & Isolation

### Q1: "Since you are letting students run active pentesting tools inside a terminal, how do you prevent them from attacking the university network or escaping the container?"
* **Answer**: "We enforce network-level air-gapping by configuring all scenario networks in Docker Compose with `internal: true`. This prevents the creation of default routing rules to the host's external network gateway. No container inside a scenario network can route packets to `0.0.0.0/0` (the internet) or other host subnets. Furthermore, the Docker UNIX socket (`/var/run/docker.sock`) is not mounted inside the student's Kali container. The backend communicates with the Docker API via the host shell, exposing only the PTY stream. There is no route for container breakout."

### Q2: "What happens if a student runs a resource-intensive command like a massive fork bomb or heavy multi-threaded scanning that crashes the host?"
* **Answer**: "We limit CPU and RAM at the container runtime level. The backend uses the Docker SDK to provision containers with strict limits: `cpus: 0.5` (max 50% of a single core) and `mem_limit: 512m` (512 megabytes). These constraints are enforced at the Linux kernel level via `cgroups`. If a container exceeds these limits, the kernel kills the runaway processes or throttles CPU cycles, keeping the host OS unaffected."

---

## 2. Telemetry Ingestion & Correlation

### Q3: "How does the Blue Team SIEM dashboard receive events? Are you polling files, or is it real-time?"
* **Answer**: "We support two telemetry paths. Real container logs (like WAF audit logs and Active Directory events) are collected in real-time by a Filebeat daemon container that monitors target container log directories. Filebeat ships these events directly to Elasticsearch. Our backend runs an async SIEM poller engine that checks Elasticsearch every 2 seconds, correlating alerts against predefined Sigma-like rules. For immediate pedagogical feedback, we also run an `educational_bridge` in our backend. When a student submits a command, it is parsed by `command_bridge.py`, written to the DB, and immediately published to a Redis pub/sub channel. The frontend subscribes to this channel over WebSockets, displaying the alert within milliseconds."

### Q4: "Why did you build a custom bridge instead of relying purely on Filebeat and Elasticsearch?"
* **Answer**: "Relying purely on Filebeat and Elasticsearch creates log propagation delays (typically 2 to 5 seconds due to buffer flushes and polling intervals). While acceptable in a commercial SOC, a 5-second delay in an educational environment makes it harder for students to immediately associate an offensive action with its defensive signal. The bridge provides immediate feedback, while Filebeat provides realistic, unfiltered background logs."

---

## 3. Socratic AI & Prompt Security

### Q5: "If the student asks the AI for the exact flag or password to complete the mission, how do you prevent the AI from giving away the answer?"
* **Answer**: "We implement a graduated prompt hierarchy and rigid validation checks. In `CHALLENGE` mode, the system prompt strictly forbids the model from outputting terminal command strings, payload fragments, or lab passwords. Furthermore, we run regex checks on the LLM output before routing it to the WebSocket. If the model accidentally leaks a flag hash (e.g., matching the pattern `FLAG-SC0X-X`), the backend blocks the frame and returns a generic Socratic redirection message instead."

### Q6: "How do you handle rate-limiting and cost control for the AI monitor?"
* **Answer**: "AI Monitor calls are rate-limited to one request per 10 seconds per session, tracked via Redis key TTLs. We migrated from the native Gemini SDK to **OpenRouter**, targeting the `deepseek/deepseek-chat-v3-0324` model. This model offers high-fidelity, instruction-following output at a cost of ~$0.27 per million tokens, reducing demo and deployment costs by over 90% compared to GPT-4o."

---

## 4. Platform Performance & Scale

### Q7: "If 100 students start a lab session simultaneously, how will the database handle the write volume for command logging and notes?"
* **Answer**: "We use a unified asynchronous stack. The FastAPI service is built on Python's `asyncio` event loop. Database connections are pooled using SQLAlchemy's `asyncpg` driver, enabling concurrent non-blocking PostgreSQL writes. During Locust load testing, the database handled concurrent note writes from 100 simulated users with a median latency of **12 ms**, well within normal operations."
