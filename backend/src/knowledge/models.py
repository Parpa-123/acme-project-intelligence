import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Float, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from src.database import Base

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        Index(
            'ix_knowledge_chunks_embedding_hnsw', 
            'embedding', 
            postgresql_using='hnsw', 
            postgresql_with={'m': 16, 'ef_construction': 64}, 
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True)
    
    # Source provenance: 'meeting', 'chat', or 'document'
    source_type = Column(String(32), default="meeting", nullable=False, index=True)
    chat_message_id = Column(String, ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True, index=True)
    source_metadata = Column(JSON, nullable=True, default={})
    
    chunk_index = Column(Integer, nullable=True, default=0)
    
    start_timestamp = Column(DateTime(timezone=True), nullable=True)
    end_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    text = Column(String, nullable=False)
    participant_ids = Column(JSON, nullable=True, default=list) 
    entry_count = Column(Integer, nullable=True, default=1)
    
    embedding = Column(Vector(384), nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

