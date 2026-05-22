from src.siem.command_bridge import match_command_events


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
