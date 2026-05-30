"""Deterministic AI Tutor Question Level Classifier.

Classifies a student question into:
- Level 1: Conceptual (what is, why does, no tools or specific techniques)
- Level 2: Strategic/Technical (mentions specific tools, options, or domain components)
- Level 3: Procedural (asks for step-by-step instructions, commands, syntax, or walkthroughs)
"""

import re

# Known security/pentesting tools
TOOLS = {
    "nmap",
    "sqlmap",
    "gobuster",
    "nikto",
    "hydra",
    "curl",
    "whatweb",
    "bloodhound",
    "crackmapexec",
    "netexec",
    "impacket",
    "mimikatz",
    "hashcat",
    "msfconsole",
    "msfvenom",
    "theharvester",
    "gophish",
    "dirb",
    "ffuf",
    "dirbuster",
    "netcat",
    "nc",
    "smbclient",
    "secretsdump",
    "getuserspns",
    "kerbrute",
    "gowitness",
    "ncat",
    "burp",
    "wireshark",
    "tcpdump",
    "cyberchef",
    "ldapsearch",
    "secretsdump.py",
    "getuserspns.py",
    "gpp-decrypt",
    "john the ripper",
    "john",
    "splunk",
    "modsecurity",
    "apache",
}


def classify_question(question: str) -> int:
    """Deterministically classify a student question into Level 1, 2, or 3."""
    if not question or not question.strip():
        return 1

    # Truncate to first 500 characters
    q_lower = question.lower().strip()[:500]

    # 1. Check L3 (Procedural Walkthrough / Command request)
    l3_keywords = [
        "step by step",
        "step-by-step",
        "walk me through",
        "what should i type",
        "how do i exactly",
        "command",
        "commands",
        "syntax",
        "payload",
        "query",
        "flags",
        "exact curl",
        "exact bytes",
        "exact command",
        "exact request",
        "exact payload",
        "exact steps",
        "command line",
        "show me the",
        "show me how",
        "how do i pivot",
        "how to pivot",
        "how do i exploit",
        "how to exploit",
        "how do i bypass",
        "how to bypass",
        "how do i run",
        "how to run",
        "how do i execute",
        "how to execute",
        "how do i use",
        "how to use",
        "how do i do",
        "how to do",
        "how do i perform",
        "how to perform",
        "how do i trigger",
        "how to trigger",
        "how do i chain",
        "how to chain",
        "how do i crack",
        "how to crack",
        "how do i get",
        "how to get",
        "how do i extract",
        "how to extract",
        "how do i dump",
        "how to dump",
    ]

    if any(kw in q_lower for kw in l3_keywords):
        return 3

    # Pattern based L3 indicators
    give_tell_patterns = [
        r"give me the (exact|command|syntax|payload|steps|powershell|curl|request)",
        r"tell me the (exact|command|syntax|payload|steps|powershell|curl|request)",
        r"\bhow do i exactly\b",
        r"\bexact syntax\b",
        r"\bwhat parameters do i pass\b",
        r"\bwhat arguments\b",
        r"\bwhat's the command\b",
        r"\bwhat is the command\b",
        r"\bcommand to\b",
        r"\bcommand for\b",
        r"\bsteps to\b",
        r"\bwrite a command\b",
        r"\bhow can i run\b",
    ]
    for pattern in give_tell_patterns:
        if re.search(pattern, q_lower):
            return 3

    # 2. Check for L1 conceptual exceptions first (even if tools are mentioned)
    # Questions asking about general definitions or workings, e.g., "what does bloodhound actually do under the hood"
    concept_indicators = [
        "under the hood",
        "actually do",
        "how does",
        "explain to me what",
        "what is the difference",
        "whats the difference",
    ]
    if any(indicator in q_lower for indicator in concept_indicators):
        return 1

    # 3. Check L2 directional markers
    l2_keywords = [
        "should i",
        "should my",
        "should",
        "which",
        "tool",
        "tools",
        "approach",
        "approaches",
        "recommend",
        "recommended",
        "recommendation",
    ]
    if any(kw in q_lower for kw in l2_keywords):
        return 2

    # Check if a known tool is mentioned (tools always elevate to L2)
    # Extract words to match against tools list (checking whole words only)
    words = set(re.findall(r"\b[a-z0-9_-]+\b", q_lower))
    has_tool = any(word in TOOLS for word in words) or "john the ripper" in q_lower
    if has_tool:
        return 2

    # Default to L1
    return 1
