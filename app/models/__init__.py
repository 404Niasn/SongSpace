"""Import every model here so Alembic sees the complete metadata."""

from app.models.asset import Asset
from app.models.exploration import MusicExploration
from app.models.game_profile import GameProfile
from app.models.placed_object import PlacedObject
from app.models.user import User
from app.models.world import World

__all__ = ["Asset", "GameProfile", "MusicExploration", "PlacedObject", "User", "World"]
