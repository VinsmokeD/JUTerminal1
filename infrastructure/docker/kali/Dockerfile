FROM kalilinux/kali-rolling:latest

ENV DEBIAN_FRONTEND=noninteractive

# Suppress tshark/wireshark interactive install prompts
RUN echo "wireshark-common wireshark-common/install-setuid boolean false" | debconf-set-selections

# Core tools for all scenarios — installed in one layer to minimise image size
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
    # Recon
    nmap nikto whatweb dnsutils whois curl wget enum4linux \
    # Web assessment
    gobuster ffuf wfuzz sqlmap dirb wpscan \
    # Password attacks
    john hashcat hydra \
    # Wordlists & payloads
    seclists wordlists exploitdb \
    # Network analysis & pivoting
    netcat-openbsd tcpdump tshark wireshark-common proxychains4 \
    # Active Directory / SMB
    smbclient crackmapexec impacket-scripts evil-winrm responder \
    # Exploitation
    metasploit-framework \
    # Scripting & utilities
    python3 python3-pip git vim less jq tmux \
    # AWS
    awscli \
    # Misc pentest
    medusa \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Docker uses no-new-privileges for the student sandbox. Kali ships nmap with
# file capabilities, which the kernel refuses to execute under that policy.
# Removing them keeps nmap usable as a normal non-root TCP connect scanner.
RUN if [ -f /usr/lib/nmap/nmap ]; then setcap -r /usr/lib/nmap/nmap 2>/dev/null || true; fi

# Kali's /usr/bin/nmap launcher adds --privileged for non-root users. In this
# sandbox that forces raw socket behavior, so prefer a direct unprivileged shim.
RUN printf '%s\n' '#!/usr/bin/env sh' 'exec /usr/lib/nmap/nmap "$@"' > /usr/local/bin/nmap \
    && chmod 0755 /usr/local/bin/nmap


# Create non-root student user — containers never run as root
RUN useradd -m -s /bin/bash -u 1000 student \
    && echo 'student ALL=(ALL) NOPASSWD: /usr/bin/tcpdump, /usr/bin/tshark' >> /etc/sudoers

# Student home setup
USER student
WORKDIR /home/student

# Shell prompt — shows current scenario context
COPY --chown=student:student .bashrc /home/student/.bashrc

# Pre-create working directories
RUN mkdir -p /home/student/{recon,exploits,loot,notes,tools}

# Default: keep container alive for exec
CMD ["sleep", "infinity"]
