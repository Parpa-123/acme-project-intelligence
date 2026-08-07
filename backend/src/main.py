
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

# ── 1b. Configure Logging ────────────────────────────────────────────────────────
from src.core.logging import setup_logging
setup_logging()

# ── 2. Create FastAPI app ──────────────────────────────────────────────────────
from src.database import engine
from src import models
from src.projects import models as project_models
from src.meeting import models as meeting_models
from src.knowledge import models as knowledge_models

from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

models.Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager
import asyncio
import os
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from src.meeting.consumer import consume_meeting_events

async def poll_arq_queue_depth(redis_conn):
    from src.core.metrics import redis_queue_depth_gauge
    while True:
        try:
        except Exception:
            pass
        await asyncio.sleep(5)

async def keep_alive():
    import httpx
    import structlog
    logger = structlog.get_logger("keep_alive")
    # Use 127.0.0.1 instead of localhost to prevent IPv6 binding issues in Docker
    api_domain = os.environ.get("API_DOMAIN")
    if api_domain:
        if not api_domain.startswith("http"):
            api_domain = f"https://{api_domain}"
        ping_url = f"{api_domain.rstrip('/')}/health"
    else:
        ping_url = os.environ.get("PUBLIC_API_URL", "http://127.0.0.1:8000/health")
        
    while True:
        await asyncio.sleep(150)  # Ping every 2.5 minutes
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(ping_url, timeout=10.0)
                logger.info(f"Keep-alive ping sent to {ping_url}", status_code=resp.status_code)
        except Exception as e:
            logger.error(f"Keep-alive ping failed: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis for rate limiting and caching
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_conn = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_conn)
    
    from fastapi_cache import FastAPICache
    from fastapi_cache.backends.redis import RedisBackend
    # Create a separate connection for cache since it expects bytes, not decoded strings
    cache_conn = redis.from_url(redis_url)
    FastAPICache.init(RedisBackend(cache_conn), prefix="fastapi-cache")

    # Startup: spawn the redis consumer
    task = asyncio.create_task(consume_meeting_events())
    
    # Startup: spawn queue depth poller
    poll_task = asyncio.create_task(poll_arq_queue_depth(redis_conn))
    
    # Startup: spawn keep-alive task
    keep_alive_task = asyncio.create_task(keep_alive())
    
    yield
    
    # Shutdown: cancel the tasks and close redis
    task.cancel()
    poll_task.cancel()
    keep_alive_task.cancel()
    await redis_conn.close()
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

# ── 4. CORS and Security Headers ───────────────────────────────────────────────
from src.core.middleware import SecurityHeadersMiddleware, LoggingMiddleware
from asgi_correlation_id import CorrelationIdMiddleware

# Add logging and correlation ID middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# get_all_cors_headers() returns the extra headers SuperTokens needs exposed
import os
frontend_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],   # dynamic origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type"] + get_all_cors_headers(),
)

# ── 4b. Global Exception Handlers ──────────────────────────────────────────────
from src.core.exceptions import setup_exception_handlers
setup_exception_handlers(app)


# ── 4c. Prometheus Metrics ───────────────────────────────────────────────────────
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── 5. Public routes ───────────────────────────────────────────────────────────
from sqlalchemy import text
import redis.asyncio as aioredis
from fastapi import Response

@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    """Simple liveness probe — no auth required."""
    return JSONResponse({"status": "ok"})

from sqlalchemy.orm import Session
from src.database import get_db

@app.get("/ready", tags=["health"])
async def ready_check(db: Session = Depends(get_db)) -> Response:
    """Readiness probe checking PostgreSQL and Redis."""
    try:
        # Check Postgres
        db.execute(text("SELECT 1"))
        
        # Check Redis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        r = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await r.ping()
        await r.close()
        
        return JSONResponse({"status": "ready"})
    except Exception as e:
        return JSONResponse({"status": "unhealthy", "detail": str(e)}, status_code=503)


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

@app.get("/api/admin/reprocess-meetings", tags=["admin"])
async def reprocess_meetings(db: Session = Depends(get_db)):
    """Temporary endpoint to retroactively re-queue failed meetings into ARQ."""
    from src.meeting.models import Meeting, MeetingStatus, MeetingProcessingStatus, PipelineStatus
    from src.arq_client import enqueue_arq_job_sync
    
    meetings = db.query(Meeting).filter(Meeting.status == MeetingStatus.COMPLETED).all()
    count = 0
    for m in meetings:
        ps = db.query(MeetingProcessingStatus).filter_by(meeting_id=m.id).first()
        if not ps:
            ps = MeetingProcessingStatus(meeting_id=m.id)
            db.add(ps)
            
        ps.knowledge_status = PipelineStatus.PENDING
        ps.enrichment_status = PipelineStatus.PENDING
        db.commit()
        
        enqueue_arq_job_sync("process_meeting_knowledge", str(m.id))
        count += 1
        
    return JSONResponse({"status": "success", "reprocessed_count": count})

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
from src.ai_chat.router import router as chat_router
from src.documents.router import router as documents_router
from src.global_knowledge.router import router as global_knowledge_router

app.include_router(projects_router)
app.include_router(invitations_router)
app.include_router(meetings_router)
app.include_router(spaces_router)
app.include_router(session_router)
app.include_router(ai_chat_router)
app.include_router(knowledge_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(global_knowledge_router)