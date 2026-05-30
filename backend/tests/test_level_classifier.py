from __future__ import annotations

import pytest

from src.ai.level_classifier import classify_question


# ---------------------------------------------------------------------------
# L1 — Conceptual cases
# Hallmark: asks about a concept, definition, principle, or "why".
# Should not name a tool or ask for a procedure.
# ---------------------------------------------------------------------------

L1_CASES = [
    (
        "what is local file inclusion",
        "Direct definition request. No tool. No procedure.",
    ),
    (
        "why does sqli work against this login form",
        "Asks about the principle of an attack class, not the steps.",
    ),
    (
        "whats the difference between idor and broken access control",
        "Compares two concepts. Conceptual by definition.",
    ),
    (
        "what does kerberos pre-authentication actually do",
        "Asks about protocol behavior, not how to attack it.",
    ),
    (
        "why would a soc analyst care about event id 4769",
        "Asks for the meaning of a defensive artifact.",
    ),
    (
        "what is the point of methodology gating in this scenario",
        "Asks about a system concept; no action requested.",
    ),
    (
        "is xss the same as html injection",
        "Conceptual comparison question.",
    ),
    (
        "what does the term lateral movement mean",
        "Definition request.",
    ),
    (
        "why is svc_backup kerberoastable but jsmith is not",
        "Asks about the underlying principle, not how to exploit.",
    ),
    (
        "what category of vulnerability is unrestricted file upload",
        "Asks for taxonomy, not technique.",
    ),
]


# ---------------------------------------------------------------------------
# L2 — Directional cases
# Hallmark: names a tool, technique, or asks "which" / "should I"
# without asking for the exact command or steps.
# ---------------------------------------------------------------------------

L2_CASES = [
    (
        "should i use sqlmap or burp for the login form",
        "Tool choice question. Names two tools. Asks for direction.",
    ),
    (
        "which kerberos enctype should i target for the offline crack",
        "Strategic choice within an attack. No procedure requested.",
    ),
    (
        "is hashcat or john the ripper faster for kerberos tickets",
        "Tool comparison within a method.",
    ),
    (
        "what tool would help me enumerate the smb shares on the dc",
        "Asks for tool selection. No 'how' or 'command'.",
    ),
    (
        "should i look at modsecurity logs or the apache access log first",
        "Strategic ordering question for blue team.",
    ),
    (
        "is bloodhound the right approach for finding kerberoastable users",
        "Tool fit question.",
    ),
    (
        "would impacket secretsdump or mimikatz make more sense here",
        "Choice between tools for the same goal.",
    ),
    (
        "which port should i scan first on the webapp target",
        "Strategy question framed as 'which', no command requested.",
    ),
    (
        "what approach do you recommend for the lfi finding",
        "Asks for general approach, not steps.",
    ),
    (
        "should my next phase be exploitation or do i need more recon",
        "Methodology decision. Strategic, not procedural.",
    ),
]


# ---------------------------------------------------------------------------
# L3 — Procedural cases
# Hallmark: asks for steps, commands, "how do I exactly", or a walkthrough.
# ---------------------------------------------------------------------------

L3_CASES = [
    (
        "give me the exact curl command to exploit the lfi",
        "Direct command request.",
    ),
    (
        "walk me through the steps to kerberoast svc_backup",
        "Walkthrough request.",
    ),
    (
        "how do i exactly chain the file upload and lfi to get rce",
        "'How do I exactly' is a procedural marker.",
    ),
    (
        "what is the full sqlmap syntax for this login form",
        "Asks for full syntax of a specific invocation.",
    ),
    (
        "step by step how do i pivot from the webapp to the database",
        "Explicit step-by-step request.",
    ),
    (
        "show me the impacket command line for secretsdump on the dc",
        "Asks for a literal command line.",
    ),
    (
        "give me the powershell payload for the phishing macro",
        "Asks for a payload, which is procedural.",
    ),
    (
        "what flags do i need for nmap to find the vulnerable services",
        "Asks for a specific flag set, not a strategy.",
    ),
    (
        "tell me the exact request to send to bypass the waf",
        "Procedural: asks for the literal request.",
    ),
    (
        "what should i type to capture the kerberos ticket",
        "'What should I type' is procedural.",
    ),
]


# ---------------------------------------------------------------------------
# Edge cases
# These exist to lock the classifier's behavior at the L1/L2 and L2/L3
# boundaries. They look ambiguous in isolation; the rationale below is
# the project's position on each.
# ---------------------------------------------------------------------------

