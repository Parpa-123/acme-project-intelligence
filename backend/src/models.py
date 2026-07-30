from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
from .schemas import AuthProvider

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    supertokens_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    user_preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(SQLEnum(AuthProvider), nullable=False)
    provider_id = Column(String, nullable=False, index=True)
    username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="social_accounts")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    theme = Column(String, nullable=True)
    language = Column(String, default="en")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    notification_settings = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="user_preferences")

# Import sub-module models so they are registered with Base metadata for Alembic
from src.meeting.models import Meeting, MeetingParticipant, MeetingTranscript, MeetingChatMessage, MeetingProcessingStatus
from src.projects.models import Project, ProjectMembers, ProjectInvitation
from src.knowledge.models import KnowledgeChunk
from src.enrichment.models import MeetingSummary, MeetingDecision, MeetingActionItem, MeetingRequirement, MeetingConcern, MeetingTopic
from src.ai_chat.models import ChatSession, ChatMessage
