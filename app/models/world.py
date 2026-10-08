from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdentityMixin, TimestampMixin


class World(IdentityMixin, TimestampMixin, Base):
    __tablename__ = "worlds"
    __table_args__ = (
        CheckConstraint("growth_points >= 0", name="growth_points_nonnegative"),
        CheckConstraint("state_version >= 1", name="state_version_positive"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    growth_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    state_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    # Scene-level settings only. Placed objects are normalized in their own table.
    state: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, server_default=text("'{}'::jsonb")
    )
