from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from src.models import User
from .repository import ProjectRepository
from .models import ProjectVisibility, MemberRole, InvitationStatus
from .schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, 
    ProjectMemberUpdate, ProjectMemberResponse,
    InvitationCreate, InvitationResponse, InvitationDetailsResponse,
    DashboardResponse, ProjectDashboardResponse
)

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def _get_user_by_supertokens_id(self, st_id: str) -> User:
        user = self.db.query(User).filter(User.supertokens_id == st_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def _get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def _check_project_access(self, project_id: int, user_id: int, require_role: Optional[List[MemberRole]] = None):
        project = self.repo.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        member = self.repo.get_member(project_id, user_id)
        is_owner = project.owner_id == user_id
        
        if not member and not is_owner:
            if project.visibility == ProjectVisibility.PRIVATE:
                raise HTTPException(status_code=403, detail="Not enough permissions")
            # Public project, read-only if no roles required
            if require_role:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        
        if require_role:
            user_role = member.role if member else (MemberRole.OWNER if is_owner else None)
            if user_role not in require_role and not is_owner:
                raise HTTPException(status_code=403, detail="Not enough permissions")
                
        return project, member

    # --- Projects ---
    def create_project(self, st_id: str, project_in: ProjectCreate):
        user = self._get_user_by_supertokens_id(st_id)
        
        project = self.repo.create_project(user.id, project_in)
        # Add owner to members automatically
        self.repo.add_member(project.id, user.id, MemberRole.OWNER)
        
        # Handle initial invitations
        for email in project_in.invite_emails:
            self.create_invitation(user.id, project.id, InvitationCreate(email=email))
            
        self.db.commit()
        return project

    def list_projects(self, st_id: str, page: int = 1, size: int = 20, status: str = "active"):
        user = self._get_user_by_supertokens_id(st_id)
        projects, total = self.repo.get_user_projects_paginated(user.id, page, size, status=status)
        return {
            "items": projects,
            "total": total,
            "page": page,
            "size": size,
            "has_more": (page * size) < total
        }

    def get_project(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        project, _ = self._check_project_access(project_id, user.id)
        return project

    def update_project(self, st_id: str, project_id: int, project_update: ProjectUpdate):
        user = self._get_user_by_supertokens_id(st_id)
        project, _ = self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        
        project = self.repo.update_project(project, project_update)
        self.db.commit()
        return project

    def delete_project(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        project, _ = self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER])
        
        self.repo.delete_project(project)
        self.db.commit()

    # --- Members ---
    def list_members(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        self._check_project_access(project_id, user.id)
        return self.repo.get_project_members(project_id)

    def update_member_role(self, st_id: str, project_id: int, target_user_id: int, role_update: ProjectMemberUpdate):
        user = self._get_user_by_supertokens_id(st_id)
        self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        
        member = self.repo.get_member(project_id, target_user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        member = self.repo.update_member_role(member, role_update.role)
        self.db.commit()
        return member

    def remove_member(self, st_id: str, project_id: int, target_user_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        project, _ = self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        
        if target_user_id == project.owner_id:
            raise HTTPException(status_code=400, detail="Cannot remove the project owner")
            
        member = self.repo.get_member(project_id, target_user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
            
        self.repo.remove_member(member)
        self.db.commit()

    def leave_project(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        project, member = self._check_project_access(project_id, user.id)
        
        if project.owner_id == user.id:
            raise HTTPException(status_code=400, detail="Owner cannot leave project. Transfer ownership or delete project instead.")
            
        if member:
            self.repo.remove_member(member)
            self.db.commit()

    # --- Invitations ---
    def create_invitation(self, inviter_user_id: int, project_id: int, inv_in: InvitationCreate, commit: bool = True):
        # We can be called internally or from router
        project = self.repo.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Generate a secure token
        token = secrets.token_urlsafe(32)
        token_hash = _hash_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        invitation = self.repo.create_invitation(
            project_id=project_id,
            email=inv_in.email,
            token_hash=token_hash,
            invited_by=inviter_user_id,
            expires_at=expires_at
        )
        if commit:
            self.db.commit()
            
        # Dispatch the background email task
        from src.arq_client import enqueue_arq_job_sync
        inviter_user = self.db.query(User).filter(User.id == inviter_user_id).first()
        inviter_name = inviter_user.full_name or inviter_user.email
        
        enqueue_arq_job_sync(
            "send_project_invitation_email",
            email=inv_in.email,
            inviter_name=inviter_name,
            project_name=project.name,
            token=token
        )
            
        return invitation

    def create_invitation_route(self, st_id: str, project_id: int, inv_in: InvitationCreate):
        user = self._get_user_by_supertokens_id(st_id)
        self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        return self.create_invitation(user.id, project_id, inv_in)

    def list_invitations(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        return self.repo.get_project_invitations(project_id)

    def get_invitation_details(self, token: str):
        token_hash = _hash_token(token)
        invitation = self.repo.get_invitation_by_token(token_hash)
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found or invalid")
            
        return invitation

    def accept_invitation(self, st_id: str, token: str):
        user = self._get_user_by_supertokens_id(st_id)
        token_hash = _hash_token(token)
        invitation = self.repo.get_invitation_by_token(token_hash)
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found or invalid")
            
        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status.value}")
            
        if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.EXPIRED
            self.db.commit()
            raise HTTPException(status_code=400, detail="Invitation has expired")
            
        if invitation.email.lower() != user.email.lower():
            raise HTTPException(status_code=403, detail="Invitation was sent to a different email address")

        # Accept the invitation
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        
        # Add to project
        existing_member = self.repo.get_member(invitation.project_id, user.id)
        if not existing_member:
            self.repo.add_member(invitation.project_id, user.id, MemberRole.MEMBER)
            
        self.db.commit()
        return self.repo.get_project(invitation.project_id)

    def delete_invitation(self, st_id: str, project_id: int, invitation_id: uuid.UUID):
        user = self._get_user_by_supertokens_id(st_id)
        self._check_project_access(project_id, user.id, require_role=[MemberRole.OWNER, MemberRole.ADMIN])
        
        invitation = self.repo.get_invitation(invitation_id)
        if not invitation or invitation.project_id != project_id:
            raise HTTPException(status_code=404, detail="Invitation not found")
            
        self.repo.delete_invitation(invitation)
        self.db.commit()

    # --- Dashboard & Utilities ---
    def get_dashboard(self, st_id: str):
        user = self._get_user_by_supertokens_id(st_id)
        projects = self.repo.get_user_projects(user.id)
        
        projects_owned = sum(1 for p in projects if p.owner_id == user.id)
        projects_joined = len(projects) - projects_owned
        pending_invites = self.repo.get_pending_invitations_for_email(user.email)
        
        return {
            "total_projects": len(projects),
            "projects_owned": projects_owned,
            "projects_joined": projects_joined,
            "recent_projects": sorted(projects, key=lambda x: x.created_at, reverse=True)[:5],
            "pending_invitations": pending_invites
        }

    def get_project_dashboard(self, st_id: str, project_id: int):
        user = self._get_user_by_supertokens_id(st_id)
        project, member = self._check_project_access(project_id, user.id)
        
        members = self.repo.get_project_members(project_id)
        invitations = self.repo.get_project_invitations(project_id)
        pending_invitations = [i for i in invitations if i.status == InvitationStatus.PENDING]
        
        return {
            "project": project,
            "total_members": len(members),
            "pending_invitations_count": len(pending_invitations),
            "recent_members": sorted(members, key=lambda x: x.created_at, reverse=True)[:5],
            "current_user_role": getattr(member, 'role', None) if member else (MemberRole.OWNER if project.owner_id == user.id else None)
        }

    def search_projects(self, st_id: str, query: str):
        user = self._get_user_by_supertokens_id(st_id)
        return self.repo.search_projects(query, user.id)
