# Railway Dockerfile builder (alternative to Nixpacks). Python 3.12 + slim deps.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DISABLE_PIPER=1

COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

COPY . .

EXPOSE 8080

CMD gunicorn app:app --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 4 --timeout 120