EDGE_CASES = [
    # Names a tool but asks for the concept of that tool -> L1.
    (
        "what does bloodhound actually do under the hood",
        1,
        "Names a tool, but the question is about how the tool works "
        "internally. That is a concept question, not a tool-choice question.",
    ),
    # "How" alone is not procedural if it asks for understanding -> L1.
    (
        "how does the waf detect a union-based sqli",
        1,
        "'How does X detect Y' is asking for the principle of detection, "
        "not asking for the student's steps. Concept.",
    ),
    # "Which" + procedural intent -> L3, not L2, because the procedural
    # phrasing dominates the choice phrasing.
    (
        "which exact bytes do i send to bypass the magic-byte check",
        3,
        "'Which' is normally L2, but 'exact bytes' makes this a request "
        "for the literal payload, which is procedural.",
    ),
    # Pure tool name with no verb -> L2.
    (
        "sqlmap",
        2,
        "A bare tool name with no surrounding question is treated as a "
        "directional ask: 'tell me about sqlmap for this'. L2.",
    ),
    # Profanity, frustration, or vague stuck -> L1, not L3.
    (
        "im completely stuck",
        1,
        "A frustration message with no procedural ask defaults to L1 so the "
        "tutor offers a concept-level nudge, not a walkthrough. Lowest "
        "penalty for a student who has not actually asked for anything.",
    ),
    # Mixed question with multiple parts -> classifier picks the highest
    # level present, because the answer will need to address all parts.
    (
        "what is kerberoasting and what command runs it",
        3,
        "Combined L1 + L3 question. The answer will give a command, so the "
        "penalty must reflect L3.",
    ),
    # Reflective question about own progress -> L1.
    (
        "have i missed anything in the recon phase",
        1,
        "Self-reflection request. Tutor will give a concept-level pointer "
        "to whatever the student has not yet documented.",
    ),
    # Polite phrasing should not affect classification.
    (
        "could you please tell me the syntax for hashcat mode 13100",
        3,
        "Politeness wrappers must not lower the level. Still procedural.",
    ),
    # Defensive (blue-team) version of an L3 ask -> still L3.
    (
        "what is the splunk query to find the rc4 kerberos requests",
        3,
        "Blue-team procedural question. Same level treatment as red-team "
        "procedural questions: asking for a specific query.",
    ),
    # Conceptual question phrased as command -> L1, not L3.
    (
        "explain to me what a downgrade attack is",
        1,
        "'Explain' is conceptual. The imperative form does not make it " "procedural.",
    ),
]


# ---------------------------------------------------------------------------
# The actual tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("question,rationale", L1_CASES)
def test_classifier_returns_l1_for_conceptual(question: str, rationale: str) -> None:
    """Each L1 case must classify as level 1. Rationale documented per case."""
    assert classify_question(question) == 1, (
        f"Expected L1 for {question!r}.\n" f"Rationale: {rationale}"
    )


@pytest.mark.parametrize("question,rationale", L2_CASES)
def test_classifier_returns_l2_for_directional(question: str, rationale: str) -> None:
    """Each L2 case must classify as level 2."""
    assert classify_question(question) == 2, (
        f"Expected L2 for {question!r}.\n" f"Rationale: {rationale}"
    )


@pytest.mark.parametrize("question,rationale", L3_CASES)
def test_classifier_returns_l3_for_procedural(question: str, rationale: str) -> None:
    """Each L3 case must classify as level 3."""
    assert classify_question(question) == 3, (
        f"Expected L3 for {question!r}.\n" f"Rationale: {rationale}"
    )


@pytest.mark.parametrize("question,expected,rationale", EDGE_CASES)
def test_classifier_edge_cases(question: str, expected: int, rationale: str) -> None:
    """
    Edge cases lock the classifier's behavior at the L1/L2 and L2/L3
    boundaries. Changes here will affect scoring; review with care.
    """
    assert classify_question(question) == expected, (
        f"Edge case mismatch for {question!r}. Expected {expected}.\n" f"Rationale: {rationale}"
    )


# ---------------------------------------------------------------------------
# Determinism guarantee
# ---------------------------------------------------------------------------


def test_classifier_is_deterministic() -> None:
    """
    The same question must always classify to the same level.
    This is a scoring requirement: two students asking the same question
    must receive the same penalty.
    """
    samples = [
        "what is local file inclusion",
        "should i use sqlmap or burp for the login form",
        "give me the exact curl command to exploit the lfi",
        "im completely stuck",
    ]
    for question in samples:
        first = classify_question(question)
        for _ in range(5):
            assert classify_question(question) == first, (
                f"Classifier returned different levels for {question!r}; "
                "scoring would be non-reproducible."
            )


def test_classifier_handles_empty_input() -> None:
    """An empty question must not raise. Default to L1 (lowest penalty)."""
    assert classify_question("") == 1
    assert classify_question("   ") == 1


def test_classifier_handles_very_long_input() -> None:
    """A wall-of-text question must not raise; classifier reads the first
    ~500 characters for keyword signals and ignores the rest."""
    long_question = "what is " + ("lateral movement " * 500)
    result = classify_question(long_question)
    assert result in (1, 2, 3)


def test_classifier_is_case_insensitive() -> None:
    """Casing must not affect the classification."""
    pairs = [
        ("WHAT IS LFI", "what is lfi"),
        ("Give Me The Exact Command", "give me the exact command"),
    ]
    for upper, lower in pairs:
        assert classify_question(upper) == classify_question(lower)
