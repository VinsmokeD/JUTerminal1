# CyberSim Instructor Manual

## 1. Purpose

This manual explains how an instructor can supervise CyberSim sessions, review student progress, and use generated evidence for assessment. It is written for university labs, project demonstrations, and controlled classroom exercises.

## 2. Instructor Responsibilities

Instructors should:

- Assign the correct scenario and role.
- Confirm that students understand the lab-only Rules of Engagement.
- Monitor session progress and hint usage.
- Review notes, SIEM triage, and debrief outputs.
- Export or record grade evidence according to course policy.
- Stop any activity that moves outside the CyberSim lab boundary.

## 3. Instructor Dashboard

The Instructor Dashboard provides an overview of class progress and session status.

| Area | Purpose |
| --- | --- |
| Session list | Shows active and completed sessions |
| Student metrics | Shows score, phase, role, and progress indicators |
| Hint usage | Identifies students who may need support |
| Reports | Provides access to session summaries for grading |
| Analytics | Highlights common weak phases and learning patterns |

The dashboard is role-protected and should only be available to instructor accounts.

## 4. Monitoring a Lab

Recommended live-lab process:

1. Start the Docker stack and required scenario profile before class.
2. Run the readiness check.
3. Confirm students can sign in and open the Dashboard.
4. Watch active sessions for stalled phases or repeated hint usage.
5. Encourage students to write evidence notes before advancing.
6. Review final Debrief output after the session.

## 5. Assessment Guidance

Suggested assessment dimensions:

| Dimension | What to evaluate |
| --- | --- |
| Methodology | Did the student follow the required phases? |
| Evidence quality | Are notes clear, timestamped, and tied to observations? |
| Technical reasoning | Does the student explain cause and effect correctly? |
| Defensive analysis | Did the student classify and correlate SIEM events accurately? |
| Safety | Did the student remain inside the lab scope? |
| Reflection | Does the debrief identify lessons learned and improvements? |

## 6. Interpreting Hint Usage

Hint usage should not automatically mean failure. It should be interpreted as learning evidence:

- Low-level hints may show normal exploration.
- Repeated deeper hints may indicate a weak methodology phase.
- Hint usage paired with improved notes can show productive learning.
- Hint usage without evidence notes may indicate guessing.

## 7. Operations Checks

Before a graded session, instructors or maintainers should run:

```bash
docker compose config --quiet
python scripts/demo_check.py --scenarios all
```

If the full scenario stack is not running, use the core readiness check first, then start only the required scenario profile.

## 8. Safety and Privacy

Instructor exports and screenshots should redact:

- API keys and bearer tokens.
- Lab-only passwords.
- Exact scenario solution chains.
- Student personal information not required for grading.

CyberSim should be presented as an isolated learning platform, not as an unrestricted offensive toolkit.
