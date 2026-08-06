from pydantic import BaseModel
from typing import Dict, Any, Optional

class RerankedChunk(BaseModel):
    chunk_id: str
    meeting_id: Optional[str] = None
    document_id: Optional[str] = None
    source_type: str = "meeting"
    text: str
    score: float  # Retrieval score
    rerank_score: float  # Semantic rerank score
    metadata: Dict[str, Any]

class RerankRequest(BaseModel):
    query: str
    chunks: list[RerankedChunk]
