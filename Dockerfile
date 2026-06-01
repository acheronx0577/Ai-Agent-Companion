# Render (Docker). Slim image — Piper disabled (browser TTS on cloud; Piper locally).
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PRODUCTION=1 \
    DISABLE_PIPER=1 \
    PIPER_MAX_LOADED_VOICES=1

COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .

RUN sed -i 's/\r$//' scripts/start.sh 2>/dev/null || true

EXPOSE 10000

CMD ["python", "serve.py"]
