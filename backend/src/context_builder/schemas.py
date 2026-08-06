from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ContextSource(BaseModel):
    chunk_id: str
    meeting_id: Optional[str] = None
    document_id: Optional[str] = None
    chunk_index: Optional[int] = None
    score: Optional[float] = None
    rerank_score: Optional[float] = None

class ContextPackage(BaseModel):
    context_text: str
    total_tokens: int
    sources: List[ContextSource]
    metadata: Dict[str, Any]
