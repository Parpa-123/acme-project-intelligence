from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os

from src.models import User
from .models import Meeting, MeetingSpace, MeetingStatus, MeetingEvent, MeetingEventType, MeetingParticipant
from .repository import MeetingSpaceRepository

# Check if livekit is installed, if not we can stub it out temporarily
try:
    from livekit import api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False


class MeetingSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MeetingSpaceRepository(db)
        self.livekit_url = os.environ.get("LIVEKIT_TOKEN_ENDPOINT", "wss://livekit.example.com")
        self.livekit_api_key = os.environ.get("LIVEKIT_API_KEY", "devkey")
        self.livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET", "secret")

    def start_meeting(self, space_id: str, user_id: int) -> Meeting:
        space = self.repo.get_meeting_space_by_id(uuid.UUID(space_id))
        if not space:
            raise HTTPException(status_code=404, detail="Meeting space not found")

        # Check if active meeting already exists
        meeting = self.repo.get_active_meeting_for_space(space.id)
        if meeting:
            return meeting

        # Create new meeting session
        meeting_id = uuid.uuid4()
        meeting = Meeting(
            id=meeting_id,
            meeting_space_id=space.id,
            created_by=user_id,
            name=f"{space.name} Session",
            status=MeetingStatus.IN_PROGRESS,
            started_at=datetime.now(timezone.utc)
        )
        self.db.add(meeting)

        # Log CREATED event
        event = MeetingEvent(
            meeting_id=meeting_id,
            user_id=user_id,
            event_type=MeetingEventType.CREATED
        )
        self.db.add(event)

        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def join_meeting(self, space_id: str, user: User) -> dict:
        space = self.repo.get_meeting_space_by_id(uuid.UUID(space_id))
        if not space:
            raise HTTPException(status_code=404, detail="Meeting space not found")

        # Check for active meeting, if none exists, start it
        meeting = self.repo.get_active_meeting_for_space(space.id)
        if not meeting:
            meeting = self.start_meeting(space_id, user.id)

        # Generate LiveKit Token
        jwt = ""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)
        if LIVEKIT_AVAILABLE:
            token = (
                api.AccessToken(
                    self.livekit_api_key,
                    self.livekit_api_secret
                )
                .with_identity(str(user.id))
                .with_name(user.full_name or user.email)
                .with_grants(
                    api.VideoGrants(
                        room_join=True,
                        room=space.livekit_room_name,
                        can_publish=True,
                        can_subscribe=True,
                        can_publish_data=True
                    )
                )
            )
            jwt = token.to_jwt()

        # Save participant
        participant = MeetingParticipant(
            meeting_id=meeting.id,
            user_id=user.id,
            joined_at=datetime.now(timezone.utc)
        )
        self.db.add(participant)

        # Log JOINED event
        event = MeetingEvent(
            meeting_id=meeting.id,
            user_id=user.id,
            event_type=MeetingEventType.JOINED
        )
        self.db.add(event)

        self.db.commit()

        return {
            "meeting_id": meeting.id,
            "room_name": space.livekit_room_name,
            "livekit_url": self.livekit_url,
            "access_token": jwt,
            "expires_at": expires_at
        }

    def leave_meeting(self, meeting_id: str, user_id: int):
        meeting_uuid = uuid.UUID(meeting_id)
        # Find active participant row
        participant = self.db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_uuid,
            MeetingParticipant.user_id == user_id,
            MeetingParticipant.left_at == None
        ).order_by(MeetingParticipant.joined_at.desc()).first()

        now = datetime.now(timezone.utc)
        if participant:
            participant.left_at = now

        # Log LEFT event
        event = MeetingEvent(
            meeting_id=meeting_uuid,
            user_id=user_id,
            event_type=MeetingEventType.LEFT
        )
        self.db.add(event)
        
        # Check if there are any remaining active participants
        active_participants_count = self.db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_uuid,
            MeetingParticipant.left_at == None
        ).count()
        
        if active_participants_count == 0:
            # End the meeting
            meeting = self.db.query(Meeting).filter(Meeting.id == meeting_uuid).first()
            if meeting and meeting.status == MeetingStatus.IN_PROGRESS:
                meeting.status = MeetingStatus.COMPLETED
                meeting.ended_at = now
                
                # Log ENDED event
                end_event = MeetingEvent(
                    meeting_id=meeting_uuid,
                    user_id=user_id,
                    event_type=MeetingEventType.ENDED
                )
                self.db.add(end_event)
                
        self.db.commit()
