from typing import List
from sqlalchemy.orm import Session
from src.meeting.models import MeetingTranscript, MeetingChatMessage
from src.knowledge.models import KnowledgeChunk
from src.knowledge.events import ConversationEntry, KnowledgeChunkData, Modality

class KnowledgeRepository:
    def __init__(self, db: Session):
        self.db = db

    def load_conversation(self, meeting_id: str) -> List[ConversationEntry]:
        # Fetch transcripts
        transcripts = self.db.query(MeetingTranscript).filter(MeetingTranscript.meeting_id == meeting_id).all()
        # Fetch chats
        chats = self.db.query(MeetingChatMessage).filter(MeetingChatMessage.meeting_id == meeting_id).all()
        
        entries = []
        for t in transcripts:
            entries.append(
                ConversationEntry(
                    entry_id=str(t.id),
                    user_id=t.user_id,
                    speaker_name=t.user.full_name or t.user.email.split('@')[0],
                    text=t.text,
                    modality=Modality.SPEECH,
                    timestamp=t.created_at
                )
            )
            
        for c in chats:
            entries.append(
                ConversationEntry(
                    entry_id=str(c.id),
                    user_id=c.user_id,
                    speaker_name=c.user.full_name or c.user.email.split('@')[0],
                    text=c.message,
                    modality=Modality.CHAT,
                    timestamp=c.created_at
                )
            )
            
        # Sort chronologically
        entries.sort(key=lambda e: e.timestamp)
        return entries

    def save_knowledge_chunks(self, meeting_id: str, chunks: List[KnowledgeChunkData]):
        # Fetch the meeting to find its project_id
        from src.meeting.models import Meeting
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            print(f"Cannot save knowledge chunks, meeting {meeting_id} not found.")
            return
            
        project_id = meeting.meeting_space.project_id

        # Clear existing chunks for this meeting to allow re-runs
        self.db.query(KnowledgeChunk).filter(KnowledgeChunk.meeting_id == meeting_id).delete()
        
        for data in chunks:
            db_chunk = KnowledgeChunk(
                project_id=project_id,
                meeting_id=meeting_id,
                chunk_index=data.chunk_index,
                start_timestamp=data.start_timestamp,
                end_timestamp=data.end_timestamp,
                text=data.text,
                participant_ids=data.participant_ids,
                entry_count=data.entry_count,
                embedding=data.embedding
            )
            self.db.add(db_chunk)
        
        self.db.commit()
