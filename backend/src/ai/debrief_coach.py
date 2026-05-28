import re
import json
import logging
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.cache.redis import cache_get, cache_set, cache_increment
from src.db.database import Session

logger = logging.getLogger(__name__)

# Fallback Socratic responses based on scenario
FALLBACK_DEBRIEF = {
    "sc-01": {
        "summary": "You have completed the NovaMed Healthcare Web Application Pentest. Your methodology progress indicates you explored the target, but there is room to refine your sequencing between identification and active exploitation.",
        "strengths": [
            "Identified web server directory structures and potential endpoints.",
            "Located the input vectors suitable for testing vulnerability hypothesis."
        ],
        "improvement_areas": [
            "Ensure you document recon findings thoroughly before launching active exploit tools.",
            "Monitor WAF alerts during active scans to understand detection footprints."
        ],
        "missed_detections": [
            "ModSecurity WAF logs for directory traversal attempts.",
            "SQL Injection error-based alerts triggered on search parameters."
        ],
        "next_practice": [
            "Practice manual parameter fuzzing rather than relying purely on automated scanners.",
            "Review WAF exclusion rules to understand how to bypass controls stealthily."
        ]
    },
    "sc-02": {
        "summary": "You have completed the Nexora Financial Active Directory Compromise scenario. Moving laterally in active domains requires stealth, precision, and methodical host mapping.",
        "strengths": [
            "Conducted target domain enumeration to map users and SMB shares.",
            "Identified kerberoastable accounts within the environment."
        ],
        "improvement_areas": [
            "Avoid noisy queries that trigger high-severity Event 4769 RC4 downgrade alerts.",
            "Ensure you log and organize credentials systematically in your notebook."
        ],
        "missed_detections": [
            "DCSync detection alerts from domain controller logs.",
            "AS-REP Roasting indicators of interest."
        ],
        "next_practice": [
            "Study Kerberos delegation attacks and defense mechanisms.",
            "Review how security analysts distinguish benign domain queries from malicious recon."
        ]
    },
    "sc-03": {
        "summary": "You have completed the Orion Logistics Phishing & Initial Access scenario. Initial access relies heavily on pretext alignment and payload stealth.",
        "strengths": [
            "Configured phishing templates and successfully targeted victim profiles.",
            "Established a callback from the simulated user endpoint."
        ],
        "improvement_areas": [
            "Improve email headers to bypass SPF/DKIM validation controls more effectively.",
            "Be mindful of persistence tasks triggering immediate endpoint detection alerts."
        ],
        "missed_detections": [
            "PowerShell download cradle alerts in endpoint telemetry.",
            "Scheduled task creation logs on the victim workstation."
        ],
        "next_practice": [
            "Practice obfuscating PowerShell download instructions.",
            "Study how email gateway security controls block suspicious macro attachments."
        ]
    }
}

from src.ai.security import redact_text

