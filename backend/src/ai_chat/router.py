from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.projects.service import ProjectService
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from .schemas import ChatRequest, ChatSessionResponse, ChatMessageResponse
from .service import ChatService
from .repository import ChatRepository

router = APIRouter(prefix="/projects/{project_id}/chat", tags=["AI Chat"])

@router.post("")
async def stream_ai_chat(
    project_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    chat_service = ChatService(db)
    
    return StreamingResponse(
        chat_service.stream_chat(
            query=request.message,
            project_id=project_id,
            user_id=user.id,
            session_id=request.session_id
        ),
        media_type="text/event-stream"
    )

@router.get("/sessions", response_model=list[ChatSessionResponse])
def get_chat_sessions(
    project_id: int,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = ChatRepository(db)
    return repo.get_user_sessions(project_id, user.id)

@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def get_chat_session_messages(
    project_id: int,
    session_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = ChatRepository(db)
    
    # Verify session belongs to project
    chat_session = repo.get_session(session_id)
    if not chat_session or chat_session.project_id != project_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    return repo.get_messages(session_id)

@router.delete("/sessions/{session_id}")
def delete_chat_session(
    project_id: int,
    session_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = ChatRepository(db)
    
    # Verify session belongs to project
    chat_session = repo.get_session(session_id)
    if not chat_session or chat_session.project_id != project_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Delete the session. The associated messages will have session_id set to NULL due to SET NULL cascade.
    db.delete(chat_session)
    db.commit()
    return {"message": "Chat session deleted"}
