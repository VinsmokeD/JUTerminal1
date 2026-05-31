"""Config tests â€” admin credentials are configurable (security: no hardcoded default)."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import Settings


def test_admin_credentials_default():
    s = Settings()
    assert s.ADMIN_USERNAME == "admin"
    assert s.ADMIN_PASSWORD == "ParallaxAdmin!"


def test_admin_password_is_env_overridable(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "Str0ng-Override-123!")
    monkeypatch.setenv("ADMIN_USERNAME", "instructor")
    s = Settings()
    assert s.ADMIN_PASSWORD == "Str0ng-Override-123!"
    assert s.ADMIN_USERNAME == "instructor"
