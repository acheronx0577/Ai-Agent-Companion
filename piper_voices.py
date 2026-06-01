"""Piper TTS voice catalog and loading (local ONNX files in voices/)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

try:
    from piper.voice import PiperVoice
except ImportError:
    PiperVoice = None  # type: ignore[misc, assignment]

VOICES_DIR = Path("voices")

PIPER_VOICE_CATALOG: tuple[dict[str, str], ...] = (
    {
        "id": "en_US-hfc_female-medium",
        "lang": "en",
        "locale": "en-US",
        "label": "Piper Natural Voice Female (en-US)",
    },
    {
        "id": "es_ES-sharvard-medium",
        "lang": "es",
        "locale": "es-ES",
        "label": "Piper Natural Voice Female (es-ES)",
    },
    {
        "id": "zh_CN-huayan-medium",
        "lang": "zh",
        "locale": "zh-CN",
        "label": "Piper Natural Voice Female (zh-CN)",
    },
    {
        "id": "vi_VN-25hours_single-low",
        "lang": "vi",
        "locale": "vi-VN",
        "label": "Piper Natural Voice (vi-VN)",
    },
)

BROWSER_VOICE_MENU: tuple[dict[str, str], ...] = (
    {
        "lang": "en",
        "locale": "en-US",
        "label": "English Device Voice (en-US)",
    },
    {
        "lang": "es",
        "locale": "es-ES",
        "label": "Spanish Device Voice (es-ES)",
    },
    {
        "lang": "ko",
        "locale": "ko-KR",
        "label": "Korean Device Voice (ko-KR)",
    },
)

_voice_lock = Lock()
_voice_cache: dict[str, Any] = {}
_availability_cache: dict[str, bool] | None = None
_availability_stamp: float = 0.0


def piper_disabled() -> bool:
    return os.environ.get("DISABLE_PIPER", "").lower() in ("1", "true", "yes")


def max_loaded_piper_voices() -> int:
    raw = os.environ.get("PIPER_MAX_LOADED_VOICES", "1").strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return 1


def voice_paths(voice_id: str) -> tuple[Path, Path]:
    return (
        VOICES_DIR / f"{voice_id}.onnx",
        VOICES_DIR / f"{voice_id}.onnx.json",
    )


def voice_files_present(voice_id: str) -> bool:
    model_path, config_path = voice_paths(voice_id)
    return model_path.is_file() and config_path.is_file()


def _catalog_stamp() -> float:
    stamp = 0.0
    for entry in PIPER_VOICE_CATALOG:
        for path in voice_paths(entry["id"]):
            if path.is_file():
                stamp = max(stamp, path.stat().st_mtime)
    return stamp


def voice_availability() -> dict[str, bool]:
    """File-presence only — does not load ONNX models."""
    global _availability_cache, _availability_stamp
    stamp = _catalog_stamp()
    if _availability_cache is not None and stamp == _availability_stamp:
        return _availability_cache
    piper_ok = not piper_disabled() and PiperVoice is not None
    _availability_cache = {
        entry["id"]: piper_ok and voice_files_present(entry["id"])
        for entry in PIPER_VOICE_CATALOG
    }
    _availability_stamp = stamp
    return _availability_cache


def clear_piper_runtime_cache() -> None:
    """Drop loaded models (tests / memory pressure)."""
    with _voice_lock:
        _voice_cache.clear()


@dataclass(frozen=True)
class PiperVoiceInfo:
    """Installed Piper voice entry exposed to the voice picker API."""

    id: str
    lang: str
    locale: str
    label: str

    def to_json(self) -> dict[str, str]:
        return {
            "id": self.id,
            "lang": self.lang,
            "locale": self.locale,
            "label": self.label,
            "available": True,
        }


def list_piper_voice_menu() -> list[dict[str, str | bool]]:
    availability = voice_availability()
    return [
        {**entry, "available": availability.get(entry["id"], False)}
        for entry in PIPER_VOICE_CATALOG
    ]


def list_browser_voice_menu() -> list[dict[str, str]]:
    return [dict(entry) for entry in BROWSER_VOICE_MENU]


def list_available_piper_voices() -> list[PiperVoiceInfo]:
    availability = voice_availability()
    return [
        PiperVoiceInfo(**entry)
        for entry in PIPER_VOICE_CATALOG
        if availability.get(entry["id"], False)
    ]


def default_piper_voice_id() -> str | None:
    availability = voice_availability()
    for entry in PIPER_VOICE_CATALOG:
        if availability.get(entry["id"]):
            return entry["id"]
    return None


def resolve_piper_voice_id(requested: str | None) -> str | None:
    availability = voice_availability()
    if requested and availability.get(requested):
        return requested
    return default_piper_voice_id()


def _evict_loaded_voices(keep_id: str) -> None:
    limit = max_loaded_piper_voices()
    while len(_voice_cache) > limit - 1:
        evicted = False
        for voice_id in list(_voice_cache.keys()):
            if voice_id != keep_id:
                del _voice_cache[voice_id]
                evicted = True
                break
        if not evicted:
            break


def get_piper_voice(voice_id: str | None = None):
    """Load one Piper model on demand; evicts others when PIPER_MAX_LOADED_VOICES=1."""
    if piper_disabled() or PiperVoice is None:
        return None
    resolved_id = resolve_piper_voice_id(voice_id)
    if resolved_id is None:
        return None
    cached = _voice_cache.get(resolved_id)
    if cached is not None:
        return cached
    model_path, config_path = voice_paths(resolved_id)
    if not (model_path.is_file() and config_path.is_file()):
        return None
    with _voice_lock:
        cached = _voice_cache.get(resolved_id)
        if cached is not None:
            return cached
        _evict_loaded_voices(resolved_id)
        loaded = PiperVoice.load(
            model_path=model_path,
            config_path=config_path,
            use_cuda=False,
            download_dir=VOICES_DIR,
        )
        _voice_cache[resolved_id] = loaded
        return loaded
