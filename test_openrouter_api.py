
import asyncio
import httpx
import json
import os
import sys

# Try to get API key from environment
api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    # Attempt to read from .env if present
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("OPENROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except:
        pass

if not api_key:
    print("BLOCKED: OPENROUTER_API_KEY not found in environment or .env")
    sys.exit(1)

# Models to test
models = ["deepseek/deepseek-v4-pro", "deepseek/deepseek-chat-v3-0324"]

async def test_payload(model, include_reasoning):
    print(f"\n--- Testing model: {model} (include_reasoning={include_reasoning}) ---")
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 10
    }
    if include_reasoning:
        payload["reasoning_effort"] = "xhigh"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            print(f"Status: {resp.status_code}")
            print(f"Body: {resp.text}")
            return resp.status_code
    except Exception as e:
        print(f"Error: {e}")
        return None

async def main():
    for model in models:
        # Test WITH reasoning_effort
        status_with = await test_payload(model, True)
        # Test WITHOUT reasoning_effort
        status_without = await test_payload(model, False)

if __name__ == "__main__":
    asyncio.run(main())
