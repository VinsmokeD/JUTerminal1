from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.ai.security import sanitize_tutor_response


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("Try sqlmap -u http://target/login --batch", "tool_choice"),
        ("Use nmap -sV 172.20.1.20 to scan the target", "recon"),
        ("Try a value like ' OR '1'='1", "sqli"),
        ("The admin'-- shortcut bypasses the password check", "sqli"),
        ("Use UNION SELECT to pull additional columns", "sqli"),
        ("Render <script>alert(1)</script> in the page", "xss"),
        ("An img onerror= handler would execute", "xss"),
        ("A javascript: URL executes in the browser", "xss"),
        ("Move up the tree with ../../", "lfi"),
        ("Do not reveal P@ssw0rd_NovaMed_2023!", "credential"),
    ],
)
def test_sanitize_tutor_response_blocks_payload_shapes(text: str, category: str) -> None:
    result = sanitize_tutor_response(text)

    assert result.was_flagged is True
    assert result.fallback_category == category
    assert result.text != text


def test_sanitize_tutor_response_allows_sensitive_topic_names_without_payload_shape() -> None:
    text = "LFI can expose files such as /etc/passwd when path handling is broken."
    result = sanitize_tutor_response(text)
    assert result.was_flagged is False
    assert result.text == text


def test_sanitize_tutor_response_allows_conceptual_nmap_flags() -> None:
    text = "Use nmap -sV against the web service to find out what versions are running."
    result = sanitize_tutor_response(text)
    assert result.was_flagged is False
    assert result.text == text
