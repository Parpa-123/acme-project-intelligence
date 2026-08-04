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
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    
    chunk_index = Column(Integer, nullable=False)
    
    start_timestamp = Column(DateTime(timezone=True), nullable=False)
    end_timestamp = Column(DateTime(timezone=True), nullable=False)
    
    text = Column(String, nullable=False)
    participant_ids = Column(JSON, nullable=False) 
    entry_count = Column(Integer, nullable=False)
    
    embedding = Column(Vector(384), nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
