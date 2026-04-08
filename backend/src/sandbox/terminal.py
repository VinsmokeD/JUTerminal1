"""
Terminal proxy: bidirectional bridge between the Docker exec stream and Redis channels.

Uses SYNCHRONOUS Redis (redis.Redis) inside background threads to avoid the
cross-event-loop issue that arises when the singleton aioredis.Redis client
(created on the main FastAPI loop) is awaited from a thread-local loop.

Data flow:
  Browser → WS → Redis PUBLISH terminal:{id}:input
                                   ↓
                      _redis_to_docker thread reads & sends to Docker exec socket
  Docker exec socket → _docker_to_redis thread → Redis PUBLISH terminal:{id}:output
                                                                  ↓
                                           WS handler → browser xterm.js
"""
from __future__ import annotations

import json
import select as _select
import threading

try:
    import docker
    _docker_available = True
except ImportError:
    _docker_available = False

import redis as sync_redis  # synchronous client, part of redis[hiredis] already installed

from src.config import settings
from src.cache.redis import _get as get_async_redis

# Track active proxy threads — prevent duplicate sessions
_active_sessions: set[str] = set()
_active_sessions_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Public async API (called from ws/routes.py — main event loop)
# ---------------------------------------------------------------------------

async def send_terminal_input(session_id: str, data: str) -> None:
    """Publish keyboard input to Redis so the proxy thread can forward it to Docker."""
    redis = get_async_redis()
    await redis.publish(f"terminal:{session_id}:input", json.dumps({"data": data}))


async def stream_terminal_output(session_id: str, container_id: str, scenario_id: str = "SC-01") -> None:
    """
    Start a background thread that proxies Docker exec <-> Redis.
    Idempotent — subsequent calls for the same session_id are no-ops.
    Falls back to an interactive mock terminal when Docker is unavailable.
    """
    if container_id.startswith("mock-"):
        await _mock_stream(session_id, scenario_id)
        return

    with _active_sessions_lock:
        if session_id in _active_sessions:
            return  # Already running
        _active_sessions.add(session_id)

    threading.Thread(
        target=_terminal_proxy_thread,
        args=(session_id, container_id, scenario_id),
        daemon=True,
        name=f"terminal-proxy-{session_id[:8]}",
    ).start()


# ---------------------------------------------------------------------------
# Sync helpers used inside background threads
# ---------------------------------------------------------------------------

def _make_sync_redis() -> sync_redis.Redis:
    """Open a fresh synchronous Redis connection for use in a background thread."""
    return sync_redis.from_url(settings.REDIS_URL, decode_responses=True)


def _terminal_proxy_thread(session_id: str, container_id: str, scenario_id: str = "SC-01") -> None:
    """
    Background thread: duplex proxy between Docker exec PTY and Redis channels.

    Two child threads are spawned:
      _docker_to_redis — reads Docker socket, publishes to terminal:{id}:output
      _redis_to_docker  — subscribes to terminal:{id}:input, writes to Docker socket

    The parent thread blocks on stop_event and then cleans up.
    """
    exec_sock = None
    raw_sock = None
    stop_event = threading.Event()

    try:
        if not _docker_available:
            raise RuntimeError("docker SDK not installed")

        client = docker.from_env()
        container = client.containers.get(container_id)

        exec_id = client.api.exec_create(
            container.id,
            ["/bin/bash"],
            stdin=True,
            tty=True,
            environment={"TERM": "xterm-256color"},
        )

        exec_sock = client.api.exec_start(exec_id, socket=True, tty=True)
        # docker-py CancellableStream exposes the raw socket via ._sock
        raw_sock = exec_sock._sock
        raw_sock.setblocking(True)

        # Send scenario banner on first connect so student sees targets immediately
        r_init = _make_sync_redis()
        banner = _build_banner(scenario_id) if scenario_id else ""
        if banner:
            r_init.publish(f"terminal:{session_id}:output", json.dumps({"data": banner}))
        r_init.close()

        # ── Thread A: Docker stdout → Redis publish ──────────────────────
        def _docker_to_redis() -> None:
            r = _make_sync_redis()
            while not stop_event.is_set():
                try:
                    # 1-second select timeout lets us honour stop_event promptly
                    ready, _, _ = _select.select([raw_sock], [], [], 1.0)
                    if not ready:
                        continue
                    data = raw_sock.recv(4096)
                    if not data:
                        break
                    chunk = data.decode("utf-8", errors="replace")
                    r.publish(f"terminal:{session_id}:output", json.dumps({"data": chunk}))
                    # Rolling history (capped at 500 entries) for reconnect replay
                    pipe = r.pipeline()
                    pipe.lpush(f"terminal:{session_id}:history", chunk)
                    pipe.ltrim(f"terminal:{session_id}:history", 0, 499)
                    pipe.execute()
                except Exception:
                    break
            stop_event.set()  # Signal the sibling thread to exit too

        # ── Thread B: Redis subscribe → Docker stdin ─────────────────────
        def _redis_to_docker() -> None:
            r = _make_sync_redis()
            pub = r.pubsub(ignore_subscribe_messages=True)
            pub.subscribe(f"terminal:{session_id}:input")
            try:
                for message in pub.listen():
                    if stop_event.is_set():
                        break
                    if message and message.get("type") == "message":
                        try:
                            payload = json.loads(message["data"])
                            text = payload.get("data", "")
                            if text:
                                raw_sock.sendall(text.encode("utf-8"))
                        except Exception:
                            break
            finally:
                try:
                    pub.unsubscribe()
                    pub.close()
                except Exception:
                    pass
            stop_event.set()

        read_thread = threading.Thread(target=_docker_to_redis, daemon=True)
        write_thread = threading.Thread(target=_redis_to_docker, daemon=True)
        read_thread.start()
        write_thread.start()

        stop_event.wait()  # Block until one side exits, then clean up

    except Exception as exc:
        if settings.ENVIRONMENT == "development":
            print(f"[Terminal] Proxy error for session {session_id[:8]}: {exc}")
    finally:
        stop_event.set()
        with _active_sessions_lock:
            _active_sessions.discard(session_id)
        try:
            if exec_sock is not None:
                exec_sock.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Mock stream (dev without Docker)
