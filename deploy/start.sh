#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec .venv/bin/python -m uvicorn app.main:app \
    --host 127.0.0.1 --port 8000 --workers 1 \
    --proxy-headers --forwarded-allow-ips 127.0.0.1
