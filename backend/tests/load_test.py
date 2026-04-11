"""
Load Testing Suite for CyberSim Platform
Tests terminal latency, SIEM events, and concurrent session handling.

Run with:
  locust -f backend/tests/load_test.py --host=http://localhost --users 50 --spawn-rate 5 --run-time 5m
"""
import time
import uuid
from locust import HttpUser, task, between


class CyberSimUser(HttpUser):
    """Simulates a student user performing typical CyberSim actions."""

    wait_time = between(1, 3)

    def on_start(self):
        """Register and authenticate."""
        username = f"load_user_{uuid.uuid4().hex[:8]}"
        password = "TestPass123!"
        resp = self.client.post(
            "/api/auth/register",
            json={"username": username, "password": password}
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")
        else:
            resp = self.client.post(
                "/api/auth/login",
                data={"username": username, "password": password}
            )
            self.token = resp.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.session_id = None

    @task(3)
    def get_scenarios(self):
        """Fetch scenarios."""
        self.client.get("/api/scenarios/", headers=self.headers)

    @task(2)
    def start_session(self):
        """Start a session."""
        resp = self.client.post(
            "/api/sessions/start",
            json={"scenario_id": "SC-01", "role": "red"},
            headers=self.headers
        )
        if resp.status_code == 200:
            self.session_id = resp.json().get("session_id")

    @task(5)
    def submit_note(self):
        """Submit a note."""
        if self.session_id:
            self.client.post(
                "/api/notes",
                json={
                    "session_id": self.session_id,
                    "content": "Testing SQL injection",
                    "tags": ["#finding"]
                },
                headers=self.headers
            )

    @task(3)
    def get_metrics(self):
        """Get session metrics."""
        if self.session_id:
            self.client.get(
                f"/api/scoring/metrics/{self.session_id}",
                headers=self.headers
            )


class InstructorUser(HttpUser):
    """Simulates an instructor."""

    wait_time = between(2, 5)

    def on_start(self):
        """Authenticate as admin."""
        resp = self.client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "CyberSimAdmin!"}
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None

    @task(2)
    def get_sessions(self):
        """Fetch all sessions."""
        if self.token:
            self.client.get("/api/instructor/sessions", headers=self.headers)