# ---------------------------------------------------------------------------

# Scenario target metadata used by both mock terminal and banner
SCENARIO_TARGETS: dict[str, dict] = {
    "SC-01": {
        "name": "NovaMed Healthcare",
        "network": "172.20.1.0/24",
        "targets": [
            ("172.20.1.20", "PHP/Apache webapp (NovaMed Patient Portal)"),
            ("172.20.1.21", "MySQL Database Server"),
            ("172.20.1.1", "ModSecurity WAF / Gateway"),
        ],
        "objective_red": "Achieve RCE via chained OWASP vulnerabilities (SQLi, LFI, File Upload)",
        "objective_blue": "Monitor WAF logs, triage alerts, write IR report",
        "domain": None,
    },
    "SC-02": {
        "name": "Nexora Financial",
        "network": "172.20.2.0/24",
        "targets": [
            ("172.20.2.20", "Samba4 Active Directory Domain Controller (nexora.local)"),
            ("172.20.2.40", "File Server — Finance + Public shares"),
        ],
        "objective_red": "Kerberoast svc_backup, crack hash, DCSync as Domain Admin",
        "objective_blue": "Detect Event 4769 RC4 downgrades, track lateral movement",
        "domain": "nexora.local",
        "creds": "jsmith : Welcome1!",
    },
    "SC-03": {
        "name": "Orion Logistics",
        "network": "172.20.3.0/24",
        "targets": [
            ("172.20.3.40", "GoPhish (Phishing campaign management)"),
            ("172.20.3.20", "Postfix Mail Server"),
            ("172.20.3.30", "Simulated Windows endpoint"),
        ],
        "objective_red": "Craft phishing campaign, achieve callback from victim endpoint",
        "objective_blue": "Email header analysis, SPF/DKIM validation, detect macro execution",
        "domain": None,
    },
}


def _build_banner(scenario_id: str) -> str:
    """Build a Kali-style MOTD banner showing scenario targets and objectives."""
    info = SCENARIO_TARGETS.get(scenario_id.upper(), SCENARIO_TARGETS["SC-01"])
    lines = [
        "",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        f"\x1b[1;37m  CyberSim Training Platform — \x1b[1;31m{info['name']}\x1b[0m",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        "",
        f"\x1b[1;33m  NETWORK:\x1b[0m  {info['network']}",
        "\x1b[1;33m  TARGETS:\x1b[0m",
    ]
    for ip, desc in info["targets"]:
        lines.append(f"    \x1b[1;32m{ip:<18}\x1b[0;36m{desc}\x1b[0m")
    if info.get("domain"):
        lines.append(f"\x1b[1;33m  DOMAIN:\x1b[0m   {info['domain']}")
    if info.get("creds"):
        lines.append(f"\x1b[1;33m  CREDS:\x1b[0m    {info['creds']}")
    lines.append("")
    lines.append(f"\x1b[1;31m  RED OBJECTIVE:\x1b[0m  {info['objective_red']}")
    lines.append(f"\x1b[1;36m  BLUE OBJECTIVE:\x1b[0m {info['objective_blue']}")
    lines.append("")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    lines.append("\x1b[0;33m  Type commands to interact. Tools: nmap, gobuster, sqlmap, etc.\x1b[0m")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    lines.append("")
    return "\r\n".join(lines)


