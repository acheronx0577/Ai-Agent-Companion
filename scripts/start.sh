#!/bin/sh
set -e
# Railway sets PORT at runtime; gunicorn needs a numeric port (not literal $PORT).
PORT="${PORT:-8080}"
exec gunicorn app:app \
  --bind "0.0.0.0:${PORT}" \
  --workers 1 \
  --threads 4 \
  --timeout 120
