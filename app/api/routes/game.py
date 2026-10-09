"""Versioned game saves. Game scoring is still client-side, not an anti-cheat API."""

import base64
import hashlib
import json
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.models.game_profile import GameProfile

router = APIRouter(prefix="/game", tags=["game"])


class GameState(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str = Field(default="", max_length=16)
    notes: int = Field(ge=0, le=1_000_000_000)
    owned: dict[str, int]
    packs: dict[str, int]

    @field_validator("owned", "packs")
    @classmethod
    def bounded_inventory(cls, value):
        if len(value) > 250 or any(n < 0 or n > 1_000_000 for n in value.values()):
            raise ValueError("Invalid inventory")
        return value


class Snapshot(BaseModel):
    game: GameState
    imagery: dict = Field(default_factory=dict)


class WriteSave(BaseModel):
    revision: int = Field(ge=0)
    state: Snapshot


class RestoreSession(BaseModel):
    game_id: str = Field(min_length=2, max_length=80)

    @field_validator("game_id", mode="before")
    @classmethod
    def clean_id(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        value = value.strip()
        return value.upper() if len(value) > 20 and value.upper().startswith("SS-") else value


class RegisterSession(BaseModel):
    game_id: str = Field(min_length=2, max_length=16)
    state: Snapshot

    @field_validator("game_id", mode="before")
    @classmethod
    def clean_id(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


def named_token(game_id: str) -> str:
    # Bearer headers must remain ASCII even when the chosen ID contains Chinese.
    return "ID-" + base64.urlsafe_b64encode(game_id.encode()).decode().rstrip("=")


def serialized(state: Snapshot) -> dict:
    value = state.model_dump(mode="json")
    if len(json.dumps(value).encode()) > 262_144:
        raise HTTPException(413, "Save exceeds size limit")
    return value


def profile_for(session: Session, authorization: str | None) -> GameProfile:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Session required")
    digest = hashlib.sha256(authorization[7:].encode()).hexdigest()
    profile = session.scalar(select(GameProfile).where(GameProfile.token_hash == digest))
    if not profile:
        raise HTTPException(401, "Session not found")
    return profile


def response(profile: GameProfile) -> dict:
    return {"id": str(profile.id), "revision": profile.revision, "state": profile.state}


@router.post("/sessions", status_code=201)
def create_session(state: Snapshot, session: Annotated[Session, Depends(get_session)]):
    code = base64.b32encode(secrets.token_bytes(16)).decode().rstrip("=")
    token = "SS-" + "-".join(code[i : i + 5] for i in range(0, len(code), 5))
    profile = GameProfile(
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        display_name=state.game.name,
        state=serialized(state),
    )
    session.add(profile)
    session.commit()
    return {**response(profile), "token": token}


@router.post("/sessions/restore")
def restore_session(body: RestoreSession, session: Annotated[Session, Depends(get_session)]):
    token = named_token(body.game_id)
    digest = hashlib.sha256(token.encode()).hexdigest()
    profile = session.scalar(select(GameProfile).where(GameProfile.token_hash == digest))
    if profile is None:
        token = body.game_id
        profile = profile_for(session, "Bearer " + token)
    return {**response(profile), "token": token, "game_id": body.game_id}


@router.post("/accounts", status_code=201)
def register_account(body: RegisterSession, session: Annotated[Session, Depends(get_session)]):
    token = named_token(body.game_id)
    profile = GameProfile(
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        display_name=body.state.game.name,
        state=serialized(body.state),
    )
    session.add(profile)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Account ID already exists") from None
    return {**response(profile), "token": token, "game_id": body.game_id}


@router.get("/save")
def read_save(
    session: Annotated[Session, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
):
    return response(profile_for(session, authorization))


@router.patch("/save")
def write_save(
    body: WriteSave,
    session: Annotated[Session, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
):
    profile = profile_for(session, authorization)
    result = session.execute(
        update(GameProfile)
        .where(GameProfile.id == profile.id, GameProfile.revision == body.revision)
        .values(
            state=serialized(body.state),
            display_name=body.state.game.name,
            revision=body.revision + 1,
        )
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        session.rollback()
        raise HTTPException(409, "A newer save exists. Your local progress was kept.")
    session.commit()
    return {"revision": body.revision + 1}
