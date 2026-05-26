from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.scenarios.gatekeeper import check_command


@pytest.mark.parametrize(
    ("command", "expected_tool", "phase"),
    [
        ("sqlmap -u http://target", "sqlmap", "Passive Reconnaissance"),
        ("/usr/bin/sqlmap --batch", "sqlmap", "Passive Reconnaissance"),
        ("hydra -l admin ssh://target", "hydra", "Passive Reconnaissance"),
        ("curl http://target/records?file=../../etc/passwd", None, "Passive Reconnaissance"),
        ("curl 'http://target/path/sqlmap-results.txt'", None, "Passive Reconnaissance"),
        ("echo 'sqlmap is a tool'", None, "Passive Reconnaissance"),
        ("cat /home/student/notes/sqlmap-cheatsheet.md", None, "Passive Reconnaissance"),
        ("grep sqlmap /var/log/*", None, "Passive Reconnaissance"),
    ],
)
def test_gatekeeper_matches_only_executable_token(
    command: str,
    expected_tool: str | None,
    phase: str,
) -> None:
    result = check_command(command, phase)

    if expected_tool is None:
        assert result.blocked is False
    else:
        assert result.blocked is True
        assert result.redirect_message
