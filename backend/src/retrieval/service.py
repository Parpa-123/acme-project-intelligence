from sqlalchemy.orm import Session
from typing import List, Optional
import os
from pinecone import Pinecone

from .repository import RetrievalRepository
from .embedding import RetrievalEmbeddingService
from .filters import RetrievalFilters
from .schemas import RetrievalCandidate

class RetrievalService:
    def __init__(self, db: Session):
        self.repository = RetrievalRepository(db)
        self.embedding_service = RetrievalEmbeddingService()
        
    def retrieve(self, query: str, project_id: Optional[int], meeting_id: str = None, limit: int = 50, is_global_search: bool = False) -> List[RetrievalCandidate]:
        # 1. Generate Query Embedding
        query_embedding = self.embedding_service.generate_query_embedding(query)
        
        # 2. Setup Filters
        filters = RetrievalFilters(project_id=project_id, meeting_id=meeting_id, is_global_search=is_global_search)
        
        # 3. Search Repository (Meetings)
        results = self.repository.search_knowledge(query_embedding, filters, limit=limit)
        
        candidates = []
        # 4. Map Meeting Candidates
        for chunk, score, space_id in results:
            candidates.append(
                RetrievalCandidate(
                    chunk_id=str(chunk.id),
                    meeting_id=str(chunk.meeting_id) if chunk.meeting_id else None,
                    source_type="meeting",
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

        # 5. Search Pinecone (Documents)
        pinecone_api_key = os.environ.get("PINECONE_API_KEY")
        pinecone_index_name = os.environ.get("PINECONE_INDEX_NAME")
        
        if pinecone_api_key and pinecone_index_name:
            try:
                pc = Pinecone(api_key=pinecone_api_key)
                pinecone_index = pc.Index(pinecone_index_name)
                
                # Setup Pinecone filter (only search docs in this project)
                pc_filter = {"project_id": str(project_id)}
                
                pc_response = pinecone_index.query(
                    vector=query_embedding,
                    top_k=limit,
                    include_metadata=True,
                    filter=pc_filter
                )
                
                # 6. Map Document Candidates
                import json
                for match in pc_response.get('matches', []):
                    text = match['metadata'].get('text', '')
                    if not text and '_node_content' in match['metadata']:
                        try:
                            node_content = json.loads(match['metadata']['_node_content'])
                            text = node_content.get('text', '')
                        except:
                            pass
                            
                    candidates.append(
                        RetrievalCandidate(
                            chunk_id=match['id'],
                            document_id=match['metadata'].get('document_id'),
                            source_type="document",
                            score=match['score'],
                            text=text,
                            metadata={
                                "filename": match['metadata'].get('filename', 'Unknown Document')
                            }
                        )
                    )
            except Exception as e:
                print(f"Warning: Failed to query Pinecone for documents: {e}")

        # 7. Merge & Sort by descending score (Global Rerank)
        candidates.sort(key=lambda x: x.score, reverse=True)
        
        # 8. Return top N overall
        return candidates[:limit]
