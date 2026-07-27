from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class Modality(str, Enum):
    SPEECH = "speech"
    CHAT = "chat"

class ConversationEntry(BaseModel):
    entry_id: str
    user_id: int
    speaker_name: str
    text: str
    modality: Modality
    timestamp: datetime

class KnowledgeChunkData(BaseModel):
    chunk_index: int
    meeting_id: str
    start_timestamp: datetime
    end_timestamp: datetime
    text: str
    participant_ids: List[int]
    entry_count: int
    embedding: Optional[List[float]] = None
