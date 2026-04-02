import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    telegram_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    characters: Mapped[list["Character"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    species_id: Mapped[str] = mapped_column(String(50))
    background_id: Mapped[str] = mapped_column(String(50))
    ability_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    classes: Mapped[list] = mapped_column(JSONB, default=list)
    current_hp: Mapped[int] = mapped_column(Integer, default=0)
    max_hp: Mapped[int] = mapped_column(Integer, default=0)
    temp_hp: Mapped[int] = mapped_column(Integer, default=0)
    speed: Mapped[int] = mapped_column(Integer, default=30)
    skill_proficiencies: Mapped[list] = mapped_column(JSONB, default=list)
    saving_throw_proficiencies: Mapped[list] = mapped_column(JSONB, default=list)
    feat_ids: Mapped[list] = mapped_column(JSONB, default=list)
    spell_slots: Mapped[dict] = mapped_column(JSONB, default=dict)
    known_spells: Mapped[list] = mapped_column(JSONB, default=list)
    prepared_spells: Mapped[list] = mapped_column(JSONB, default=list)
    inventory: Mapped[list] = mapped_column(JSONB, default=list)
    currency: Mapped[dict] = mapped_column(
        JSONB, default=lambda: {"cp": 0, "sp": 0, "gp": 50, "ep": 0, "pp": 0}
    )
    feature_usage: Mapped[dict] = mapped_column(JSONB, default=dict)
    conditions: Mapped[list] = mapped_column(JSONB, default=list)
    death_saves: Mapped[dict] = mapped_column(
        JSONB, default=lambda: {"successes": 0, "failures": 0}
    )
    species_choices: Mapped[dict] = mapped_column(JSONB, default=dict)
    background_choices: Mapped[dict] = mapped_column(JSONB, default=dict)
    size_choice: Mapped[str | None] = mapped_column(String(20))
    languages: Mapped[list] = mapped_column(JSONB, default=lambda: ["common"])
    tool_proficiencies: Mapped[list] = mapped_column(JSONB, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="characters")
