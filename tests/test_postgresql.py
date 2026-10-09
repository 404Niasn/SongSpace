"""Opt-in integration verification against a disposable schema, not a disposable database."""

import os
from uuid import uuid4

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from app.config import ROOT_DIR
from app.models import Asset, MusicExploration, PlacedObject, User, World

pytestmark = pytest.mark.integration


@pytest.fixture
def connection():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    engine = create_engine(url)
    schema = "songspace_test_" + uuid4().hex
    try:
        with engine.connect() as conn:
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
            conn.execute(text(f'SET search_path TO "{schema}"'))
            conn.commit()
            try:
                yield conn
            finally:
                conn.rollback()
                conn.execute(text("SET search_path TO public"))
                conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
                conn.commit()
    finally:
        engine.dispose()


def test_migration_roundtrip_and_world_object_chain(connection):
    config = Config(str(ROOT_DIR / "alembic.ini"))
    config.attributes["connection"] = connection
    command.upgrade(config, "head")
    command.check(config)
    assert set(inspect(connection).get_table_names()) == {
        "alembic_version",
        "users",
        "worlds",
        "music_explorations",
        "assets",
        "placed_objects",
        "game_profiles",
    }
    connection.commit()
    with Session(connection) as session:
        user = User(display_name="Migration Test")
        asset = Asset(key="paper-plane", name="Paper plane", category="decoration")
        session.add_all([user, asset])
        session.flush()
        world = World(user_id=user.id, name="Music world")
        session.add(world)
        session.flush()
        exploration = MusicExploration(world_id=world.id, song_title="Test song")
        session.add(exploration)
        session.flush()
        placed = PlacedObject(world_id=world.id, asset_id=asset.id, exploration_id=exploration.id)
        session.add(placed)
        session.commit()
        assert session.get(PlacedObject, placed.id).scale == 1
        assert session.get(World, world.id).state == {}

        # The same user cannot own a second world.
        with pytest.raises(IntegrityError), session.begin_nested():
            session.add(World(user_id=user.id, name="Duplicate"))
            session.flush()

        other_user = User(display_name="Other user")
        session.add(other_user)
        session.flush()
        other_world = World(user_id=other_user.id, name="Other world")
        session.add(other_world)
        session.flush()
        with pytest.raises(IntegrityError), session.begin_nested():
            session.add(
                PlacedObject(
                    world_id=other_world.id, asset_id=asset.id, exploration_id=exploration.id
                )
            )
            session.flush()
        with pytest.raises(IntegrityError), session.begin_nested():
            session.add(PlacedObject(world_id=world.id, asset_id=asset.id, scale=0))
            session.flush()
        session.commit()

        # Deleting a world must cascade to its explorations and placements together.
        session.delete(world)
        session.commit()
        assert session.scalar(text("SELECT count(*) FROM music_explorations")) == 0
        assert session.scalar(text("SELECT count(*) FROM placed_objects")) == 0

    connection.commit()
    command.downgrade(config, "base")
    assert inspect(connection).get_table_names() == ["alembic_version"]
    connection.commit()
    command.upgrade(config, "head")
    command.check(config)
