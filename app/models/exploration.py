from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdentityMixin, TimestampMixin


class MusicExploration(IdentityMixin, TimestampMixin, Base):
    __tablename__ = "music_explorations"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed', 'failed')", name="status_valid"),
        UniqueConstraint("world_id", "id"),
    )

    world_id: Mapped[UUID] = mapped_column(ForeignKey("worlds.id", ondelete="CASCADE"), index=True)
    song_title: Mapped[str] = mapped_column(String(200))
    artist: Mapped[str | None] = mapped_column(String(200))
    provider: Mapped[str | None] = mapped_column(String(50))
    provider_song_id: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    # Future versioned AI output: emotions, imagery, candidate object descriptions.
    analysis: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, server_default=text("'{}'::jsonb")
    )
