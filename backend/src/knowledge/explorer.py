from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, Type, Any
from uuid import UUID

from src.meeting.models import Meeting, MeetingSpace
from src.knowledge.models import KnowledgeChunk
from src.enrichment.models import (
    MeetingSummary, MeetingDecision, MeetingActionItem, 
    MeetingRequirement, MeetingConcern, MeetingTopic
)
from .schemas import SearchResultResponse
from src.retrieval.service import RetrievalService

class KnowledgeExplorer:
    def __init__(self, db: Session):
        self.db = db

    def _paginate(self, query, page: int, size: int):
        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "has_more": (page * size) < total
        }

    def get_artifacts(self, project_id: int, model: Type[Any], meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        from sqlalchemy import or_
        if hasattr(model, 'project_id'):
            query = self.db.query(model).outerjoin(Meeting, model.meeting_id == Meeting.id)\
                .outerjoin(MeetingSpace, Meeting.meeting_space_id == MeetingSpace.id)\
                .filter(
                    or_(
                        model.project_id == project_id,
                        MeetingSpace.project_id == project_id
                    )
                )
        else:
            query = self.db.query(model).join(Meeting, model.meeting_id == Meeting.id)\
                .join(MeetingSpace, Meeting.meeting_space_id == MeetingSpace.id)\
                .filter(MeetingSpace.project_id == project_id)
                
        # Exclude archived meeting spaces unless they are global
        query = query.filter(
            or_(
                MeetingSpace.id.is_(None),
                MeetingSpace.is_archived == False,
                MeetingSpace.is_global == True
            )
        )
        
        if meeting_id:
            query = query.filter(model.meeting_id == meeting_id)
            
        # All artifacts have created_at
        query = query.order_by(desc(model.created_at))
        
        return self._paginate(query, page, size)

    def get_chunks(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, KnowledgeChunk, meeting_id, page, size)

    def get_decisions(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingDecision, meeting_id, page, size)

    def get_action_items(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingActionItem, meeting_id, page, size)

    def get_topics(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingTopic, meeting_id, page, size)

    def get_requirements(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingRequirement, meeting_id, page, size)

    def get_concerns(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingConcern, meeting_id, page, size)

    def get_summaries(self, project_id: int, meeting_id: Optional[str] = None, page: int = 1, size: int = 50):
        return self.get_artifacts(project_id, MeetingSummary, meeting_id, page, size)

    def search(self, project_id: int, query: str, meeting_id: Optional[str] = None, top_k: int = 10):
        # We reuse the RetrievalService to do vector search + reranking
        retrieval_svc = RetrievalService(self.db)
        candidates = retrieval_svc.retrieve(query=query, project_id=project_id, meeting_id=meeting_id, top_k=top_k)
        
        results = []
        for c in candidates:
            # We want to return the actual chunk data
            chunk = self.db.query(KnowledgeChunk).filter(KnowledgeChunk.id == c.chunk_id).first()
            if chunk:
                # Get meeting title
                meeting = self.db.query(Meeting).filter(Meeting.id == chunk.meeting_id).first()
                title = meeting.space.name if meeting and meeting.space else "Unknown Meeting"
                
                # Convert chunk to dict matching schema
                chunk_dict = {
                    "id": chunk.id,
                    "meeting_id": chunk.meeting_id,
                    "chunk_index": chunk.chunk_index,
                    "start_timestamp": chunk.start_timestamp,
                    "end_timestamp": chunk.end_timestamp,
                    "text": chunk.text,
                    "participant_ids": chunk.participant_ids,
                    "entry_count": chunk.entry_count,
                    "created_at": chunk.created_at,
                    "meeting_title": title
                }
                
                results.append({
                    "chunk": chunk_dict,
                    "score": c.score,
                    "meeting_title": title
                })
        return results

    def pin_knowledge(self, project_id: int, text: str, user_id: int):
        from src.knowledge.embedding import EmbeddingService
        from datetime import datetime, timezone
        
        # 1. Ensure the "Manual Project Notebook" space exists
        notebook_space = self.db.query(MeetingSpace).filter(
            MeetingSpace.project_id == project_id,
            MeetingSpace.name == "Project Knowledge Notebook"
        ).first()
        
        if not notebook_space:
            import uuid
            notebook_space = MeetingSpace(
                project_id=project_id,
                created_by=user_id,
                name="Project Knowledge Notebook",
                description="Manual knowledge bits pinned from AI chat and other sources.",
                livekit_room_name=f"notebook_{project_id}_{uuid.uuid4().hex[:8]}"
            )
            self.db.add(notebook_space)
            self.db.flush()
            
        # 2. Ensure a meeting exists
        notebook_meeting = self.db.query(Meeting).filter(
            Meeting.meeting_space_id == notebook_space.id
        ).first()
        
        if not notebook_meeting:
            notebook_meeting = Meeting(
                meeting_space_id=notebook_space.id,
                created_by=user_id,
                name="Pinned Knowledge",
                status="completed"
            )
            self.db.add(notebook_meeting)
            self.db.flush()
            
        # 3. Generate embedding
        embed_service = EmbeddingService()
        vector = embed_service.generate_embedding(text)
        
        # 4. Create KnowledgeChunk
        now = datetime.now(timezone.utc)
        chunk = KnowledgeChunk(
            project_id=project_id,
            meeting_id=notebook_meeting.id,
            chunk_index=0,
            start_timestamp=now,
            end_timestamp=now,
            text=text,
            participant_ids=[],
            entry_count=1,
            embedding=vector
        )
        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)
        
        chunk_dict = {
            "id": chunk.id,
            "meeting_id": chunk.meeting_id,
            "chunk_index": chunk.chunk_index,
            "start_timestamp": chunk.start_timestamp,
            "end_timestamp": chunk.end_timestamp,
            "text": chunk.text,
            "participant_ids": chunk.participant_ids,
            "entry_count": chunk.entry_count,
            "created_at": chunk.created_at,
            "meeting_title": notebook_meeting.name
        }
        return chunk_dict

