from enum import Enum
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Integer,
    Enum as SQLEnum,
    Boolean
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.database import Base


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MeetingEventType(str, Enum):
    CREATED = "meeting_created"
    STARTED = "meeting_started"
    ENDED = "meeting_ended"
    JOINED = "user_joined"
    LEFT = "user_left"


class MeetingChatType(str,Enum):
    TEXT = "text"
    CODE = "code"
    LINK = "link"
    SYSTEM = "system"

class MeetingSpace(Base):
    __tablename__ = "meeting_spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(255), nullable=False)

    description = Column(String, nullable=True)

    livekit_room_name = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    is_archived = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    project = relationship("Project")

    creator = relationship("User")

    meetings = relationship(
        "Meeting",
        back_populates="meeting_space",
        cascade="all, delete-orphan",
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meeting_spaces.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(255), nullable=False)

    description = Column(String, nullable=True)

    scheduled_start = Column(DateTime(timezone=True), nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)

    ended_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(
        SQLEnum(MeetingStatus),
        nullable=False,
        default=MeetingStatus.SCHEDULED,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    meeting_space = relationship(
        "MeetingSpace",
        back_populates="meetings",
    )

    creator = relationship(
        "User"
    )

    participants = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )

    events = relationship(
        "MeetingEvent",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )

    calendar_provider = Column(String, nullable=True)

    calendar_event_id = Column(String, nullable=True)

    calendar_sync_enabled = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_meetings_space", "meeting_space_id"),
        Index("idx_meetings_status", "status"),
    )


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    left_at = Column(DateTime(timezone=True), nullable=True)

    meeting = relationship(
        "Meeting",
        back_populates="participants",
    )

    user = relationship(
        "User"
    )

    __table_args__ = (
        Index("idx_meeting_participants_meeting", "meeting_id"),
        Index("idx_meeting_participants_user", "user_id"),
        Index("idx_meeting_participants_joined", "joined_at"),
    )


class MeetingEvent(Base):
    __tablename__ = "meeting_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )

    event_type = Column(
        SQLEnum(MeetingEventType),
        nullable=False,
    )

    event_data = Column(JSONB, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    meeting = relationship(
        "Meeting",
        back_populates="events",
    )

    user = relationship("User")

    __table_args__ = (
        Index("idx_meeting_events_meeting", "meeting_id"),
        Index("idx_meeting_events_user", "user_id"),
        Index("idx_meeting_events_type", "event_type"),
        Index("idx_meeting_events_created", "created_at"),
    )


class MeetingChatMessage(Base):
    __tablename__ = "meeting_chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    message_type = Column(SQLEnum(MeetingChatType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    meeting = relationship("Meeting")
    user = relationship("User")
    
    __table_args__ = (
        Index("idx_meeting_chat_messages_meeting", "meeting_id"),
        Index("idx_meeting_chat_messages_user", "user_id"),
        Index("idx_meeting_chat_messages_created", "created_at"),
    )

class MeetingTranscript(Base):
    __tablename__ = "meeting_transcripts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_final = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    meeting = relationship("Meeting")
    user = relationship("User")
    
    __table_args__ = (
        Index("idx_meeting_transcripts_meeting", "meeting_id"),
        Index("idx_meeting_transcripts_user", "user_id"),
        Index("idx_meeting_transcripts_created", "created_at"),
    )


