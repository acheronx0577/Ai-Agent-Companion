"""Flask auth: Google OAuth fallback and Convex session bridge."""

import os
import secrets

from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from flask import Blueprint, jsonify, redirect, request, session, url_for

import convex_usage
from request_security import check_rate_limit, same_origin_request_allowed

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
_oauth_client = None


def load_auth_env() -> None:
    load_dotenv()


def google_oauth_configured() -> bool:
    load_auth_env()
    return bool(
        os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
        and os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
    )


def init_auth(app) -> None:
    global _oauth_client
    load_auth_env()

    secret = os.environ.get("FLASK_SECRET_KEY")
    if not secret:
        secret = secrets.token_hex(32)
        app.logger.warning(
            "FLASK_SECRET_KEY is not set. Sessions will reset when the server restarts."
        )
    app.secret_key = secret

    if not google_oauth_configured():
        _oauth_client = None
        return

    oauth = OAuth(app)
    _oauth_client = oauth.register(
        name="google",
        client_id=os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


def get_google_client():
    """Return the registered Google OAuth client, or None if OAuth is not configured."""
    return _oauth_client


def _require_google_client():
    """OAuth client after config check; raises if init_auth did not register Google."""
    client = _oauth_client
    if client is None:
        raise RuntimeError("Google OAuth client is not initialized")
    return client


def get_current_user() -> dict | None:
    user = session.get("user")
    return user if isinstance(user, dict) and user.get("id") else None


def user_is_authenticated() -> bool:
    return get_current_user() is not None


def _store_session_user(user: dict) -> dict:
    """Replace any existing cookie session with a server-verified user profile."""
    session.clear()
    session["user"] = user
    session.permanent = True
    return user


def _rate_limit_error(retry_after_seconds: int):
    response = jsonify({"error": "Too many requests. Try again shortly."})
    response.headers["Retry-After"] = str(retry_after_seconds)
    return response, 429


@auth_bp.route("/me")
def auth_me():
    user = get_current_user()
    return jsonify(
        {
            "authenticated": user is not None,
            "oauthConfigured": google_oauth_configured(),
            "user": user,
        }
    )


@auth_bp.route("/google")
def auth_google():
    rate = check_rate_limit(
        "auth-google", max_requests=20, window_seconds=300, include_user=False
    )
    if not rate.allowed:
        return _rate_limit_error(rate.retry_after_seconds)
    if not google_oauth_configured():
        return (
            "Google sign-in is not configured. "
            "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.",
            503,
        )

    google = _require_google_client()
    redirect_uri = url_for("auth.auth_google_callback", _external=True)
    return google.authorize_redirect(redirect_uri)


@auth_bp.route("/google/callback")
def auth_google_callback():
    if not google_oauth_configured():
        return (
            "Google sign-in is not configured. "
            "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.",
            503,
        )

    google = _require_google_client()
    token = google.authorize_access_token()
    user_info = token.get("userinfo")
    if not user_info:
        user_info = google.parse_id_token(token)

    _store_session_user(
        {
            "id": f"google:{user_info['sub']}",
            "googleSub": user_info["sub"],
            "email": user_info.get("email"),
            "name": user_info.get("name") or user_info.get("email") or "Google user",
            "picture": user_info.get("picture"),
        }
    )
    return redirect(url_for("index"))


@auth_bp.route("/convex-bridge", methods=["POST"])
def auth_convex_bridge():
    """Set Flask session from a profile resolved by verified Convex Auth JWT."""
    if not same_origin_request_allowed():
        return jsonify({"error": "Cross-origin request rejected"}), 403
    rate = check_rate_limit(
        "auth-convex-bridge", max_requests=20, window_seconds=60, include_user=False
    )
    if not rate.allowed:
        return _rate_limit_error(rate.retry_after_seconds)
    bearer_token = convex_usage.bearer_token_from_request(request)
    if not bearer_token:
        return jsonify({"error": "Convex bearer token is required"}), 401
    try:
        profile = convex_usage.fetch_verified_profile_via_convex(bearer_token)
    except ValueError:
        return jsonify({"error": "Convex authentication failed"}), 401
    user = _store_session_user(profile)
    return jsonify({"ok": True, "authenticated": True, "user": user})


@auth_bp.route("/logout", methods=["POST"])
def auth_logout():
    if not same_origin_request_allowed():
        return jsonify({"error": "Cross-origin request rejected"}), 403
    session.pop("user", None)
    return jsonify({"authenticated": False, "user": None})
