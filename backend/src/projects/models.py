import uuid
from enum import Enum
from src.database import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

class ProjectVisibility(str, Enum):
    PRIVATE = "private"
    PUBLIC = "public"

class MemberRole(str, Enum):
    OWNER = "owner"
    MEMBER = "member"
    ADMIN = "admin"

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    visibility = Column(SQLEnum(ProjectVisibility), default=ProjectVisibility.PRIVATE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ProjectMembers(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(SQLEnum(MemberRole), default=MemberRole.MEMBER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Eager loading relationship
    user = relationship("User", lazy="joined")

class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    token_hash = Column(String(255), nullable=False)
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Eager loading relationships
    project = relationship("Project", lazy="joined")
    invited_by_user = relationship("User", foreign_keys=[invited_by], lazy="joined")