from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class MeetingSpaceCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: Optional[str] = None

class MeetingSpaceCreateResponse(BaseModel):
    id: UUID
    join_url: str

class MeetingSpaceListResponse(BaseModel):
    id: UUID
    name: str
    active_session: bool

class ActiveMeetingSummary(BaseModel):
    id: UUID
    status: str
    participant_count: int

class UserSummary(BaseModel):
    id: int
    display_name: str

class MeetingSpaceDetailResponse(BaseModel):
    id: UUID
    project_id: int
    name: str
    description: Optional[str] = None
    join_url: str
    active_meeting: Optional[ActiveMeetingSummary] = None
    created_by: UserSummary
    created_at: datetime
    is_archived: bool
    is_global: bool

class MeetingSpaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None

class MeetingSessionResponse(BaseModel):
    id: UUID
    meeting_space_id: UUID
    status: str
    started_at: datetime
    
class MeetingJoinResponse(BaseModel):
    meeting_id: UUID
    room_name: str
    livekit_url: str
    access_token: str
    expires_at: datetime

class SuccessResponse(BaseModel):
    status: str
    message: str

class MeetingChatMessageRequest(BaseModel):
    message: str
    message_type: str = "text"

class MeetingChatMessageResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    user_id: int
    user_name: str
    message: str
    message_type: str
    created_at: datetime

class MeetingTranscriptResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    user_id: int
    user_name: str
    text: str
    is_final: bool
    created_at: datetime

class TranscriptEvent(BaseModel):
    participant_id: str
    user_name: str
    text: str
    is_final: bool


