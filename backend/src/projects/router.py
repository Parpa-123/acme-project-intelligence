from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from .schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, 
    ProjectMemberUpdate, ProjectMemberResponse,
    InvitationCreate, InvitationResponse, InvitationDetailsResponse,
    DashboardResponse, ProjectDashboardResponse
)
from .service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])
invitations_router = APIRouter(prefix="/invitations", tags=["invitations"])

def get_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(db)

from fastapi_cache.decorator import cache

# ----------------------------------------
# Dashboards
# ----------------------------------------
@router.get("/dashboard", response_model=DashboardResponse)
@cache(expire=60)
def get_dashboard(
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.get_dashboard(session.get_user_id())

@router.get("/{project_id}/dashboard", response_model=ProjectDashboardResponse)
@cache(expire=60)
def get_project_dashboard(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.get_project_dashboard(session.get_user_id(), project_id)

# ----------------------------------------
# Utilities
# ----------------------------------------
@router.get("/search", response_model=List[ProjectResponse])
def search_projects(
    q: str = Query(..., min_length=1),
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.search_projects(session.get_user_id(), q)

# ----------------------------------------
# Project CRUD
# ----------------------------------------
@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    project_in: ProjectCreate,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.create_project(session.get_user_id(), project_in)

from src.core.schemas import PaginatedResponse

@router.get("", response_model=PaginatedResponse[ProjectResponse])
def list_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.list_projects(session.get_user_id(), page=page, size=size)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.get_project(session.get_user_id(), project_id)

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.update_project(session.get_user_id(), project_id, project_in)

@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    service.delete_project(session.get_user_id(), project_id)

# ----------------------------------------
# Members
# ----------------------------------------
@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_members(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.list_members(session.get_user_id(), project_id)

@router.patch("/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
def update_member_role(
    project_id: int,
    user_id: int,
    role_in: ProjectMemberUpdate,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.update_member_role(session.get_user_id(), project_id, user_id, role_in)

@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: int,
    user_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    service.remove_member(session.get_user_id(), project_id, user_id)

@router.delete("/{project_id}/leave", status_code=204)
def leave_project(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    service.leave_project(session.get_user_id(), project_id)

# ----------------------------------------
# Invitations
# ----------------------------------------
@router.post("/{project_id}/invitations", response_model=InvitationResponse, status_code=201)
def create_invitation(
    project_id: int,
    inv_in: InvitationCreate,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.create_invitation_route(session.get_user_id(), project_id, inv_in)

@router.get("/{project_id}/invitations", response_model=List[InvitationResponse])
def list_invitations(
    project_id: int,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.list_invitations(session.get_user_id(), project_id)

@router.delete("/{project_id}/invitations/{invitation_id}", status_code=204)
def delete_invitation(
    project_id: int,
    invitation_id: UUID,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    service.delete_invitation(session.get_user_id(), project_id, invitation_id)

# Global Invitations Router (for accepting without knowing project_id initially)
@invitations_router.get("/{token}", response_model=InvitationDetailsResponse)
def get_invitation_details(
    token: str,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    # Depending on requirements, getting details might not require a session, but usually it's good to verify the user
    return service.get_invitation_details(token)

@invitations_router.post("/{token}/accept", response_model=ProjectResponse)
def accept_invitation(
    token: str,
    service: ProjectService = Depends(get_service),
    session: SessionContainer = Depends(verify_session())
):
    return service.accept_invitation(session.get_user_id(), token)
