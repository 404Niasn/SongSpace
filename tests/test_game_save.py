import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import get_session
from app.main import create_app
from app.models.game_profile import GameProfile


@pytest.fixture
def game_client(settings, tmp_path):
    # Portable save schema, isolated from the real player database.
    engine = create_engine(
        f"sqlite:///{tmp_path / 'game.db'}", connect_args={"check_same_thread": False}
    )
    GameProfile.__table__.create(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def dependency():
        with factory() as session:
            yield session

    def application():
        app = create_app(settings)
        app.dependency_overrides[get_session] = dependency
        return app

    yield application
    engine.dispose()


def snapshot(notes=120):
    return {
        "game": {
            "name": "测试听众",
            "notes": notes,
            "owned": {},
            "packs": {"five": 1},
            "history": [],
        },
        "imagery": {"forest": [], "sea": [], "jiangnan": []},
    }


def test_save_survives_new_app_and_rejects_stale_write(game_client):
    with TestClient(game_client()) as client:
        created = client.post("/api/v1/game/sessions", json=snapshot())
        assert created.status_code == 201
        token = created.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        state = snapshot(170)
        state["game"]["owned"] = {"song-one": 2}
        state["imagery"]["sea"] = [{"songId": "song-one", "x": 1, "z": 2, "rotation": 0}]
        write = client.patch(
            "/api/v1/game/save", json={"revision": 0, "state": state}, headers=headers
        )
        assert write.json() == {"revision": 1}
        stale = client.patch(
            "/api/v1/game/save", json={"revision": 0, "state": snapshot(5)}, headers=headers
        )
        assert stale.status_code == 409
    with TestClient(game_client()) as restarted:
        restored = restarted.get("/api/v1/game/save", headers=headers).json()
        assert restored["state"] == state
        assert restored["revision"] == 1


def test_session_isolation_and_validation(game_client):
    with TestClient(game_client()) as client:
        assert client.get("/api/v1/game/save").status_code == 401
        assert (
            client.get("/api/v1/game/save", headers={"Authorization": "Bearer unknown"}).status_code
            == 401
        )
        first = client.post("/api/v1/game/sessions", json=snapshot(150)).json()
        second = client.post("/api/v1/game/sessions", json=snapshot(120)).json()
        assert first["id"] != second["id"]
        assert first["token"] != second["token"]
        headers = {"Authorization": "Bearer " + second["token"]}
        assert (
            client.get("/api/v1/game/save", headers=headers).json()["state"]["game"]["notes"] == 120
        )
        bad = snapshot(-1)
        assert client.post("/api/v1/game/sessions", json=bad).status_code == 422
        bad = snapshot()
        bad["game"]["owned"] = {"song-one": -1}
        assert client.post("/api/v1/game/sessions", json=bad).status_code == 422


def test_game_id_restores_saved_progress_and_accepts_pasted_id(game_client):
    with TestClient(game_client()) as client:
        created = client.post("/api/v1/game/sessions", json=snapshot(180)).json()
        assert created["token"].startswith("SS-")
        headers = {"Authorization": "Bearer " + created["token"]}
        state = snapshot(230)
        state["game"]["owned"] = {"collected-song": 3}
        assert client.patch(
            "/api/v1/game/save", json={"revision": 0, "state": state}, headers=headers
        ).status_code == 200
    with TestClient(game_client()) as other_device:
        restored = other_device.post(
            "/api/v1/game/sessions/restore",
            json={"game_id": "  " + created["token"].lower() + "  "},
        )
        assert restored.status_code == 200
        assert restored.json() == {
            **created, "revision": 1, "state": state, "game_id": created["token"]
        }
        assert other_device.post(
            "/api/v1/game/sessions/restore", json={"game_id": "SS-" + "A" * 26}
        ).status_code == 401
        assert other_device.post(
            "/api/v1/game/sessions/restore", json={"game_id": ""}
        ).status_code == 422


def test_legacy_session_id_remains_restorable(game_client):
    import hashlib

    from sqlalchemy.orm import Session

    app = game_client()
    legacy_id = "legacy-session-token-with-Case-1234567890"
    dependency = app.dependency_overrides[get_session]
    generator = dependency()
    session: Session = next(generator)
    try:
        profile = GameProfile(
            token_hash=hashlib.sha256(legacy_id.encode()).hexdigest(),
            display_name="测试听众", state=snapshot(),
        )
        session.add(profile)
        session.commit()
    finally:
        generator.close()
    with TestClient(app) as client:
        restored = client.post("/api/v1/game/sessions/restore", json={"game_id": legacy_id})
        assert restored.status_code == 200
        assert restored.json()["token"] == legacy_id


def test_named_account_registration_duplicate_and_restore(game_client):
    with TestClient(game_client()) as client:
        created = client.post("/api/v1/game/accounts", json={
            "game_id": "  乌龟听歌  ", "state": snapshot(180),
        })
        assert created.status_code == 201
        account = created.json()
        assert account["game_id"] == "乌龟听歌"
        assert account["token"].isascii()
        assert client.post("/api/v1/game/accounts", json={
            "game_id": "乌龟听歌", "state": snapshot(5),
        }).status_code == 409
        assert client.get("/api/v1/game/save", headers={
            "Authorization": "Bearer " + account["token"],
        }).json()["state"]["game"]["notes"] == 180
        for invalid in [" ", "a", "字" * 17, 123]:
            assert client.post("/api/v1/game/accounts", json={
                "game_id": invalid, "state": snapshot(),
            }).status_code == 422
    with TestClient(game_client()) as other_device:
        restored = other_device.post("/api/v1/game/sessions/restore", json={
            "game_id": "  乌龟听歌  ",
        })
        assert restored.status_code == 200
        assert restored.json() == account
