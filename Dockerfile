# Railway Dockerfile builder. Python 3.12 + slim deps.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DISABLE_PIPER=1

COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

COPY . .

RUN chmod +x scripts/start.sh

EXPOSE 8080

# Shell wrapper expands $PORT at runtime (exec-form CMD does not).
CMD ["/bin/sh", "/app/scripts/start.sh"]
