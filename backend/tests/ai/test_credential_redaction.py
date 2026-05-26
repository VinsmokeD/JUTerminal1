from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.ai.context_builder import redact_lab_credentials_for_prompt


PROMPT = """
Initial user password Password123.
The backup account uses Backup2023!.
NovaMed backup contains P@ssw0rd_NovaMed_2023!.
The web app config contains WebAppPass2024!.
"""


def test_empty_discovered_credentials_redacts_all_lab_credentials() -> None:
    redacted = redact_lab_credentials_for_prompt(PROMPT, [])

    assert redacted.count("<REDACTED:credential>") == 4
    assert "Password123" not in redacted
    assert "Backup2023!" not in redacted
    assert "P@ssw0rd_NovaMed_2023!" not in redacted
    assert "WebAppPass2024!" not in redacted


def test_discovered_credential_is_left_unredacted() -> None:
    redacted = redact_lab_credentials_for_prompt(PROMPT, ["P@ssw0rd_NovaMed_2023!"])

    assert "P@ssw0rd_NovaMed_2023!" in redacted
    assert "Password123" not in redacted
    assert "Backup2023!" not in redacted
    assert "WebAppPass2024!" not in redacted
    assert redacted.count("<REDACTED:credential>") == 3


def test_non_string_discovered_credentials_redacts_all() -> None:
    redacted = redact_lab_credentials_for_prompt(PROMPT, [{"value": "P@ssw0rd_NovaMed_2023!"}])

    assert redacted.count("<REDACTED:credential>") == 4
    assert "P@ssw0rd_NovaMed_2023!" not in redacted
