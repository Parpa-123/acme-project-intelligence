from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, Any
from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from src.meeting.models import Meeting, MeetingSpace
from src.knowledge.models import KnowledgeChunk
from src.enrichment.models import (
    MeetingSummary, MeetingDecision, MeetingActionItem, 
    MeetingRequirement, MeetingConcern, MeetingTopic
)
from src.knowledge.schemas import PaginatedResponse
from src.retrieval.service import RetrievalService
from src.projects.models import Project
from src.global_knowledge.schemas import (
    GlobalDecisionResponse, GlobalRequirementResponse, 
    GlobalActionItemResponse, GlobalSearchResultResponse,
    GlobalPaginatedResponse
)

router = APIRouter(prefix="/global-knowledge", tags=["Global Knowledge"])

def _paginate(query, page: int, size: int):
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "has_more": (page * size) < total
    }

def get_global_artifacts(db: Session, model: Any, page: int, size: int):
    from sqlalchemy import or_
    # Join with Meeting, MeetingSpace, and Project
    query = db.query(model, Project.name.label('project_name'), Project.id.label('project_id'), MeetingSpace.name.label('meeting_title'))\
        .join(Meeting, model.meeting_id == Meeting.id)\
        .join(MeetingSpace, Meeting.meeting_space_id == MeetingSpace.id)\
        .join(Project, MeetingSpace.project_id == Project.id)\
        .filter(
            or_(
                MeetingSpace.is_global == True,
                Project.is_global == True
            )
        )
        
    query = query.order_by(desc(model.created_at))
    
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    
    # Map raw tuple results to dict for pydantic
    formatted_items = []
    for artifact, proj_name, proj_id, meet_title in items:
        # artifact is a sqlalchemy model, convert to dict
        art_dict = {c.name: getattr(artifact, c.name) for c in artifact.__table__.columns}
        art_dict["project_name"] = proj_name
        art_dict["project_id"] = proj_id
        art_dict["meeting_title"] = meet_title
        formatted_items.append(art_dict)
        
    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "size": size,
        "has_more": (page * size) < total
    }

@router.get("/decisions", response_model=GlobalPaginatedResponse[GlobalDecisionResponse])
def get_global_decisions(page: int = 1, size: int = 50, db: Session = Depends(get_db), session: SessionContainer = Depends(verify_session())):
    return get_global_artifacts(db, MeetingDecision, page, size)

@router.get("/requirements", response_model=GlobalPaginatedResponse[GlobalRequirementResponse])
def get_global_requirements(page: int = 1, size: int = 50, db: Session = Depends(get_db), session: SessionContainer = Depends(verify_session())):
    return get_global_artifacts(db, MeetingRequirement, page, size)

@router.get("/action-items", response_model=GlobalPaginatedResponse[GlobalActionItemResponse])
def get_global_action_items(page: int = 1, size: int = 50, db: Session = Depends(get_db), session: SessionContainer = Depends(verify_session())):
    return get_global_artifacts(db, MeetingActionItem, page, size)

@router.get("/search", response_model=list[GlobalSearchResultResponse])
def search_global_knowledge(
    q: str = Query(..., description="The search query"),
    top_k: int = 10,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # We will need a specific global search method in retrieval service
    # For now, we can use a custom query since we just want is_global == True
    from src.retrieval.embedding import RetrievalEmbeddingService
    embed_svc = RetrievalEmbeddingService()
    query_embedding = embed_svc.generate_query_embedding(q)
    
    distance_expr = KnowledgeChunk.embedding.cosine_distance(query_embedding).label('distance')
    
    query = db.query(KnowledgeChunk, distance_expr, MeetingSpace.id.label('space_id'), MeetingSpace.name.label('meeting_title'), Project.id.label('project_id'), Project.name.label('project_name'))
    query = query.join(Meeting, Meeting.id == KnowledgeChunk.meeting_id)
    query = query.join(MeetingSpace, MeetingSpace.id == Meeting.meeting_space_id)
    query = query.join(Project, Project.id == MeetingSpace.project_id)
    
    from sqlalchemy import or_
    # FILTER BY GLOBAL (Space is global OR Project is global)
    query = query.filter(
        or_(
            MeetingSpace.is_global == True,
            Project.is_global == True
        )
    )
    query = query.order_by(distance_expr).limit(top_k)
    
    from src.core.metrics import retrieval_latency_histogram
    with retrieval_latency_histogram.time():
        db_results = query.all()
    
    results = []
    for chunk, dist, space_id, title, proj_id, proj_name in db_results:
        chunk_dict = {
            "id": chunk.id,
            "meeting_id": chunk.meeting_id,
            "chunk_index": chunk.chunk_index,
            "start_timestamp": chunk.start_timestamp,
            "end_timestamp": chunk.end_timestamp,
            "text": chunk.text,
            "participant_ids": chunk.participant_ids,
            "entry_count": chunk.entry_count,
            "created_at": chunk.created_at,
            "meeting_title": title
        }
        
        results.append({
            "chunk": chunk_dict,
            "score": 1.0 - float(dist),
            "meeting_title": title,
            "project_name": proj_name,
            "project_id": proj_id
        })
        
    return results
