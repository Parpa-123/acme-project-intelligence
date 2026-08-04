from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from src.projects.service import ProjectService
from .schemas import (
    KnowledgeChunkResponse, PaginatedResponse, SearchResultResponse, PinKnowledgeRequest,
    DecisionResponse, ActionItemResponse, RequirementResponse, ConcernResponse, TopicResponse, MeetingSummaryResponse
)
from .explorer import KnowledgeExplorer

router = APIRouter(prefix="/projects/{project_id}/knowledge", tags=["Knowledge Explorer"])

def verify_project_access(project_id: int, db: Session, session: SessionContainer):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    return user

@router.post("/pin", response_model=KnowledgeChunkResponse)
def pin_knowledge(
    project_id: int,
    request: PinKnowledgeRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    user = verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.pin_knowledge(project_id, request.text, user.id)

@router.get("/search", response_model=List[SearchResultResponse])
def search_knowledge(
    project_id: int,
    q: str = Query(..., description="Semantic search query"),
    meeting_id: Optional[str] = None,
    top_k: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.search(project_id=project_id, query=q, meeting_id=meeting_id, top_k=top_k)

@router.get("/chunks", response_model=PaginatedResponse[KnowledgeChunkResponse])
def browse_chunks(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_chunks(project_id, meeting_id, page, size)

@router.get("/decisions", response_model=PaginatedResponse[DecisionResponse])
def browse_decisions(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_decisions(project_id, meeting_id, page, size)

@router.get("/action-items", response_model=PaginatedResponse[ActionItemResponse])
def browse_action_items(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_action_items(project_id, meeting_id, page, size)

@router.get("/topics", response_model=PaginatedResponse[TopicResponse])
def browse_topics(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_topics(project_id, meeting_id, page, size)

@router.get("/requirements", response_model=PaginatedResponse[RequirementResponse])
def browse_requirements(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_requirements(project_id, meeting_id, page, size)

@router.get("/concerns", response_model=PaginatedResponse[ConcernResponse])
def browse_concerns(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_concerns(project_id, meeting_id, page, size)

@router.get("/summaries", response_model=PaginatedResponse[MeetingSummaryResponse])
def browse_summaries(
    project_id: int,
    meeting_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    verify_project_access(project_id, db, session)
    explorer = KnowledgeExplorer(db)
    return explorer.get_summaries(project_id, meeting_id, page, size)
