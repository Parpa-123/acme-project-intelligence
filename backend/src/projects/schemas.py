from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from .models import ProjectVisibility, MemberRole, InvitationStatus

# ----------------------------------------
# Generic / Shared
# ----------------------------------------
class UserBasicInfo(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------------------------------
# Project CRUD
# ----------------------------------------
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE
    invite_emails: List[EmailStr]

    @field_validator('invite_emails')
    def validate_invite_emails(cls, v):
        if not v:
            raise ValueError('At least one email is required')
        return v

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    visibility: Optional[ProjectVisibility] = None
    is_archived: Optional[bool] = None
    is_global: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str] = None
    visibility: ProjectVisibility
    is_archived: bool = False
    is_global: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------------------------------
# Members
# ----------------------------------------
class ProjectMemberUpdate(BaseModel):
    role: MemberRole

class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: MemberRole
    created_at: datetime
    user: Optional[UserBasicInfo] = None # Nested user info if joined

    class Config:
        from_attributes = True

# ----------------------------------------
# Invitations
# ----------------------------------------
class InvitationCreate(BaseModel):
    email: EmailStr

class InvitationResponse(BaseModel):
    id: UUID
    project_id: int
    email: EmailStr
    status: InvitationStatus
    invited_by: int
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InvitationDetailsResponse(BaseModel):
    id: UUID
    project: ProjectResponse
    email: EmailStr
    status: InvitationStatus
    invited_by_user: Optional[UserBasicInfo] = None
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------------------------------
# Dashboards
# ----------------------------------------
class DashboardResponse(BaseModel):
    total_projects: int
    projects_owned: int
    projects_joined: int
    recent_projects: List[ProjectResponse] = []
    pending_invitations: List[InvitationResponse] = []

class ProjectDashboardResponse(BaseModel):
    project: ProjectResponse
    total_members: int
    pending_invitations_count: int
    # You can expand this later with tasks, activity logs, etc.
    recent_members: List[ProjectMemberResponse] = []
    current_user_role: Optional[MemberRole] = None