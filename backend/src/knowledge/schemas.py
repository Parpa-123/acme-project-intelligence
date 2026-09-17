from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict, Generic, TypeVar
from datetime import datetime
from uuid import UUID

class PinKnowledgeRequest(BaseModel):
    message_id: Optional[str] = None
    text: Optional[str] = None

class UnpinKnowledgeRequest(BaseModel):
    message_id: Optional[str] = None
    chunk_id: Optional[str] = None
    text: Optional[str] = None

class KnowledgeChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: Optional[UUID] = None
    source_type: Optional[str] = "meeting"
    chat_message_id: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None
    chunk_index: Optional[int] = 0
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None
    text: str
    participant_ids: Optional[List[int]] = None
    entry_count: Optional[int] = 1
    created_at: datetime
    # Metadata mapped from DB if needed
    meeting_title: Optional[str] = None


class MeetingSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    summary: str
    model: Optional[str]
    created_at: datetime

class DecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    knowledge_chunk_id: Optional[UUID]
    decision: str
    confidence: Optional[str]
    created_at: datetime

class ActionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    knowledge_chunk_id: Optional[UUID]
    assignee: Optional[str]
    description: str
    due_date: Optional[str]
    status: Optional[str]
    created_at: datetime

class RequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    knowledge_chunk_id: Optional[UUID]
    requirement: str
    priority: Optional[str]
    created_at: datetime

class ConcernResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    knowledge_chunk_id: Optional[UUID]
    concern: str
    severity: Optional[str]
    created_at: datetime

class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    meeting_id: UUID
    knowledge_chunk_id: Optional[UUID]
    topic: str
    created_at: datetime

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    has_more: bool

class SearchResultResponse(BaseModel):
    chunk: KnowledgeChunkResponse
    score: float
    meeting_title: Optional[str] = None
