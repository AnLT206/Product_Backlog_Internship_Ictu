#!/bin/sh
# Chạy trong container backend: seed admin (dev) rồi start API.
set -e

pip install --no-cache-dir -r requirements.txt

SEED_ON_STARTUP="${ADMIN_SEED_ON_STARTUP:-true}"
if [ "$SEED_ON_STARTUP" = "true" ] || [ "$SEED_ON_STARTUP" = "1" ]; then
  echo "[backend] seed admin (ADMIN_SEED_ON_STARTUP=$SEED_ON_STARTUP)…"
  PYTHONPATH=. python -m scripts.seed_admin
else
  echo "[backend] bỏ qua seed admin (ADMIN_SEED_ON_STARTUP=$SEED_ON_STARTUP)"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
