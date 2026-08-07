from sqlalchemy.orm import Session
from .models import ChatSession, ChatMessage
from typing import List, Optional

class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_session(self, project_id: Optional[int], user_id: int, title: Optional[str] = None) -> ChatSession:
        db_session = ChatSession(project_id=project_id, user_id=user_id, title=title)
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        return self.db.query(ChatSession).filter(ChatSession.id == session_id).first()

    def get_user_sessions(self, project_id: Optional[int], user_id: int) -> List[ChatSession]:
        query = self.db.query(ChatSession).filter(ChatSession.user_id == user_id)
        if project_id is None:
            query = query.filter(ChatSession.project_id.is_(None))
        else:
            query = query.filter(ChatSession.project_id == project_id)
            
        return query.order_by(ChatSession.updated_at.desc()).all()

    def add_message(self, session_id: str, role: str, content: str, metadata: dict = None) -> ChatMessage:
        db_msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            metadata_json=metadata or {}
        )
        self.db.add(db_msg)
        self.db.commit()
        self.db.refresh(db_msg)
        
        # Touch the session updated_at
        session = self.get_session(session_id)
        if session:
            # SQLAlchemy auto-updates on update, but we need to flag it
            session.title = session.title 
            self.db.commit()
            
        return db_msg

    def get_messages(self, session_id: str) -> List[ChatMessage]:
        return self.db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()
