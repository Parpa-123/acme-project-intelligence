from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_
from typing import List, Optional
import uuid
from datetime import datetime

from src.models import User
from .models import Project, ProjectMembers, ProjectInvitation, MemberRole, InvitationStatus
from .schemas import ProjectCreate, ProjectUpdate, ProjectMemberUpdate

class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Projects ---
    def create_project(self, owner_id: int, project_in: ProjectCreate) -> Project:
        project = Project(
            owner_id=owner_id,
            name=project_in.name,
            description=project_in.description,
            visibility=project_in.visibility
        )
        self.db.add(project)
        self.db.flush()
        return project

    def get_project(self, project_id: int) -> Optional[Project]:
        return self.db.query(Project).filter(Project.id == project_id).first()

    def get_user_projects(self, user_id: int) -> List[Project]:
        # Projects owned by user OR where user is a member
        member_project_ids = self.db.query(ProjectMembers.project_id).filter(ProjectMembers.user_id == user_id)
        return self.db.query(Project).filter(
            or_(
                Project.owner_id == user_id,
                Project.id.in_(member_project_ids)
            )
        ).all()

    def update_project(self, project: Project, project_update: ProjectUpdate) -> Project:
        update_data = project_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)
        self.db.flush()
        return project

    def delete_project(self, project: Project) -> None:
        self.db.delete(project)
        self.db.flush()

    # --- Members ---
    def add_member(self, project_id: int, user_id: int, role: MemberRole) -> ProjectMembers:
        member = ProjectMembers(project_id=project_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.flush()
        return member

    def get_member(self, project_id: int, user_id: int) -> Optional[ProjectMembers]:
        return self.db.query(ProjectMembers).filter(
            ProjectMembers.project_id == project_id,
            ProjectMembers.user_id == user_id
        ).first()

    def get_project_members(self, project_id: int) -> List[ProjectMembers]:
        return self.db.query(ProjectMembers).filter(ProjectMembers.project_id == project_id).all()

    def update_member_role(self, member: ProjectMembers, role: MemberRole) -> ProjectMembers:
        member.role = role
        self.db.flush()
        return member

    def remove_member(self, member: ProjectMembers) -> None:
        self.db.delete(member)
        self.db.flush()

    # --- Invitations ---
    def create_invitation(self, project_id: int, email: str, token_hash: str, invited_by: int, expires_at: datetime) -> ProjectInvitation:
        invitation = ProjectInvitation(
            project_id=project_id,
            email=email,
            token_hash=token_hash,
            invited_by=invited_by,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        self.db.add(invitation)
        self.db.flush()
        return invitation

    def get_invitation(self, invitation_id: uuid.UUID) -> Optional[ProjectInvitation]:
        return self.db.query(ProjectInvitation).filter(ProjectInvitation.id == invitation_id).first()

    def get_invitation_by_token(self, token_hash: str) -> Optional[ProjectInvitation]:
        return self.db.query(ProjectInvitation).filter(ProjectInvitation.token_hash == token_hash).first()

    def get_project_invitations(self, project_id: int) -> List[ProjectInvitation]:
        return self.db.query(ProjectInvitation).filter(ProjectInvitation.project_id == project_id).all()

    def get_pending_invitations_for_email(self, email: str) -> List[ProjectInvitation]:
        return self.db.query(ProjectInvitation).filter(
            ProjectInvitation.email == email,
            ProjectInvitation.status == InvitationStatus.PENDING
        ).all()

    def delete_invitation(self, invitation: ProjectInvitation) -> None:
        self.db.delete(invitation)
        self.db.flush()

    # --- Utilities ---
    def search_projects(self, query: str, user_id: int) -> List[Project]:
        member_project_ids = self.db.query(ProjectMembers.project_id).filter(ProjectMembers.user_id == user_id)
        return self.db.query(Project).filter(
            or_(
                Project.owner_id == user_id,
                Project.id.in_(member_project_ids)
            ),
            Project.name.ilike(f"%{query}%")
        ).all()
