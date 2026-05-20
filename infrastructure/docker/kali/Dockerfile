FROM kalilinux/kali-rolling:latest AS kali-base

ENV DEBIAN_FRONTEND=noninteractive

# Pin apt source to official mirrors to avoid transient mirror failures
RUN echo "deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && echo "deb http://kali.download/kali kali-rolling main contrib non-free non-free-firmware" >> /etc/apt/sources.list

# Suppress tshark/wireshark interactive install prompts
RUN echo "wireshark-common wireshark-common/install-setuid boolean false" | debconf-set-selections

# Core tools for all scenarios — installed in one layer to minimise image size
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
    # Recon
    nmap nikto whatweb dnsutils whois curl wget enum4linux \
    # Web assessment
    gobuster ffuf wfuzz sqlmap dirb wpscan \
    # Password attacks
    john hydra \
    # Wordlists & payloads
    seclists wordlists exploitdb \
    # Network analysis & pivoting
    netcat-openbsd tcpdump tshark wireshark-common proxychains4 \
    # Active Directory / SMB
    smbclient impacket-scripts samba-common-bin krb5-user \
    pipx \
    # Exploitation
    metasploit-framework \
    # Scripting & utilities
    python3 python3-pip git vim less jq tmux \
    # AWS
    awscli \
    # Misc pentest
    medusa \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/fortra/impacket.git /opt/impacket \
    && pip install --break-system-packages /opt/impacket

# Docker uses no-new-privileges for the student sandbox. Kali ships nmap with
# file capabilities, which the kernel refuses to execute under that policy.
# Removing them keeps nmap usable as a normal non-root TCP connect scanner.
RUN if [ -f /usr/lib/nmap/nmap ]; then setcap -r /usr/lib/nmap/nmap 2>/dev/null || true; fi

# Kali's /usr/bin/nmap launcher adds --privileged for non-root users. In this
# sandbox that forces raw socket behavior, so prefer a direct unprivileged shim.
RUN printf '%s\n' '#!/usr/bin/env sh' 'exec /usr/lib/nmap/nmap "$@"' > /usr/local/bin/nmap \
    && chmod 0755 /usr/local/bin/nmap

FROM kali-base AS kali-ad-tools

# Install heavier AD tools
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
    crackmapexec evil-winrm responder ldap-utils freerdp3-x11 hashcat golang-go \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install AD tools not in apt
RUN pip install --break-system-packages bloodhound nxc || pip install --break-system-packages bloodhound

# Download Kerbrute binary
RUN wget https://github.com/ropnop/kerbrute/releases/download/v1.0.3/kerbrute_linux_amd64 -O /usr/local/bin/kerbrute \
    && chmod +x /usr/local/bin/kerbrute

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
