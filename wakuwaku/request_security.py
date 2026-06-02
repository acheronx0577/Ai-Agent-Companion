"""Small request-boundary security helpers for the single-worker Flask app."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import ceil
from threading import Lock
from time import monotonic
from urllib.parse import urlsplit

from flask import request, session

_MAX_RATE_BUCKETS = 10_000
_rate_buckets: dict[str, deque[float]] = {}
_rate_bucket_last_seen: dict[str, float] = {}
_rate_bucket_windows: dict[str, int] = {}
_rate_lock = Lock()


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int = 0


def current_user_key() -> str | None:
    """Return the verified Flask session user key when one is present."""
    user = session.get("user")
    if not isinstance(user, dict):
        return None
    user_id = user.get("id")
    return str(user_id) if user_id else None


def client_ip() -> str:
    """Use ProxyFix-normalized remote_addr instead of trusting raw X-Forwarded-For."""
    return request.remote_addr or "unknown"


def same_origin_request_allowed() -> bool:
    """Reject browser cross-origin state-changing requests when Origin is supplied."""
    origin = (request.headers.get("Origin") or "").strip()
    if not origin:
        return True
    parsed = urlsplit(origin)
    return parsed.scheme == request.scheme and parsed.netloc == request.host


def _bucket_keys(scope: str, *, include_user: bool) -> tuple[str, ...]:
    keys = [f"{scope}:ip:{client_ip()}"]
    user_key = current_user_key()
    if include_user and user_key:
        keys.append(f"{scope}:user:{user_key}")
    return tuple(keys)


def _prune_bucket(events: deque[float], cutoff: float) -> None:
    while events and events[0] <= cutoff:
        events.popleft()


def _prune_stale_buckets(now: float) -> None:
    for key in list(_rate_buckets):
        events = _rate_buckets[key]
        _prune_bucket(events, now - _rate_bucket_windows[key])
        if not events:
            _rate_buckets.pop(key, None)
            _rate_bucket_last_seen.pop(key, None)
            _rate_bucket_windows.pop(key, None)

    while len(_rate_buckets) >= _MAX_RATE_BUCKETS:
        oldest = min(_rate_bucket_last_seen, key=_rate_bucket_last_seen.get)
        _rate_buckets.pop(oldest, None)
        _rate_bucket_last_seen.pop(oldest, None)
        _rate_bucket_windows.pop(oldest, None)


def check_rate_limit(
    scope: str,
    *,
    max_requests: int,
    window_seconds: int,
    include_user: bool = True,
) -> RateLimitResult:
    """Apply an in-memory sliding window to both IP and authenticated user keys."""
    now = monotonic()
    cutoff = now - window_seconds
    keys = _bucket_keys(scope, include_user=include_user)

    with _rate_lock:
        _prune_stale_buckets(now)
        buckets = []
        retry_after = 0
        for key in keys:
            events = _rate_buckets.setdefault(key, deque())
            _prune_bucket(events, cutoff)
            _rate_bucket_last_seen[key] = now
            _rate_bucket_windows[key] = window_seconds
            buckets.append(events)
            if len(events) >= max_requests:
                retry_after = max(retry_after, ceil(events[0] + window_seconds - now))

        if retry_after > 0:
            return RateLimitResult(False, retry_after)

        for events in buckets:
            events.append(now)
        return RateLimitResult(True)


def clear_rate_limits() -> None:
    """Reset in-memory buckets for tests."""
    with _rate_lock:
        _rate_buckets.clear()
        _rate_bucket_last_seen.clear()
        _rate_bucket_windows.clear()
