import sys
from pathlib import Path

# Setup path so we can import src
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.siem.command_bridge import match_command_events, _is_incomplete_shell_fragment


def test_siem():
    cmd = "nmap -sV 172.20.1.20"
    print("Command:", cmd)
    print("Is incomplete shell fragment:", _is_incomplete_shell_fragment(cmd))
    matches = match_command_events(cmd, "SC-01")
    print("Matched events:")
    for m in matches:
        print(
            f" - ID: {m.get('id')}, Category: {m.get('category')}, Pattern: {m.get('trigger_pattern')}"
        )


if __name__ == "__main__":
    test_siem()
