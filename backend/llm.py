"""Gemini LLM client and JSON extraction utilities."""

import asyncio
import json
import random
import re
from typing import Any, Optional

from google import genai
from google.genai import types
from google.genai.errors import APIError

from config import LLM_TIMEOUT


async def call_gemini(
    api_key: str,
    system: str,
    user: str,
    max_tokens: int = 3000,
    retries: int = 5,
) -> str:
    """Call Google Gemini with timeout, aggressive retry on 503/429, and longer backoff."""
    if not api_key or not api_key.strip():
        raise RuntimeError("API key is empty")

    models = ["gemini-2.5-flash"]
    last_exc: Optional[Exception] = None

    for attempt in range(retries):
        for model in models:
            client = genai.Client(api_key=api_key)
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model,
                        contents=user,
                        config=types.GenerateContentConfig(
                            system_instruction=system,
                            max_output_tokens=max_tokens,
                            temperature=0.7,
                        ),
                    ),
                    timeout=60,
                )
                if response.text and response.text.strip():
                    return response.text
                else:
                    raise RuntimeError("Empty response from Gemini")
            except asyncio.TimeoutError:
                last_exc = RuntimeError(f"Timeout after 60s on {model}")
            except APIError as e:
                code = str(e.code) if e.code else ""
                msg = getattr(e, "message", str(e))
                if code in ("503", "429", "500", "502"):
                    last_exc = RuntimeError(f"Gemini API error [{code}]: {msg}")
                    wait = (2 ** (attempt + 1)) + random.uniform(0, 2)
                    await asyncio.sleep(wait)
                    break
                else:
                    raise RuntimeError(f"Gemini API error [{code}]: {msg}")
            except Exception as e:
                raise RuntimeError(f"Gemini call failed: {str(e)}")

    raise last_exc or RuntimeError("All Gemini retries exhausted")


def extract_json(text: str) -> Any:
    """Robustly extract JSON from LLM response."""
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```", text)
    if m:
        return json.loads(m.group(1))
    m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if m:
        return json.loads(m.group(1))
    raise ValueError(f"No JSON found in:\n{text[:400]}")