_KALI_PROMPT = "\x1b[1;31m┌──(\x1b[1;34mstudent㉿kali\x1b[1;31m)-[\x1b[1;37m~\x1b[1;31m]\r\n└─\x1b[1;34m$\x1b[0m "


def _mock_command_output(command: str, scenario_id: str) -> str:
    """Simulate realistic Kali terminal output for common commands."""
    cmd = command.strip()
    first = cmd.split()[0].lower() if cmd else ""
    info = SCENARIO_TARGETS.get(scenario_id.upper(), SCENARIO_TARGETS["SC-01"])
    targets = info["targets"]
    network = info["network"]

    if first in ("whoami",):
        return "student\r\n"
    if first in ("id",):
        return "uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)\r\n"
    if first in ("hostname",):
        return "kali\r\n"
    if first in ("pwd",):
        return "/home/student\r\n"
    if first in ("uname",):
        return "Linux kali 6.1.0-kali9-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\r\n"
    if first in ("date",):
        import datetime
        return datetime.datetime.now().strftime("%a %b %d %H:%M:%S %Z %Y") + "\r\n"
    if first in ("ip",) and "addr" in cmd:
        return (
            "1: lo: <LOOPBACK,UP> mtu 65536\r\n"
            "    inet 127.0.0.1/8 scope host lo\r\n"
            f"2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\r\n"
            f"    inet {network.replace('.0/', '.10/')} brd {network.replace('.0/24', '.255')} scope global eth0\r\n"
        )
    if first in ("ifconfig",):
        base = network.rsplit(".", 2)[0]
        return (
            f"eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\r\n"
            f"        inet {base}.10  netmask 255.255.255.0  broadcast {base}.255\r\n"
            f"        ether 02:42:ac:14:01:0a  txqueuelen 0  (Ethernet)\r\n"
        )
    if first in ("ping",):
        target = cmd.split()[-1] if len(cmd.split()) > 1 else targets[0][0]
        return (
            f"PING {target} ({target}) 56(84) bytes of data.\r\n"
            f"64 bytes from {target}: icmp_seq=1 ttl=64 time=0.045 ms\r\n"
            f"64 bytes from {target}: icmp_seq=2 ttl=64 time=0.038 ms\r\n"
            f"--- {target} ping statistics ---\r\n"
            f"2 packets transmitted, 2 received, 0% packet loss, time 1001ms\r\n"
        )
    if first in ("ls",):
        return (
            "\x1b[1;34mDesktop\x1b[0m  \x1b[1;34mDocuments\x1b[0m  \x1b[1;34mDownloads\x1b[0m  "
            "\x1b[1;32mnotes.txt\x1b[0m  \x1b[1;34mtools\x1b[0m  \x1b[1;34mwordlists\x1b[0m\r\n"
        )
    if first in ("cat",) and "notes" in cmd:
        return (
            f"# Pentest Notes — {info['name']}\r\n"
            f"# Target Network: {network}\r\n"
            f"# Objective: {info['objective_red']}\r\n"
            "# Status: Reconnaissance phase\r\n"
        )
    if first in ("nmap",):
        target = None
        for part in cmd.split():
            if part[0].isdigit():
                target = part
                break
        if not target:
            target = targets[0][0]
        lines = [
            f"Starting Nmap 7.94SVN ( https://nmap.org )\r\n",
            f"Nmap scan report for {target}\r\n",
            f"Host is up (0.00042s latency).\r\n",
        ]
        # Generate ports based on scenario
        if scenario_id.upper() == "SC-01":
            lines.append("PORT      STATE SERVICE    VERSION\r\n")
            lines.append("22/tcp    open  ssh        OpenSSH 8.9p1\r\n")
            lines.append("80/tcp    open  http       Apache httpd 2.4.54\r\n")
            lines.append("443/tcp   open  ssl/http   Apache httpd 2.4.54\r\n")
            lines.append("3306/tcp  open  mysql      MySQL 8.0.32\r\n")
        elif scenario_id.upper() == "SC-02":
            lines.append("PORT      STATE SERVICE       VERSION\r\n")
            lines.append("53/tcp    open  domain        Samba 4.x\r\n")
            lines.append("88/tcp    open  kerberos-sec  Samba kdc\r\n")
            lines.append("135/tcp   open  msrpc         Samba smbd\r\n")
            lines.append("139/tcp   open  netbios-ssn   Samba smbd 4.17\r\n")
            lines.append("389/tcp   open  ldap          Samba LDAP\r\n")
            lines.append("445/tcp   open  microsoft-ds  Samba smbd 4.17\r\n")
            lines.append("464/tcp   open  kpasswd5      Samba kpasswd\r\n")
        elif scenario_id.upper() == "SC-03":
            lines.append("PORT      STATE SERVICE    VERSION\r\n")
            lines.append("25/tcp    open  smtp       Postfix smtpd\r\n")
            lines.append("80/tcp    open  http       GoPhish\r\n")
            lines.append("3333/tcp  open  http       GoPhish admin\r\n")
        lines.append(f"\r\nNmap done: 1 IP address (1 host up) scanned in 2.34 seconds\r\n")
        return "".join(lines)

    if first in ("gobuster",):
        return (
            "===============================================================\r\n"
            "Gobuster v3.6\r\n"
            "===============================================================\r\n"
            f"[+] Url:            http://{targets[0][0]}\r\n"
            "[+] Threads:        30\r\n"
            "[+] Wordlist:       /usr/share/wordlists/dirb/common.txt\r\n"
            "===============================================================\r\n"
            "/admin                (Status: 403) [Size: 278]\r\n"
            "/backup               (Status: 200) [Size: 1247]\r\n"
            "/css                  (Status: 301) [Size: 310]\r\n"
            "/images               (Status: 301) [Size: 313]\r\n"
            "/index.php            (Status: 200) [Size: 8432]\r\n"
            "/login                (Status: 200) [Size: 3201]\r\n"
            "/records              (Status: 200) [Size: 5847]\r\n"
            "/robots.txt           (Status: 200) [Size: 42]\r\n"
            "/uploads              (Status: 403) [Size: 278]\r\n"
            "===============================================================\r\n"
        )

    if first in ("sqlmap",):
        return (
            "        ___\r\n"
            "       __H__\r\n"
            " ___ ___[']_____ ___ ___  {1.7.12}\r\n"
            "|_ -| . [']     | .'| . |\r\n"
            "|___|_  [(]_|_|_|__,|  _|\r\n"
            "      |_|V...       |_|\r\n\r\n"
            "[*] starting @ 14:32:10\r\n"
            "[14:32:10] [INFO] testing connection to the target URL\r\n"
            "[14:32:11] [INFO] testing if the target URL content is stable\r\n"
            "[14:32:11] [INFO] target URL content is stable\r\n"
            "[14:32:11] [INFO] testing 'AND boolean-based blind'\r\n"
            "[14:32:12] [INFO] GET parameter 'id' appears to be 'AND boolean-based blind' injectable\r\n"
            "[14:32:13] [INFO] testing 'MySQL >= 5.0 AND error-based'\r\n"
            "[14:32:13] [INFO] GET parameter 'id' is 'MySQL >= 5.0 AND error-based' injectable\r\n"
            "[14:32:14] [INFO] the back-end DBMS is MySQL\r\n"
            "back-end DBMS: MySQL >= 5.0\r\n"
            "[14:32:14] [INFO] fetching database names\r\n"
            "available databases [3]:\r\n"
            "[*] information_schema\r\n"
            "[*] novamed_portal\r\n"
            "[*] mysql\r\n"
        )

    if first in ("crackmapexec", "netexec", "cme"):
        base = network.rsplit(".", 2)[0]
        return (
            f"SMB  {base}.20  445  NEXORA-DC01  [*] Windows Server (name:NEXORA-DC01) (domain:nexora.local)\r\n"
            f"SMB  {base}.40  445  NEXORA-FS01  [*] Windows Server (name:NEXORA-FS01) (domain:nexora.local)\r\n"
            f"SMB  {base}.20  445  NEXORA-DC01  [+] nexora.local\\jsmith:Welcome1!\r\n"
        )

    if first in ("bloodhound", "bloodhound.py", "bloodhound-python"):
        return (
            "INFO: Found AD domain: nexora.local\r\n"
            "INFO: Getting TGT for user jsmith\r\n"
            "INFO: Connecting to LDAP server: 172.20.2.20\r\n"
            "INFO: Found 1 domains\r\n"
            "INFO: Found 2 computers\r\n"
            "INFO: Found 5 users\r\n"
            "INFO: Found 12 groups\r\n"
            "INFO: Enumerating Kerberoastable users...\r\n"
            "INFO: Found Kerberoastable user: svc_backup (SPN: CIFS/NEXORA-FS01.nexora.local)\r\n"
            "INFO: Done in 00:00:04\r\n"
            "INFO: Compressing output to bloodhound_20260408.zip\r\n"
        )

    if "impacket" in first or first in ("getnpusers", "getuserspns", "secretsdump", "psexec"):
        tool = first.split("-")[-1] if "-" in first else first
        if "spn" in tool.lower() or "kerberoast" in cmd.lower():
            return (
                "Impacket v0.11.0 - Copyright 2023 Fortra\r\n\r\n"
                "ServicePrincipalName              Name        MemberOf  PasswordLastSet\r\n"
                "------------------------------------  ----------  --------  -------------------\r\n"
                "CIFS/NEXORA-FS01.nexora.local     svc_backup  (none)    2024-01-15 10:23:41\r\n\r\n"
                "$krb5tgs$23$*svc_backup$NEXORA.LOCAL$CIFS/NEXORA-FS01.nexora.local*$a8f2...[hash truncated]\r\n"
            )
        return "Impacket v0.11.0 - Copyright 2023 Fortra\r\n[*] Connecting...\r\n"

    if first in ("hashcat",):
        return (
            "hashcat (v6.2.6) starting\r\n\r\n"
            "Session..........: hashcat\r\n"
            "Status...........: Cracked\r\n"
            "Hash.Mode........: 13100 (Kerberos 5 TGS-REP etype 23)\r\n"
            "Speed.#1.........: 45231.2 kH/s\r\n"
            "Recovered........: 1/1 (100.00%)\r\n\r\n"
            "$krb5tgs$23$*svc_backup$NEXORA.LOCAL$...:Backup2024!\r\n"
        )

    if first in ("curl",):
        return (
            "HTTP/1.1 200 OK\r\n"
            "Server: Apache/2.4.54 (Debian)\r\n"
            "X-Powered-By: PHP/8.1.12\r\n"
            "Content-Type: text/html; charset=UTF-8\r\n"
            "Set-Cookie: PHPSESSID=abc123; path=/\r\n\r\n"
            "<!DOCTYPE html><html><head><title>NovaMed Patient Portal</title>...\r\n"
        )

    if first in ("whatweb",):
        return (
            f"http://{targets[0][0]} [200 OK] Apache[2.4.54], Country[RESERVED],\r\n"
            "  HTML5, HTTPServer[Debian Linux][Apache/2.4.54 (Debian)],\r\n"
            "  JQuery[3.6.1], PHP[8.1.12], PasswordField[password],\r\n"
            "  Script[text/javascript], Title[NovaMed Patient Portal],\r\n"
            "  X-Powered-By[PHP/8.1.12]\r\n"
        )

    if first in ("hydra",):
        return (
            "Hydra v9.5 (c) 2023 by van Hauser/THC\r\n"
            "[DATA] max 16 tasks per 1 server, overall 16 tasks\r\n"
            f"[DATA] attacking http-post-form://{targets[0][0]}:80/login\r\n"
            f"[80][http-post-form] host: {targets[0][0]}   login: admin   password: admin123\r\n"
            "1 of 1 target successfully completed, 1 valid password found\r\n"
        )

    if first in ("nikto",):
        return (
            f"- Nikto v2.5.0\r\n"
            f"---------------------------------------------------------------------------\r\n"
            f"+ Target IP:          {targets[0][0]}\r\n"
            f"+ Target Hostname:    {targets[0][0]}\r\n"
            f"+ Target Port:        80\r\n"
            f"+ Start Time:         2026-04-08 14:00:00\r\n"
            f"---------------------------------------------------------------------------\r\n"
            f"+ Server: Apache/2.4.54 (Debian)\r\n"
            f"+ /: The X-Content-Type-Options header is not set.\r\n"
            f"+ /admin/: Directory indexing found.\r\n"
            f"+ /backup/: Backup directory found.\r\n"
            f"+ /robots.txt: Entry '/admin/' is returned a 403.\r\n"
            f"+ OSVDB-3092: /records/?file=: Possible LFI vulnerability.\r\n"
            f"---------------------------------------------------------------------------\r\n"
        )

    if first in ("msfconsole", "msfvenom"):
        return (
            "                                                  \r\n"
            "      =[ metasploit v6.3.44-dev ]\r\n"
            "+ -- --=[ 2376 exploits - 1232 auxiliary - 416 post ]\r\n"
            "+ -- --=[ 1388 payloads - 46 encoders - 11 nops    ]\r\n"
            "+ -- --=[ 9 evasion                                 ]\r\n\r\n"
            "msf6 > \r\n"
        )

    if first in ("help",):
        return (
            "\x1b[1;33mAvailable pentesting tools:\x1b[0m\r\n"
            "  \x1b[1;32mnmap\x1b[0m          Network scanner & service detection\r\n"
            "  \x1b[1;32mgobuster\x1b[0m      Directory/file brute-forcing\r\n"
            "  \x1b[1;32msqlmap\x1b[0m        SQL injection automation\r\n"
            "  \x1b[1;32mnikto\x1b[0m         Web vulnerability scanner\r\n"
            "  \x1b[1;32mhydra\x1b[0m         Password brute-forcing\r\n"
            "  \x1b[1;32mcurl\x1b[0m          HTTP request tool\r\n"
            "  \x1b[1;32mwhatweb\x1b[0m       Web technology fingerprinting\r\n"
            "  \x1b[1;32mbloodhound\x1b[0m    AD attack path mapping\r\n"
            "  \x1b[1;32mcrackmapexec\x1b[0m  SMB/AD enumeration\r\n"
            "  \x1b[1;32mimpacket-*\x1b[0m    AD exploitation toolkit\r\n"
            "  \x1b[1;32mhashcat\x1b[0m       Password hash cracking\r\n"
            "  \x1b[1;32mmsfconsole\x1b[0m    Metasploit Framework\r\n"
            "  \x1b[1;32mmsfvenom\x1b[0m      Payload generation\r\n"
            "\r\n\x1b[1;33mBasic commands:\x1b[0m whoami, id, ls, cat, pwd, ip addr, ping\r\n"
        )

    if first in ("clear",):
        return "\x1b[2J\x1b[H"

    if first in ("exit", "logout"):
        return "\x1b[1;33m[Session ended. Click 'End & debrief' to review.]\x1b[0m\r\n"

    # Unknown command — give a helpful nudge
    if cmd:
        return (
            f"\x1b[31mbash: {first}: command not found\x1b[0m\r\n"
            "\x1b[0;33mType 'help' for available tools.\x1b[0m\r\n"
        )
    return ""


