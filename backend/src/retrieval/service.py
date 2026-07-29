from sqlalchemy.orm import Session
from typing import List

from .repository import RetrievalRepository
from .embedding import RetrievalEmbeddingService
from .filters import RetrievalFilters
from .schemas import RetrievalCandidate

class RetrievalService:
    def __init__(self, db: Session):
        self.repository = RetrievalRepository(db)
        self.embedding_service = RetrievalEmbeddingService()
        
    def retrieve(self, query: str, project_id: int, meeting_id: str = None, limit: int = 50) -> List[RetrievalCandidate]:
        # 1. Generate Query Embedding
        query_embedding = self.embedding_service.generate_query_embedding(query)
        
        # 2. Setup Filters
        filters = RetrievalFilters(project_id=project_id, meeting_id=meeting_id)
        
        # 3. Search Repository
        results = self.repository.search_knowledge(query_embedding, filters, limit=limit)
        
        # 4. Map to Candidates
        candidates = []
        for chunk, score, space_id in results:
            candidates.append(
                RetrievalCandidate(
                    chunk_id=str(chunk.id),
                    meeting_id=str(chunk.meeting_id),
                    score=score,
                    text=chunk.text,
                    metadata={
                        "space_id": space_id,
                        "participant_ids": chunk.participant_ids,
                        "start_timestamp": chunk.start_timestamp.isoformat(),
                        "end_timestamp": chunk.end_timestamp.isoformat()
                    }
                )
            )
            
        return candidates
