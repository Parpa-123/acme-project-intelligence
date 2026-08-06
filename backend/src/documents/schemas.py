from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class ProjectDocumentResponse(BaseModel):
    id: uuid.UUID
    project_id: int
    filename: str
    file_type: str
    s3_key: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
