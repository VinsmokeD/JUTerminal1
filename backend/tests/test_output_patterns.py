import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_banner_does_not_trigger_domain_admin_insight():
    chunk = "RED OBJECTIVE:  Kerberoast svc_backup, crack hash, DCSync as Domain Admin\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = scan_output_chunk("test-sess", "SC-02", chunk)
    assert all(i.get("id") != "sc02-domain-admin" for i in insights)


def test_real_domain_admin_line_triggers_insight():
    chunk = "memberOf=CN=Domain Admins,CN=Users,DC=nexora,DC=local\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = scan_output_chunk("test-sess-2", "SC-02", chunk)
    assert any(i.get("id") == "sc02-domain-admin" for i in insights)


def test_option_alone_shell_error_gets_recovery_insight():
    chunk = "bash: -dc-ip: command not found\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = scan_output_chunk("test-sess-3", "SC-02", chunk)
    assert any(i.get("id") == "shell-option-alone" for i in insights)


def test_missing_rockyou_gets_wordlist_recovery_insight():
    chunk = "/usr/share/wordlists/rockyou.txt: No such file or directory\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = scan_output_chunk("test-sess-4", "SC-02", chunk)
    assert any(i.get("id") == "wordlist-missing" for i in insights)
