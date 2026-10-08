from uuid import UUID

from sqlalchemy import CheckConstraint, Float, ForeignKey, ForeignKeyConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdentityMixin, TimestampMixin


class PlacedObject(IdentityMixin, TimestampMixin, Base):
    __tablename__ = "placed_objects"
    __table_args__ = (
        ForeignKeyConstraint(
            ["world_id", "exploration_id"],
            ["music_explorations.world_id", "music_explorations.id"],
            ondelete="NO ACTION",
        ),
        CheckConstraint("scale > 0 AND scale < 'Infinity'::float8", name="scale_positive_finite"),
        CheckConstraint(
            "position_x > '-Infinity'::float8 AND position_x < 'Infinity'::float8 AND "
            "position_y > '-Infinity'::float8 AND position_y < 'Infinity'::float8 AND "
            "position_z > '-Infinity'::float8 AND position_z < 'Infinity'::float8 AND "
            "rotation_y > '-Infinity'::float8 AND rotation_y < 'Infinity'::float8",
            name="transform_finite",
        ),
        Index("ix_placed_objects_world_id_exploration_id", "world_id", "exploration_id"),
    )

    world_id: Mapped[UUID] = mapped_column(ForeignKey("worlds.id", ondelete="CASCADE"))
    asset_id: Mapped[UUID] = mapped_column(ForeignKey("assets.id", ondelete="RESTRICT"), index=True)
    # Nullable to allow starter objects; composite FK prevents cross-world provenance.
    exploration_id: Mapped[UUID | None] = mapped_column()
    position_x: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    position_y: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    position_z: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    rotation_y: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    scale: Mapped[float] = mapped_column(Float, default=1, server_default="1")
