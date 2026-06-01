# Deploy

**Primary guide:** [RENDER.md](RENDER.md)

## Quick reference

- **Host:** [Render](https://render.com) — Web Service, **Docker**, Free tier
- **Health check:** `/health`
- **Start:** `python serve.py` (via Dockerfile `CMD` — do not override with `$PORT` in the dashboard)
- **Prod dependencies:** `requirements-prod.txt` (Groq + OAuth only)

## Local vs production

| | Local | Render |
|---|--------|--------|
| Run | `python app.py` | Docker → `serve.py` → gunicorn |
| URL | http://127.0.0.1:5000 | https://*.onrender.com |
| Full deps | `requirements.txt` | `requirements-prod.txt` in image |
