#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

python_bin="${PYTHON_BIN:-python3.12}"
"$python_bin" -c 'import platform, sys; assert sys.version_info[:2] == (3, 12), "Use Python 3.12"; assert platform.system() == "Linux" and platform.machine() == "x86_64", "Offline wheels require Linux x86_64"'

if [[ ! -f .env ]]; then
    (umask 077; cp deploy/env.production.example .env)
    echo 'Created .env. Set DATABASE_URL, then run this script again.'
    exit 1
fi

if [[ ! -x .venv/bin/python ]]; then
    "$python_bin" -m venv .venv
fi
.venv/bin/python -m pip install --no-index --find-links wheels -r deploy/requirements-production.txt
.venv/bin/python -m pip install --no-index --no-build-isolation --no-deps -e .
.venv/bin/python - <<'PY'
from app.config import Settings
settings = Settings()
assert "CHANGE_ME" not in settings.database_url.get_secret_value(), "Configure DATABASE_URL"
assert settings.app_env == "production" and not settings.debug, "Use production settings"
PY

# On updates, back up the database before running migrations.
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m alembic current
.venv/bin/python -m alembic check
mkdir -p logs
echo 'Backend prepared. Configure the process manager and Nginx next.'
