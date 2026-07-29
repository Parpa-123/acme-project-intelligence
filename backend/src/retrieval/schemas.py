from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID

class RetrievalRequest(BaseModel):
    query: str = Field(..., description="The user's question or search query")
    meeting_id: Optional[str] = Field(None, description="Optional meeting ID to restrict the search")

class RetrievalCandidate(BaseModel):
    chunk_id: str
    meeting_id: str
    score: float
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrievalResponse(BaseModel):
    query: str
    results: List[RetrievalCandidate]
