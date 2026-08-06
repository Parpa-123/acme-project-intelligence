import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.database import Base

class ProjectDocument(Base):
    __tablename__ = "project_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # e.g., 'pdf', 'txt', 'docx'
    s3_key = Column(String, nullable=False)    # Location in MinIO/S3
    
    # Status: 'uploading', 'processing', 'ready', 'failed'
    status = Column(String, default="uploading") 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
