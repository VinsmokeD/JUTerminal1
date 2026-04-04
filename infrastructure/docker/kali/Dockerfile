FROM kalilinux/kali-rolling:latest

ENV DEBIAN_FRONTEND=noninteractive

# Core tools for all scenarios — installed in one layer to minimise image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Recon
    nmap nikto whatweb dnsutils whois curl wget \
    # Web assessment
    gobuster ffuf wfuzz sqlmap \
    # Password attacks
    john hashcat hydra \
    # Network analysis
    netcat-openbsd tcpdump tshark wireshark-common \
    # Scripting & utilities
    python3 python3-pip git vim less jq \
    # AWS
    awscli \
    # Impacket deps
    python3-impacket \
    # Misc pentest
    medusa crunch \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Python tools
RUN pip3 install --no-cache-dir \
    impacket \
    trufflehog \
    crackmapexec \
    && rm -rf /root/.cache

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
