
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from supertokens_python import get_all_cors_headers
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

# ── 1. Initialise SuperTokens BEFORE the app uses it ──────────────────────────
from src.supertokens_config import init_supertokens

init_supertokens()

# ── 2. Create FastAPI app ──────────────────────────────────────────────────────
from src.database import engine
from src import models
from src.projects import models as project_models
from src.meeting import models as meeting_models
from src.knowledge import models as knowledge_models

models.Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager
import asyncio
from src.meeting.consumer import consume_meeting_events

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: spawn the redis consumer
    task = asyncio.create_task(consume_meeting_events())
    yield
    # Shutdown: cancel the consumer
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="MyApp API",
    version="1.0.0",
    description="FastAPI backend with SuperTokens Social Auth (Google + GitHub)",
    lifespan=lifespan,
)

# ── 3. SuperTokens ASGI middleware ─────────────────────────────────────────────
# Must be added before CORSMiddleware so SuperTokens can intercept /auth/* routes
app.add_middleware(get_middleware())

# ── 4. CORS ────────────────────────────────────────────────────────────────────
# get_all_cors_headers() returns the extra headers SuperTokens needs exposed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # replace with your frontend domain(s)
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type"] + get_all_cors_headers(),
)


# ── 5. Public routes ───────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    """Simple liveness probe — no auth required."""
    return JSONResponse({"status": "ok"})


# ── 6. Protected routes ────────────────────────────────────────────────────────
# verify_session() validates the SuperTokens session cookie/header and injects
# the SessionContainer. Unauthenticated requests get a 401 automatically.

from fastapi import HTTPException
from src.database import get_db
from src.models import User
from src.schemas import UserResponse
from sqlalchemy.orm import Session

@app.get("/api/me", tags=["user"], response_model=UserResponse)
async def get_current_user(
    session: SessionContainer = Depends(verify_session()),
    db: Session = Depends(get_db)
):
    """
    Returns the authenticated user's rich profile from PostgreSQL.
    """
    supertokens_user_id = session.get_user_id()
    
    user = db.query(User).filter(User.supertokens_id == supertokens_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found in database")
        
    return user


@app.get("/api/protected", tags=["example"])
async def protected_route(
    session: SessionContainer = Depends(verify_session()),
) -> JSONResponse:
    """Example protected endpoint — only reachable with a valid session."""
    user_id = session.get_user_id()
    return JSONResponse(
        {
            "message": "You are authenticated!",
            "userId": user_id,
        }
    )

# ── 7. Include Feature Routers ────────────────────────────────────────────────
from src.projects.router import router as projects_router
from src.projects.router import invitations_router
from src.meeting.router import router as meetings_router
from src.meeting.router import space_router as spaces_router
from src.meeting.router import session_router
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.ai_chat.router import router as ai_chat_router
from src.knowledge.router import router as knowledge_router

app.include_router(projects_router)
app.include_router(invitations_router)
app.include_router(meetings_router)
app.include_router(spaces_router)
app.include_router(session_router)
app.include_router(ai_chat_router)
app.include_router(knowledge_router)