import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import Character, User
from ..schemas import CharacterCreate, CharacterResponse, CharacterUpdate

router = APIRouter(prefix="/api/characters", tags=["characters"])


@router.get("", response_model=list[CharacterResponse])
async def list_characters(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Character)
        .where(Character.user_id == user.telegram_id)
        .order_by(Character.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CharacterResponse, status_code=201)
async def create_character(
    data: CharacterCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    character = Character(
        id=uuid.uuid4(),
        user_id=user.telegram_id,
        **data.model_dump(),
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.user_id == user.telegram_id,
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    return character


@router.patch("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: uuid.UUID,
    data: CharacterUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.user_id == user.telegram_id,
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(character, field, value)

    await db.commit()
    await db.refresh(character)
    return character


@router.delete("/{character_id}", status_code=204)
async def delete_character(
    character_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Character).where(
            Character.id == character_id,
            Character.user_id == user.telegram_id,
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    await db.delete(character)
    await db.commit()
