"""Import every model here so Alembic sees the complete metadata."""

from app.models.asset import Asset
from app.models.exploration import MusicExploration
from app.models.placed_object import PlacedObject
from app.models.user import User
from app.models.world import World

__all__ = ["Asset", "MusicExploration", "PlacedObject", "User", "World"]
