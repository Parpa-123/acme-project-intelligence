from pydantic import BaseModel
from typing import List, Dict, Any

class ContextSource(BaseModel):
    chunk_id: str
    meeting_id: str
    chunk_index: int
    score: float
    rerank_score: float

class ContextPackage(BaseModel):
    context_text: str
    total_tokens: int
    sources: List[ContextSource]
    metadata: Dict[str, Any]
