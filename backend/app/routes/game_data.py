import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/game-data", tags=["game-data"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "src" / "data"


@lru_cache(maxsize=1)
def _load_json(filename: str) -> Any:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"{filename} not found")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _load_all_classes() -> dict[str, Any]:
    classes_dir = DATA_DIR / "classes"
    if not classes_dir.exists():
        return {}
    result = {}
    for filepath in sorted(classes_dir.glob("*.json")):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            result[data.get("id", filepath.stem)] = data
    return result


@router.get("/classes")
async def get_classes() -> dict[str, Any]:
    return _load_all_classes()


@router.get("/classes/{class_id}")
async def get_class(class_id: str) -> Any:
    classes = _load_all_classes()
    if class_id not in classes:
        raise HTTPException(status_code=404, detail=f"Класс '{class_id}' не найден")
    return classes[class_id]


@router.get("/species")
async def get_species() -> Any:
    return _load_json("species.json")


@router.get("/backgrounds")
async def get_backgrounds() -> Any:
    return _load_json("backgrounds.json")


@router.get("/spells")
async def get_spells() -> Any:
    return _load_json("spells.json")


@router.get("/equipment")
async def get_equipment() -> Any:
    return _load_json("equipment.json")


@router.get("/feats")
async def get_feats() -> Any:
    return _load_json("feats.json")
