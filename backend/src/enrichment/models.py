import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.database import Base

class MeetingSummary(Base):
    __tablename__ = "meeting_summaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(String, nullable=False)
    model = Column(String, nullable=True) # E.g., 'meta-llama/Llama-3.2-3B-Instruct'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class MeetingDecision(Base):
    __tablename__ = "meeting_decisions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    knowledge_chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=True)
    decision = Column(String, nullable=False)
    confidence = Column(String, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    knowledge_chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=True)
    assignee = Column(String, nullable=True)
    description = Column(String, nullable=False)
    due_date = Column(String, nullable=True)
    status = Column(String, nullable=True, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class MeetingRequirement(Base):
    __tablename__ = "meeting_requirements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    knowledge_chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=True)
    requirement = Column(String, nullable=False)
    priority = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class MeetingConcern(Base):
    __tablename__ = "meeting_concerns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    knowledge_chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=True)
    concern = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class MeetingTopic(Base):
    __tablename__ = "meeting_topics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    knowledge_chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=True)
    topic = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
