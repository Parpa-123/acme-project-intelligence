from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from src.projects.service import ProjectService
from .schemas import RetrievalRequest, RetrievalResponse
from .service import RetrievalService

from src.reranking.service import RerankingService
from src.context_builder.service import ContextBuilderService
from src.context_builder.schemas import ContextPackage

router = APIRouter(prefix="/projects/{project_id}", tags=["Knowledge Retrieval"])

@router.post("/search", response_model=RetrievalResponse)
def search_project_knowledge(
    project_id: int,
    request: RetrievalRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    # Execute Retrieval
    service = RetrievalService(db)
    candidates = service.retrieve(
        query=request.query, 
        project_id=project_id, 
        meeting_id=request.meeting_id
    )
    
    return RetrievalResponse(
        query=request.query,
        results=candidates
    )

@router.post("/retrieve", response_model=ContextPackage)
async def retrieve_context_package(
    project_id: int,
    request: RetrievalRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    # 1. Execute Retrieval (Vector Search)
    retrieval_service = RetrievalService(db)
    candidates = retrieval_service.retrieve(
        query=request.query, 
        project_id=project_id, 
        meeting_id=request.meeting_id,
        limit=30 # Fetch broader pool for reranking
    )
    
    # 2. Reranking
    reranking_service = RerankingService()
    # Cast to RerankedChunk since retrieval returns Candidates
    # For now, we manually map RetrievalCandidate to RerankedChunk
    from src.reranking.schemas import RerankedChunk
    reranked_input = [
        RerankedChunk(
            chunk_id=c.chunk_id,
            meeting_id=c.meeting_id,
            text=c.text,
            score=c.score,
            rerank_score=0.0,
            metadata=c.metadata
        ) for c in candidates
    ]
    
    top_reranked = await reranking_service.rerank(request.query, reranked_input, top_k=10)
    
    # 3. Context Builder
    context_service = ContextBuilderService(db)
    context_package = context_service.build_context(request.query, top_reranked)
    
    return context_package
