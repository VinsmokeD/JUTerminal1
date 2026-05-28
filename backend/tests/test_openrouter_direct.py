import asyncio
import httpx
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.config import settings

async def test_direct():
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.AI_HTTP_REFERER,
        "X-Title": settings.AI_X_TITLE,
    }
    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {"role": "user", "content": "Say hello and tell me a random number."}
        ]
    }
    print("Sending to model:", settings.OPENROUTER_MODEL)
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        print("Status:", resp.status_code)
        try:
            raw_text = repr(resp.json())
            sys.stdout.buffer.write(raw_text.encode('ascii', errors='backslashreplace') + b'\n')
        except Exception as e:
            print("Failed to decode JSON:", str(e))

if __name__ == "__main__":
    asyncio.run(test_direct())
