"""Map voice BCP-47 tags to chat reply languages."""

from __future__ import annotations

SUPPORTED_CHAT_LANGUAGES = frozenset({"en", "ja"})

LANGUAGE_DISPLAY_NAMES: dict[str, str] = {
    "en": "English",
    "ja": "Japanese",
}

_USER_PREFIXES: dict[str, str] = {
    "en": (
        "Important: reply in English as one short, natural spoken line. "
        "Use one sentence when possible, never more than two short sentences.\n\n"
    ),
    "ja": (
        "【重要】次の返答は日本語のみで書いてください。"
        "音声読み上げ向けに、短く自然な日本語で答えてください。"
        "英語は使わないでください。\n\n"
    ),
}

_SYSTEM_LANGUAGE_RULES: dict[str, str] = {
    "en": (
        "Reply in English as one short, natural spoken line. "
        "Use one sentence when possible, never more than two short sentences."
    ),
    "ja": (
        "Reply only in Japanese. Keep answers short (max 3 sentences), "
        "cat-like tone, natural meows."
    ),
}


def normalize_chat_language(language: str) -> str:
    """Normalize voice tag or short code to a supported chat language."""
    raw = (language or "en").strip().lower().replace("_", "-")
    if not raw:
        return "en"
    primary = raw.split("-")[0]
    if primary in SUPPORTED_CHAT_LANGUAGES:
        return primary
    return "en"


def language_display_name(language: str) -> str:
    code = normalize_chat_language(language)
    return LANGUAGE_DISPLAY_NAMES.get(code, code.upper())


def message_for_response_language(message: str, language: str) -> str:
    """Prefix the user message so the model replies in the selected language."""
    code = normalize_chat_language(language)
    prefix = _USER_PREFIXES.get(code)
    if prefix:
        return f"{prefix}{message}"
    return message


def system_language_rule(language: str) -> str | None:
    """Extra system instruction for Groq (and similar) per chat language."""
    code = normalize_chat_language(language)
    return _SYSTEM_LANGUAGE_RULES.get(code)
