from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import re
from .models import MeetingSpace, Meeting, MeetingStatus

class MeetingSpaceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_meeting_space(self, project_id: int, created_by: int, name: str, description: Optional[str]) -> MeetingSpace:
        space_id = uuid.uuid4()
        # Create a URL-friendly room name
        safe_name = re.sub(r'[^a-z0-9]', '-', name.lower())
        livekit_room_name = f"{safe_name}-{str(space_id)[:8]}"
        
        space = MeetingSpace(
            id=space_id,
            project_id=project_id,
            created_by=created_by,
            name=name,
            description=description,
            livekit_room_name=livekit_room_name
        )
        self.db.add(space)
        self.db.commit()
        self.db.refresh(space)
        return space

    def get_meeting_spaces(self, project_id: int, status: str = "active") -> List[dict]:
        query = self.db.query(MeetingSpace).filter(MeetingSpace.project_id == project_id)
        if status == "active":
            query = query.filter(MeetingSpace.is_archived == False)
        elif status == "archived":
            query = query.filter(MeetingSpace.is_archived == True)
            
        spaces = query.all()
        results = []
        for space in spaces:
            # Check if there's an active meeting
            active_meeting = self.db.query(Meeting).filter(
                Meeting.meeting_space_id == space.id,
                Meeting.status == MeetingStatus.IN_PROGRESS
            ).first()
            
            results.append({
                "id": space.id,
                "name": space.name,
                "active_session": bool(active_meeting)
            })
        return results

    def get_meeting_space_by_id(self, space_id: uuid.UUID) -> Optional[MeetingSpace]:
        return self.db.query(MeetingSpace).filter(MeetingSpace.id == space_id).first()

    def get_active_meeting_for_space(self, space_id: uuid.UUID) -> Optional[Meeting]:
        return self.db.query(Meeting).filter(
            Meeting.meeting_space_id == space_id,
            Meeting.status == MeetingStatus.IN_PROGRESS
        ).first()

    def get_meeting_by_id(self, meeting_id: uuid.UUID) -> Optional[Meeting]:
        return self.db.query(Meeting).filter(Meeting.id == meeting_id).first()

    def update_meeting_space(self, space: MeetingSpace, update_data: dict) -> MeetingSpace:
        for key, value in update_data.items():
            if value is not None:
                setattr(space, key, value)
        self.db.commit()
        self.db.refresh(space)
        return space

    def archive_meeting_space(self, space: MeetingSpace):
        space.is_archived = True
        self.db.commit()

    def unarchive_meeting_space(self, space: MeetingSpace):
        space.is_archived = False
        self.db.commit()

    def publish_meeting_space(self, space: MeetingSpace):
        space.is_global = True
        self.db.commit()

    def unpublish_meeting_space(self, space: MeetingSpace):
        space.is_global = False
        self.db.commit()
