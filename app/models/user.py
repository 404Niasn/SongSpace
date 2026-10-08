from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdentityMixin, TimestampMixin


class User(IdentityMixin, TimestampMixin, Base):
    __tablename__ = "users"

    display_name: Mapped[str] = mapped_column(String(100))
