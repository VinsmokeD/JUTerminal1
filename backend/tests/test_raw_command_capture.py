"""
Unit tests for server-side command reconstruction from the raw PTY stream.

``_extract_commands_from_raw`` is the authoritative, browser-extraction-
independent source of completed commands feeding the SIEM bridge, AI tutor,
discovery tracker and phase engine. These tests pin its line-editing and
escape-sequence handling so a regression can't silently re-break SIEM capture.
"""

from __future__ import annotations

from src.ws.routes import _extract_commands_from_raw


def _fresh():
    return {"buf": "", "esc": 0, "tainted": False}


def _feed(stream: str):
    """Feed a whole stream one chunk and return completed commands + final state."""
    state = _fresh()
    out = _extract_commands_from_raw(state, stream)
    return out, state


def test_simple_command_on_enter():
    out, _ = _feed("whoami\r")
    assert out == ["whoami"]


def test_command_with_args():
    out, _ = _feed("nmap -sV 172.20.1.20\r")
    assert out == ["nmap -sV 172.20.1.20"]


def test_no_enter_yields_nothing_but_buffers():
    out, state = _feed("curl http://x")
    assert out == []
    assert state["buf"] == "curl http://x"


def test_keystrokes_accumulate_across_calls():
    state = _fresh()
    for ch in "id":
        assert _extract_commands_from_raw(state, ch) == []
    assert _extract_commands_from_raw(state, "\r") == ["id"]


def test_backspace_edits_buffer():
    # type "lss", delete one, finish "ls -la"
    out, _ = _feed("lss\x7f -la\r")
    assert out == ["ls -la"]


def test_ctrl_c_aborts_command():
    out, _ = _feed("rm -rf /\x03ls\r")
    assert out == ["ls"]


def test_ctrl_u_clears_line():
    out, _ = _feed("garbage\x15whoami\r")
    assert out == ["whoami"]


def test_arrow_key_escape_sequence_ignored():
    # ESC [ C is right-arrow; must not pollute the captured command
    out, _ = _feed("ls\x1b[Cab\r")
    assert out == ["lsab"]


def test_tab_completion_taints_and_is_skipped():
    # Tab-resolved text only exists in the PTY echo, not the input stream,
    # so the server-side path defers to the browser screen-scrape for it.
    out, _ = _feed("cat /etc/pass\t\r")
    assert out == []


def test_tab_taint_resets_after_enter():
    out, _ = _feed("cat /etc/pass\t\rwhoami\r")
    assert out == ["whoami"]


def test_multiple_commands_in_one_stream():
    out, _ = _feed("whoami\rid\rpwd\r")
    assert out == ["whoami", "id", "pwd"]


def test_crlf_does_not_double_emit():
    out, _ = _feed("whoami\r\n")
    assert out == ["whoami"]


def test_blank_enter_emits_nothing():
    out, _ = _feed("\r\r")
    assert out == []
