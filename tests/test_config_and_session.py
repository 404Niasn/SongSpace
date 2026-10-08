from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.database.session import get_session


def test_config_rejects_non_postgresql():
    with pytest.raises(ValidationError, match="postgresql\\+psycopg"):
        Settings(_env_file=None, database_url="sqlite:///example.db")


def test_session_rolls_back_and_closes_on_failure():
    session = MagicMock()
    factory = MagicMock()
    factory.return_value.__enter__.return_value = session
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(session_factory=factory)))
    dependency = get_session(request)
    assert next(dependency) is session
    with pytest.raises(RuntimeError, match="failed write"):
        dependency.throw(RuntimeError("failed write"))
    session.rollback.assert_called_once()
    factory.return_value.__exit__.assert_called_once()
    session.commit.assert_not_called()
