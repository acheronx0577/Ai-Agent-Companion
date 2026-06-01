# Deploy on Render

Host the Flask app on [Render](https://render.com). Convex (when added) stays on [Convex Cloud](https://convex.dev).

## What Render runs

| Component | On Render |
|-----------|-----------|
| Flask (`/`, `/chat`, `/tts`, `/auth/*`) | Yes (Docker) |
| Groq API | External (env var) |
| Google OAuth | Your `https://….onrender.com` URL |
| Piper TTS | Off by default (`DISABLE_PIPER=1`) — browser voice works |
| Convex | Not on Render — set `CONVEX_URL` in env when ready |

---

## 1. Push code to GitHub

Commit includes `Dockerfile`, `serve.py`, and `requirements-prod.txt`.

---

## 2. Create a Web Service

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect **GitHub** → repo **Ai-Companion**
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `wakuwaku-companion` (or any name) |
| **Region** | Closest to you |
| **Branch** | `main` |
| **Runtime** | **Docker** |
| **Instance type** | Free |

Render auto-detects the root `Dockerfile`. Do **not** set a custom Docker command with `$PORT`.

4. **Advanced** → **Health Check Path**: `/health`

---

## 3. Environment variables

In the service → **Environment**:

| Variable | Required |
|----------|----------|
| `GROQ_API_KEY` | Yes |
| `FLASK_SECRET_KEY` | Yes (long random string) |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes |
| `DISABLE_PIPER` | `1` (recommended on Free tier) |

Do **not** set `PORT` — Render sets it automatically.

Optional: `PRODUCTION=1` (enables secure cookies behind HTTPS proxy).

---

## 4. Google OAuth redirect URI

After first deploy, copy your URL, e.g. `https://wakuwaku-companion.onrender.com`.

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client → **Authorized redirect URIs**:

```text
https://YOUR-SERVICE.onrender.com/auth/google/callback
```

Keep for local dev:

```text
http://127.0.0.1:5000/auth/google/callback
```

---

## 5. Deploy and test

1. Wait for **Live** status (first build ~5–10 min).
2. Open `https://YOUR-SERVICE.onrender.com/health` → `"status": "ok"`
3. Sign in with Google → send a chat message.

**Note:** Free tier **spins down** after ~15 min idle; first visit may take 30–60s to wake up.

---

## Pre-flight (local)

```powershell
python scripts/check_deploy_env.py
python -m unittest tests.test_serve tests.test_deploy -v
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Render build logs; confirm `Dockerfile` at repo root |
| 502 on wake | Normal on Free tier — wait and refresh |
| Google login error | Redirect URI must match `https://….onrender.com/auth/google/callback` exactly |
| No CSS | Ensure `static/` is in the repo (not in `.dockerignore`) |

See also [DEPLOY.md](DEPLOY.md).