async def _mock_stream(session_id: str, scenario_id: str = "SC-01") -> None:
    """
    Start an interactive mock terminal when Docker is unavailable.
    Shows a scenario banner, responds to commands with simulated output.
    """
    redis = get_async_redis()

    # Send the scenario banner + first prompt
    banner = _build_banner(scenario_id)
    await redis.publish(
        f"terminal:{session_id}:output",
        json.dumps({"data": banner + _KALI_PROMPT}),
    )

    # Start a listener thread that simulates command responses
    with _active_sessions_lock:
        if session_id in _active_sessions:
            return
        _active_sessions.add(session_id)

    def _mock_listener():
        r = _make_sync_redis()
        pub = r.pubsub(ignore_subscribe_messages=True)
        pub.subscribe(f"terminal:{session_id}:input")
        try:
            for message in pub.listen():
                if message and message.get("type") == "message":
                    try:
                        payload = json.loads(message["data"])
                        text = payload.get("data", "")
                        # Frontend sends fully assembled command strings.
                        cmd = text.strip()
                        if not cmd:
                            continue
                        output = _mock_command_output(cmd, scenario_id)
                        response = output + _KALI_PROMPT
                        r.publish(
                            f"terminal:{session_id}:output",
                            json.dumps({"data": response}),
                        )
                        # Store in history for reconnect
                        pipe = r.pipeline()
                        pipe.lpush(f"terminal:{session_id}:history", response)
                        pipe.ltrim(f"terminal:{session_id}:history", 0, 499)
                        pipe.execute()
                    except Exception:
                        pass
        finally:
            try:
                pub.unsubscribe()
                pub.close()
            except Exception:
                pass
            with _active_sessions_lock:
                _active_sessions.discard(session_id)

    threading.Thread(target=_mock_listener, daemon=True, name=f"mock-terminal-{session_id[:8]}").start()
