from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.schemas.health import HealthResponse, ReadinessResponse
from app.services.health import database_is_ready

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get(
    "/health/ready", response_model=ReadinessResponse, responses={503: {"model": ReadinessResponse}}
)
def readiness(
    response: Response, session: Annotated[Session, Depends(get_session)]
) -> ReadinessResponse:
    if not database_is_ready(session):
        response.status_code = 503
        return ReadinessResponse(status="unavailable", database="unavailable")
    return ReadinessResponse(status="ok", database="connected")
