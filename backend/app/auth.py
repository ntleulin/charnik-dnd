import hashlib
import hmac
import os
from urllib.parse import parse_qs, unquote

import json
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import User


DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
BOT_TOKEN = os.getenv("BOT_TOKEN", "")


def validate_init_data(init_data: str, bot_token: str) -> dict:
    """Validate Telegram Mini App initData using HMAC-SHA256."""
    parsed = parse_qs(init_data)

    # Extract hash
    received_hash = parsed.get("hash", [None])[0]
    if not received_hash:
        raise ValueError("Missing hash in initData")

    # Build data-check-string (sorted key=value pairs without hash)
    data_pairs = []
    for key, values in parsed.items():
        if key == "hash":
            continue
        data_pairs.append(f"{key}={unquote(values[0])}")
    data_pairs.sort()
    data_check_string = "\n".join(data_pairs)

    # Compute HMAC
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode(), hashlib.sha256
    ).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("Invalid initData signature")

    # Parse user
    user_json = parsed.get("user", [None])[0]
    if not user_json:
        raise ValueError("Missing user in initData")

    return json.loads(unquote(user_json))


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate Telegram user from Authorization header."""

    if DEV_MODE:
        # Dev mode: use mock user or telegram_id from header
        dev_id = int(request.headers.get("X-Dev-User-Id", "12345"))
        result = await db.execute(select(User).where(User.telegram_id == dev_id))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                telegram_id=dev_id,
                username="dev_user",
                first_name="Developer",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    # Production: validate initData
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    init_data = auth_header.removeprefix("tma ").removeprefix("Bearer ")

    try:
        user_data = validate_init_data(init_data, BOT_TOKEN)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    telegram_id = user_data["id"]

    # Get or create user
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user
