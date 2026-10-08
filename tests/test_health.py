from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database.session import get_session
from app.main import create_app


def test_liveness_and_openapi(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/v1/health").json() == {"status": "ok"}
        assert client.get("/openapi.json").status_code == 200


def test_readiness_success(settings):
    application = create_app(settings)
    session = MagicMock()
    application.dependency_overrides[get_session] = lambda: session
    with TestClient(application) as client:
        response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_readiness_failure_hides_database_error(settings):
    application = create_app(settings)
    session = MagicMock()
    session.execute.side_effect = OperationalError("secret connection data", {}, Exception())
    application.dependency_overrides[get_session] = lambda: session
    with TestClient(application) as client:
        response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "unavailable"}
    session.rollback.assert_called_once()


def test_cors_preflight(settings):
    with TestClient(create_app(settings)) as client:
        response = client.options(
            "/api/v1/health",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
        )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
