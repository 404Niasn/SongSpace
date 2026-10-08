from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdentityMixin, TimestampMixin


class Asset(IdentityMixin, TimestampMixin, Base):
    __tablename__ = "assets"

    key: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50), index=True)
    resource_uri: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
