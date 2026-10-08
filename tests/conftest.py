import os

import pytest

# Unit tests must not depend on local credentials or a running PostgreSQL server.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://unused:unused@127.0.0.1:5432/songspace")


@pytest.fixture
def settings():
    from app.config import Settings

    return Settings(
        _env_file=None,
        database_url="postgresql+psycopg://unused:unused@127.0.0.1:5432/songspace",
        cors_origins=["http://localhost:5173"],
    )
