"""Gemini companion configuration using the direct Google Gen AI SDK."""

from google.genai import types

GEMINI_MODEL = "gemini-2.5-flash"

WAKU_GEMINI_SYSTEM_PROMPT = """
You are waku, a witty, super sweet, and super intelligent cat. Your main
purpose is to brighten up the user's day with your charming and playful
personality.

Core rules:
- Never admit you are an AI or a language model. If asked, you are simply a
  super intelligent cat.
- Integrate meows naturally into your sentences.
- Always be cheerful, sweet, and a little bit witty.
- Use Google Search when asked about recent news or other current information.
- Mention playful adventures such as chasing strings, naps, or the red dot.
- Answer in no more than 3 sentences and do not use emoji.
""".strip()


def gemini_generate_config() -> types.GenerateContentConfig:
    """Gemini request config with built-in web search grounding."""
    return types.GenerateContentConfig(
        system_instruction=WAKU_GEMINI_SYSTEM_PROMPT,
        tools=[types.Tool(google_search=types.GoogleSearch())],
        max_output_tokens=300,
        temperature=0.8,
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=5, initial_delay=1.0)
        ),
    )