async def generate_debrief_coaching(session_id: str, report_data: dict, db: AsyncSession) -> dict:
    """
    Generate Socratic debrief coaching from report_data using OpenRouter/DeepSeek.
    Scrubs flags/credentials and falls back to offline matrix if needed.
    """
    # Check cache first
    cached_result = await cache_get(f"ai:debrief:{session_id}:result")
    if cached_result:
        if isinstance(cached_result, dict):
            return cached_result
        try:
            return json.loads(cached_result)
        except (json.JSONDecodeError, TypeError):
            pass

    # Fetch session metadata for dynamic scrubbing
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    metadata = session.session_metadata if session else None

    # Fallback response template
    scenario_id = report_data.get("session", {}).get("scenario_id", "sc-01").lower()
    fallback = FALLBACK_DEBRIEF.get(scenario_id, FALLBACK_DEBRIEF["sc-01"])

    # Prepare context for the prompt, redact it first
    notes_summary = "\n".join([f"- Note ({n['tag']}): {n['content']}" for n in report_data.get("notes", [])])
    commands_summary = "\n".join([f"- Command: {c['command']}" for c in report_data.get("commands", [])[:50]]) # limit history
    siem_summary = "\n".join([f"- Alert: {e['message']} (Severity: {e['severity']})" for e in report_data.get("siem_events", [])[:50]])

    raw_context = f"""
Scenario ID: {scenario_id}
Score: {report_data.get('score', {}).get('final_score', 100)}
Methodology: {report_data.get('session', {}).get('methodology', 'ptes')}

Student Notes:
{notes_summary}

Student Commands Run:
{commands_summary}

SIEM Events Triggered:
{siem_summary}
"""
    # Scrub context
    scrubbed_context = redact_text(raw_context, metadata)

    if not settings.OPENROUTER_API_KEY:
        logger.info("OPENROUTER_API_KEY not set. Using offline fallback debrief coach.")
        # Enrich fallback slightly based on score
        final_score_val = report_data.get('score', {}).get('final_score', 100)
        enriched = dict(fallback)
        if final_score_val < 70:
            enriched["summary"] += " Your final score reflects some difficulties, likely due to excessive hint usage or gate locks. Focus on thorough recon next time."
        await cache_set(f"ai:debrief:{session_id}:result", enriched, ttl=86400)
        return enriched

    # Call OpenRouter
    sys_prompt = """You are an expert Socratic Cybersecurity Coach for a training platform.
Your task is to analyze the student's terminal log, SIEM triage events, and notes to provide post-session coaching.
A student performs attacks (Red Team) while alerts trigger (Blue Team).
You must write a Socratic post-session report.

Strict constraints:
1. NEVER output direct commands, exploit scripts, exact flags, or credentials.
2. Provide feedback that is Socratic: ask guiding questions rather than stating solutions.
3. Be concise and keep your response under 400 tokens.
4. You MUST return ONLY a raw JSON object matching the following structure:
{
  "summary": "overall high-level summary of performance",
  "strengths": ["strength 1", "strength 2"],
  "improvement_areas": ["improvement 1", "improvement 2"],
  "missed_detections": ["missed detection 1", "missed detection 2"],
  "next_practice": ["next practice 1", "next practice 2"]
}
Do not wrap your response in markdown code blocks. Just return the JSON object."""

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "max_tokens": 800,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Here is the student session context:\n{scrubbed_context}"},
        ],
        "reasoning_effort": "xhigh",
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.AI_HTTP_REFERER,
        "X-Title": settings.AI_X_TITLE,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        
        # Clean any markdown formatting if LLM disobeyed
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        parsed_json = json.loads(content)
        
        # Verify keys
        required_keys = {"summary", "strengths", "improvement_areas", "missed_detections", "next_practice"}
        if all(key in parsed_json for key in required_keys):
            # Double-check scrub response
            parsed_json["summary"] = redact_text(parsed_json["summary"], metadata)
            parsed_json["strengths"] = [redact_text(s, metadata) for s in parsed_json["strengths"]]
            parsed_json["improvement_areas"] = [redact_text(i, metadata) for i in parsed_json["improvement_areas"]]
            parsed_json["missed_detections"] = [redact_text(m, metadata) for m in parsed_json["missed_detections"]]
            parsed_json["next_practice"] = [redact_text(n, metadata) for n in parsed_json["next_practice"]]
            
            await cache_set(f"ai:debrief:{session_id}:result", parsed_json, ttl=86400)
            return parsed_json
            
    except Exception as e:
        logger.warning("Debrief coach OpenRouter API call failed or returned invalid JSON. Using fallback. Error: %s", e)

    # Cache and return fallback
    await cache_set(f"ai:debrief:{session_id}:result", fallback, ttl=86400)
    return fallback

async def handle_debrief_qa(session_id: str, question: str, report_data: dict, db: AsyncSession) -> dict:
    """
    Handle post-session Socratic Q&A, restricting questions to max 3 per session.
    """
    qa_count_key = f"ai:debrief:{session_id}:qa_count"
    current_count_str = await cache_get(qa_count_key)
    current_count = int(current_count_str) if current_count_str else 0

    if current_count >= 3:
        return {
            "response": "You have reached your limit of 3 debrief questions for this session.",
            "qa_count": current_count,
            "remaining": 0
        }

    # Increment question count
    new_count = await cache_increment(qa_count_key, amount=1, ttl=86400)

    # Fetch session metadata for scrubbing
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    metadata = session.session_metadata if session else None

    # Fallback Socratic prompt response if OpenRouter not available
    scenario_id = report_data.get("session", {}).get("scenario_id", "sc-01").lower()
    fallback_response = (
        f"In this {scenario_id.upper()} mission, think about your main objectives. "
        "Did you discover all credentials or just exploit the first available option? "
        "What findings in your notebook could you have used to investigate other vectors?"
    )

    if not settings.OPENROUTER_API_KEY:
        return {
            "response": fallback_response,
            "qa_count": new_count,
            "remaining": 3 - new_count
        }

    # Build prompt
    sys_prompt = f"""You are the Socratic Cybersecurity Coach for the student's debrief.
The student has finished their scenario ({scenario_id.upper()}).
You must guide them to discover what they missed, why they made certain errors, or how to think about security controls.
Constraints:
1. NEVER output direct commands, exploit scripts, exact flags, or credentials.
2. NEVER give direct answers. Guide with questions.
3. Limit response to 120 words.
"""
    
    scrubbed_question = redact_text(question, metadata)
    
    payload = {
        "model": settings.OPENROUTER_MODEL,
        "max_tokens": 150,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Student question: {scrubbed_question}"},
        ],
        "reasoning_effort": "xhigh",
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.AI_HTTP_REFERER,
        "X-Title": settings.AI_X_TITLE,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        response_text = redact_text(content, metadata)
        return {
            "response": response_text,
            "qa_count": new_count,
            "remaining": 3 - new_count
        }
    except Exception as e:
        logger.warning("Debrief Q&A API call failed. Error: %s", e)
        return {
            "response": fallback_response,
            "qa_count": new_count,
            "remaining": 3 - new_count
        }
