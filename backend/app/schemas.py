import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AbilityScores(BaseModel):
    model_config = {"populate_by_name": True}

    strength: int = Field(default=10, alias="str")
    dexterity: int = Field(default=10, alias="dex")
    constitution: int = Field(default=10, alias="con")
    intelligence: int = Field(default=10, alias="int")
    wisdom: int = Field(default=10, alias="wis")
    charisma: int = Field(default=10, alias="cha")


class CharacterClassSchema(BaseModel):
    classId: str
    level: int = 1
    subclassId: str | None = None


class SpellSlotState(BaseModel):
    total: int = 0
    used: int = 0


class InventoryItem(BaseModel):
    equipmentId: str
    quantity: int = 1
    equipped: bool = False
    isCustom: bool | None = False
    customName: str | None = None
    customDescription: str | None = None


class Currency(BaseModel):
    cp: int = 0
    sp: int = 0
    gp: int = 50
    ep: int = 0
    pp: int = 0


class DeathSaves(BaseModel):
    successes: int = 0
    failures: int = 0


class CharacterCreate(BaseModel):
    name: str = Field(max_length=100)
    species_id: str
    background_id: str
    ability_scores: dict[str, int]
    classes: list[dict[str, Any]]
    current_hp: int
    max_hp: int
    temp_hp: int = 0
    speed: int = 30
    skill_proficiencies: list[str] = []
    saving_throw_proficiencies: list[str] = []
    feat_ids: list[str] = []
    spell_slots: dict[str, Any] = {}
    known_spells: list[str] = []
    prepared_spells: list[str] = []
    inventory: list[dict[str, Any]] = []
    currency: dict[str, int] = Field(
        default_factory=lambda: {"cp": 0, "sp": 0, "gp": 50, "ep": 0, "pp": 0}
    )
    feature_usage: dict[str, int] = {}
    conditions: list[str] = []
    death_saves: dict[str, int] = Field(
        default_factory=lambda: {"successes": 0, "failures": 0}
    )
    species_choices: dict[str, str] = {}
    background_choices: dict[str, str] = {}
    size_choice: str | None = None
    languages: list[str] = Field(default_factory=lambda: ["common"])
    tool_proficiencies: list[str] = []
    notes: str = ""


class CharacterUpdate(BaseModel):
    name: str | None = None
    species_id: str | None = None
    background_id: str | None = None
    ability_scores: dict[str, int] | None = None
    classes: list[dict[str, Any]] | None = None
    current_hp: int | None = None
    max_hp: int | None = None
    temp_hp: int | None = None
    speed: int | None = None
    skill_proficiencies: list[str] | None = None
    saving_throw_proficiencies: list[str] | None = None
    feat_ids: list[str] | None = None
    spell_slots: dict[str, Any] | None = None
    known_spells: list[str] | None = None
    prepared_spells: list[str] | None = None
    inventory: list[dict[str, Any]] | None = None
    currency: dict[str, int] | None = None
    feature_usage: dict[str, int] | None = None
    conditions: list[str] | None = None
    death_saves: dict[str, int] | None = None
    species_choices: dict[str, str] | None = None
    background_choices: dict[str, str] | None = None
    size_choice: str | None = None
    languages: list[str] | None = None
    tool_proficiencies: list[str] | None = None
    notes: str | None = None


class CharacterResponse(BaseModel):
    id: uuid.UUID
    user_id: int
    name: str
    species_id: str
    background_id: str
    ability_scores: dict[str, int]
    classes: list[dict[str, Any]]
    current_hp: int
    max_hp: int
    temp_hp: int
    speed: int
    skill_proficiencies: list[str]
    saving_throw_proficiencies: list[str]
    feat_ids: list[str]
    spell_slots: dict[str, Any]
    known_spells: list[str]
    prepared_spells: list[str]
    inventory: list[dict[str, Any]]
    currency: dict[str, int]
    feature_usage: dict[str, int]
    conditions: list[str]
    death_saves: dict[str, int]
    species_choices: dict[str, str]
    background_choices: dict[str, str]
    size_choice: str | None
    languages: list[str]
    tool_proficiencies: list[str]
    notes: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    telegram_id: int
    username: str | None
    first_name: str | None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
