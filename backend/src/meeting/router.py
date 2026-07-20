from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import os

from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from .schemas import (
    MeetingSpaceCreateRequest, MeetingSpaceCreateResponse, MeetingSpaceListResponse,
    MeetingSpaceDetailResponse, MeetingSpaceUpdateRequest, ActiveMeetingSummary, UserSummary,
    MeetingSessionResponse, MeetingJoinResponse, SuccessResponse
)
from .repository import MeetingSpaceRepository
from .service import MeetingSessionService
from src.projects.service import ProjectService
from src.projects.models import MemberRole

router = APIRouter(prefix="/projects/{project_id}/meeting-spaces", tags=["Meeting Spaces (Projects)"])
space_router = APIRouter(prefix="/meeting-spaces", tags=["Meeting Spaces (Detail)"])
session_router = APIRouter(prefix="/meetings", tags=["Meeting Sessions"])

@router.post("", response_model=MeetingSpaceCreateResponse, status_code=201)
def create_meeting_space(
    project_id: int,
    space_in: MeetingSpaceCreateRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = MeetingSpaceRepository(db)
    space = repo.create_meeting_space(
        project_id=project_id,
        created_by=user.id,
        name=space_in.name,
        description=space_in.description
    )
    
    # Construct a frontend join URL
    frontend_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000")
    join_url = f"{frontend_url}/m/{space.livekit_room_name}"
    
    return MeetingSpaceCreateResponse(id=space.id, join_url=join_url)

@router.get("", response_model=List[MeetingSpaceListResponse])
def list_meeting_spaces(
    project_id: int,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = MeetingSpaceRepository(db)
    spaces = repo.get_meeting_spaces(project_id)
    return spaces

def _get_join_url(room_name: str) -> str:
    frontend_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000")
    return f"{frontend_url}/m/{room_name}"

@space_router.get("/{space_id}", response_model=MeetingSpaceDetailResponse)
def get_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Check if user has access to the project
    project_service._check_project_access(space.project_id, user.id)
    
    active_meeting = repo.get_active_meeting_for_space(space.id)
    active_meeting_summary = None
    if active_meeting:
        participant_count = len(active_meeting.participants)
        active_meeting_summary = ActiveMeetingSummary(
            id=active_meeting.id,
            status=active_meeting.status.value,
            participant_count=participant_count
        )
        
    creator = space.creator
    created_by_summary = UserSummary(
        id=creator.id,
        display_name=creator.full_name or creator.email
    )
    
    return MeetingSpaceDetailResponse(
        id=space.id,
        project_id=space.project_id,
        name=space.name,
        description=space.description,
        join_url=_get_join_url(space.livekit_room_name),
        active_meeting=active_meeting_summary,
        created_by=created_by_summary,
        created_at=space.created_at,
        is_archived=space.is_archived
    )

@space_router.put("/{space_id}", response_model=MeetingSpaceDetailResponse)
def update_meeting_space(
    space_id: str,
    space_in: MeetingSpaceUpdateRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Require admin or owner role to update
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    repo.update_meeting_space(space, space_in.model_dump(exclude_unset=True))
    
    # We can just redirect to the GET endpoint logic
    return get_meeting_space(space_id, db, session)

@space_router.post("/{space_id}/archive", status_code=204)
def archive_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Require admin or owner role to archive
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    active_meeting = repo.get_active_meeting_for_space(space.id)
    if active_meeting:
        raise HTTPException(status_code=400, detail="Cannot archive a space with an active meeting in progress")
        
    repo.archive_meeting_space(space)
    return None

@space_router.post("/{space_id}/start", response_model=MeetingSessionResponse)
def start_meeting(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(space.project_id, user.id)
    session_service = MeetingSessionService(db)
    meeting = session_service.start_meeting(space_id, user.id)
    
    return MeetingSessionResponse(
        id=meeting.id,
        meeting_space_id=meeting.meeting_space_id,
        status=meeting.status.value,
        started_at=meeting.started_at
    )

@space_router.post("/{space_id}/join", response_model=MeetingJoinResponse)
def join_meeting(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(space.project_id, user.id)
    session_service = MeetingSessionService(db)
    
    return session_service.join_meeting(space_id, user)

@session_router.post("/{meeting_id}/leave", response_model=SuccessResponse)
def leave_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    session_service = MeetingSessionService(db)
    session_service.leave_meeting(meeting_id, user.id)
    
    return SuccessResponse(status="success", message="Successfully left meeting.")

from .schemas import MeetingChatMessageRequest, MeetingChatMessageResponse
from .models import MeetingChatMessage, Meeting, MeetingChatType
import uuid

@session_router.get("/{meeting_id}/messages", response_model=List[MeetingChatMessageResponse])
def get_meeting_messages(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    # Ensure meeting exists
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # Security: check if user is in project
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    messages = db.query(MeetingChatMessage).filter(
        MeetingChatMessage.meeting_id == uuid.UUID(meeting_id)
    ).order_by(MeetingChatMessage.created_at.asc()).all()
    
    return [
        MeetingChatMessageResponse(
            id=m.id,
            meeting_id=m.meeting_id,
            user_id=m.user_id,
            user_name=m.user.full_name or m.user.email.split('@')[0],
            message=m.message,
            message_type=m.message_type.value,
            created_at=m.created_at
        ) for m in messages
    ]

@session_router.post("/{meeting_id}/messages", response_model=MeetingChatMessageResponse)
def post_meeting_message(
    meeting_id: str,
    message_in: MeetingChatMessageRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    new_msg = MeetingChatMessage(
        meeting_id=uuid.UUID(meeting_id),
        user_id=user.id,
        message=message_in.message,
        message_type=MeetingChatType(message_in.message_type)
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    return MeetingChatMessageResponse(
        id=new_msg.id,
        meeting_id=new_msg.meeting_id,
        user_id=new_msg.user_id,
        user_name=user.full_name or user.email.split('@')[0],
        message=new_msg.message,
        message_type=new_msg.message_type.value,
        created_at=new_msg.created_at
    )
