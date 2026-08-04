from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Tuple
from uuid import UUID
import traceback

from src.knowledge.models import KnowledgeChunk
from src.meeting.models import Meeting, MeetingSpace
from .filters import RetrievalFilters
from .exceptions import RetrievalError

class RetrievalRepository:
    def __init__(self, db: Session):
        self.db = db

    def search_knowledge(self, query_embedding: List[float], filters: RetrievalFilters, limit: int = 50) -> List[Tuple[KnowledgeChunk, float, str]]:
        try:
            # Calculate distance using pgvector's cosine_distance
            distance_expr = KnowledgeChunk.embedding.cosine_distance(query_embedding).label('distance')
            
            # Start query
            q = self.db.query(KnowledgeChunk, distance_expr, MeetingSpace.id.label('space_id'))
            
            # Join required to verify project access
            from src.projects.models import Project
            q = q.outerjoin(Meeting, Meeting.id == KnowledgeChunk.meeting_id)
            q = q.outerjoin(MeetingSpace, MeetingSpace.id == Meeting.meeting_space_id)
            q = q.join(Project, Project.id == KnowledgeChunk.project_id)
            
            # Apply Mandatory Project Filter (Target Project OR Global Projects)
            from sqlalchemy import or_
            q = q.filter(
                or_(
                    Project.id == filters.project_id,
                    Project.is_global == True
                )
            )
            
            # Apply Optional Filters
            if filters.meeting_id and filters.meeting_id.lower() != "null":
                try:
                    q = q.filter(Meeting.id == UUID(filters.meeting_id))
                except ValueError:
                    print(f"Warning: Ignored invalid meeting_id format: {filters.meeting_id}")
                    pass
                
            # Order by nearest neighbor (lowest distance)
            q = q.order_by(distance_expr)
            
            # Limit for later reranking
            q = q.limit(limit)
            
            results = q.all()
            
            # Convert distance to similarity score (1 - distance)
            # pgvector's cosine_distance returns [0, 2], where 0 is identical.
            # So similarity = 1 - distance
            return [(chunk, 1.0 - float(dist), str(space_id) if space_id else "") for chunk, dist, space_id in results]
            
        except Exception as e:
            print(f"Error in search_knowledge: {e}")
            traceback.print_exc()
            raise RetrievalError("Failed to execute vector search.")
