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
        paginated = self.get_artifacts(project_id, KnowledgeChunk, meeting_id, page, size)
        for chunk in paginated.get("items", []):
            if chunk.meeting_id:
                meeting = self.db.query(Meeting).filter(Meeting.id == chunk.meeting_id).first()
                chunk.meeting_title = meeting.meeting_space.name if meeting and meeting.meeting_space else "Meeting Knowledge"
            elif chunk.source_metadata and "session_title" in chunk.source_metadata:
                chunk.meeting_title = f"AI Insight: {chunk.source_metadata['session_title']}"
            elif getattr(chunk, 'source_type', None) == "chat":
                chunk.meeting_title = "AI Chat Insight"
            else:
                chunk.meeting_title = "Project Knowledge"
        return paginated


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
        retrieval_svc = RetrievalService(self.db)
        candidates = retrieval_svc.retrieve(query=query, project_id=project_id, meeting_id=meeting_id, limit=top_k)
        
        results = []
        for c in candidates:
            # We want to return the actual chunk data
            chunk = self.db.query(KnowledgeChunk).filter(KnowledgeChunk.id == c.chunk_id).first()
            if chunk:
                # Get meeting or source title
                title = "AI Chat Insight"
                if chunk.meeting_id:
                    meeting = self.db.query(Meeting).filter(Meeting.id == chunk.meeting_id).first()
                    title = meeting.meeting_space.name if meeting and meeting.meeting_space else "Meeting Knowledge"
                elif chunk.source_metadata and "session_title" in chunk.source_metadata:
                    title = f"AI Insight: {chunk.source_metadata['session_title']}"
                elif chunk.source_type == "chat":
                    title = "AI Chat Insight"
                else:
                    title = "Project Knowledge"
                
                chunk_dict = {
                    "id": chunk.id,
                    "meeting_id": chunk.meeting_id,
                    "source_type": chunk.source_type,
                    "chat_message_id": chunk.chat_message_id,
                    "source_metadata": chunk.source_metadata,
                    "chunk_index": chunk.chunk_index or 0,
                    "start_timestamp": chunk.start_timestamp,
                    "end_timestamp": chunk.end_timestamp,
                    "text": chunk.text,
                    "participant_ids": chunk.participant_ids or [],
                    "entry_count": chunk.entry_count or 1,
                    "created_at": chunk.created_at,
                    "meeting_title": title
                }
                
                results.append({
                    "chunk": chunk_dict,
                    "score": c.score,
                    "meeting_title": title
                })
        return results

    def pin_knowledge(
        self, 
        project_id: int, 
        text: Optional[str] = None, 
        user_id: int = 0, 
        message_id: Optional[str] = None
    ):
        from src.knowledge.embedding import EmbeddingService
        from src.ai_chat.models import ChatMessage, ChatSession
        from datetime import datetime, timezone

        pin_text = text
        source_metadata = {}
        chat_msg = None

        if message_id:
            chat_msg = self.db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
            if chat_msg:
                if not pin_text:
                    pin_text = chat_msg.content
                
                # Fetch parent session for project & context
                session = self.db.query(ChatSession).filter(ChatSession.id == chat_msg.session_id).first()
                session_title = session.title if session else "Chat"
                
                # Fetch previous user prompt for provenance
                prev_user_msg = self.db.query(ChatMessage).filter(
                    ChatMessage.session_id == chat_msg.session_id,
                    ChatMessage.role == "user",
                    ChatMessage.created_at <= chat_msg.created_at
                ).order_by(ChatMessage.created_at.desc()).first()

                source_metadata = {
                    "prompt": prev_user_msg.content if prev_user_msg else None,
                    "session_id": chat_msg.session_id,
                    "session_title": session_title,
                    "citations": (chat_msg.metadata_json or {}).get("citations", []),
                    "pinned_by_user_id": user_id
                }

        if not pin_text:
            raise ValueError("No text provided to pin.")

        # Generate embedding
        embed_service = EmbeddingService()
        vector = embed_service.generate_embedding(pin_text)

        now = datetime.now(timezone.utc)
        chunk = KnowledgeChunk(
            project_id=project_id,
            meeting_id=None,
            source_type="chat" if message_id else "note",
            chat_message_id=message_id if chat_msg else None,
            source_metadata=source_metadata,
            chunk_index=0,
            start_timestamp=now,
            end_timestamp=now,
            text=pin_text,
            participant_ids=[],
            entry_count=1,
            embedding=vector
        )
        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)

        # Update chat message metadata with bidirectional pin link
        if chat_msg:
            meta = dict(chat_msg.metadata_json or {})
            meta["is_pinned"] = True
            meta["pinned_chunk_id"] = str(chunk.id)
            chat_msg.metadata_json = meta
            self.db.commit()

        title = f"AI Insight: {source_metadata.get('session_title', 'Chat')}" if message_id else "Pinned Note"

        return {
            "id": chunk.id,
            "meeting_id": chunk.meeting_id,
            "source_type": chunk.source_type,
            "chat_message_id": chunk.chat_message_id,
            "source_metadata": chunk.source_metadata,
            "chunk_index": chunk.chunk_index or 0,
            "start_timestamp": chunk.start_timestamp,
            "end_timestamp": chunk.end_timestamp,
            "text": chunk.text,
            "participant_ids": chunk.participant_ids or [],
            "entry_count": chunk.entry_count or 1,
            "created_at": chunk.created_at,
            "meeting_title": title
        }

    def unpin_knowledge(
        self, 
        project_id: int, 
        message_id: Optional[str] = None, 
        chunk_id: Optional[str] = None, 
        text: Optional[str] = None
    ):
        from src.ai_chat.models import ChatMessage
        import uuid

        chunks_to_delete = []

        # 1. Unpin by message_id (O(1) direct reference from Chat)
        if message_id:
            chunks_to_delete = self.db.query(KnowledgeChunk).filter(
                KnowledgeChunk.project_id == project_id,
                KnowledgeChunk.chat_message_id == message_id
            ).all()

            # Clear message metadata
            chat_msg = self.db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
            if chat_msg:
                meta = dict(chat_msg.metadata_json or {})
                meta["is_pinned"] = False
                meta.pop("pinned_chunk_id", None)
                chat_msg.metadata_json = meta

        # 2. Unpin by chunk_id (from Knowledge Explorer)
        elif chunk_id:
            try:
                chunk_uuid = uuid.UUID(chunk_id)
                chunk = self.db.query(KnowledgeChunk).filter(
                    KnowledgeChunk.project_id == project_id,
                    KnowledgeChunk.id == chunk_uuid
                ).first()
                if chunk:
                    chunks_to_delete.append(chunk)
                    if chunk.chat_message_id:
                        chat_msg = self.db.query(ChatMessage).filter(ChatMessage.id == chunk.chat_message_id).first()
                        if chat_msg:
                            meta = dict(chat_msg.metadata_json or {})
                            meta["is_pinned"] = False
                            meta.pop("pinned_chunk_id", None)
                            chat_msg.metadata_json = meta
            except ValueError:
                pass

        # 3. Fallback: text-based lookup (backward compatibility for legacy chunks)
        elif text:
            chunks_to_delete = self.db.query(KnowledgeChunk).filter(
                KnowledgeChunk.project_id == project_id,
                KnowledgeChunk.text == text
            ).all()
            for chunk in chunks_to_delete:
                if chunk.chat_message_id:
                    chat_msg = self.db.query(ChatMessage).filter(ChatMessage.id == chunk.chat_message_id).first()
                    if chat_msg:
                        meta = dict(chat_msg.metadata_json or {})
                        meta["is_pinned"] = False
                        meta.pop("pinned_chunk_id", None)
                        chat_msg.metadata_json = meta

        for chunk in chunks_to_delete:
            self.db.delete(chunk)

        if chunks_to_delete:
            self.db.commit()

        return {"success": True, "deleted_count": len(chunks_to_delete)}


