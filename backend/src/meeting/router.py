from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import os

from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from .schemas import (
    MeetingSpaceCreateRequest, MeetingSpaceCreateResponse, MeetingSpaceListResponse,
    MeetingSpaceDetailResponse, MeetingSpaceUpdateRequest, ActiveMeetingSummary, UserSummary,
    MeetingSessionResponse, MeetingJoinResponse, SuccessResponse
)
import uuid
import io
import wave
import base64

def pcm_to_wav_base64(raw_pcm_bytes, channels=1, sample_width=2, sample_rate=16000):
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(raw_pcm_bytes)
    return base64.b64encode(wav_buffer.getvalue()).decode('utf-8')

from .repository import MeetingSpaceRepository
from .service import MeetingSessionService
from src.projects.service import ProjectService
from src.projects.models import MemberRole
from src.models import User
from src.arq_client import enqueue_arq_job

router = APIRouter(prefix="/projects/{project_id}/meeting-spaces", tags=["Meeting Spaces (Projects)"])
space_router = APIRouter(prefix="/meeting-spaces", tags=["Meeting Spaces (Detail)"])
session_router = APIRouter(prefix="/meetings", tags=["Meeting Sessions"])

@router.post("", response_model=MeetingSpaceCreateResponse, status_code=201)
def create_meeting_space(
    project_id: int,
    space_in: MeetingSpaceCreateRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = MeetingSpaceRepository(db)
    space = repo.create_meeting_space(
        project_id=project_id,
        created_by=user.id,
        name=space_in.name,
        description=space_in.description
    )
    
    # Construct a frontend join URL
    frontend_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000")
    join_url = f"{frontend_url}/m/{space.livekit_room_name}"
    
    return MeetingSpaceCreateResponse(id=space.id, join_url=join_url)

from fastapi import Query

@router.get("", response_model=List[MeetingSpaceListResponse])
def list_meeting_spaces(
    project_id: int,
    status: str = Query("active", description="Filter by status: active, archived, all"),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    repo = MeetingSpaceRepository(db)
    spaces = repo.get_meeting_spaces(project_id, status=status)
    return spaces

def _get_join_url(room_name: str) -> str:
    frontend_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000")
    return f"{frontend_url}/m/{room_name}"

@space_router.get("/{space_id}", response_model=MeetingSpaceDetailResponse)
def get_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Check if user has access to the project
    project_service._check_project_access(space.project_id, user.id)
    
    active_meeting = repo.get_active_meeting_for_space(space.id)
    active_meeting_summary = None
    if active_meeting:
        participant_count = len(active_meeting.participants)
        active_meeting_summary = ActiveMeetingSummary(
            id=active_meeting.id,
            status=active_meeting.status.value,
            participant_count=participant_count
        )
        
    creator = space.creator
    created_by_summary = UserSummary(
        id=creator.id,
        display_name=creator.full_name or creator.email
    )
    
    return MeetingSpaceDetailResponse(
        id=space.id,
        project_id=space.project_id,
        name=space.name,
        description=space.description,
        join_url=_get_join_url(space.livekit_room_name),
        active_meeting=active_meeting_summary,
        created_by=created_by_summary,
        created_at=space.created_at,
        is_archived=space.is_archived,
        is_global=space.is_global
    )

@space_router.put("/{space_id}", response_model=MeetingSpaceDetailResponse)
def update_meeting_space(
    space_id: str,
    space_in: MeetingSpaceUpdateRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Require admin or owner role to update
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    repo.update_meeting_space(space, space_in.model_dump(exclude_unset=True))
    
    # We can just redirect to the GET endpoint logic
    return get_meeting_space(space_id, db, session)

@space_router.get("/{space_id}/meetings")
def get_meeting_history(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(space.project_id, user.id)
    
    from .models import Meeting, MeetingStatus
    
    meetings = db.query(Meeting).filter(
        Meeting.meeting_space_id == space.id,
        Meeting.status == MeetingStatus.COMPLETED
    ).order_by(Meeting.ended_at.desc()).all()
    
    return [
        {
            "id": m.id,
            "name": m.name,
            "status": m.status.value,
            "started_at": m.started_at,
            "ended_at": m.ended_at
        } for m in meetings
    ]

@space_router.post("/{space_id}/archive", status_code=204)
def archive_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Require admin or owner role to archive
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    active_meeting = repo.get_active_meeting_for_space(space.id)
    if active_meeting:
        raise HTTPException(status_code=400, detail="Cannot archive a space with an active meeting in progress")
        
    repo.archive_meeting_space(space)
    return None

@space_router.post("/{space_id}/unarchive", status_code=204)
def unarchive_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    # Require admin or owner role to unarchive
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    repo.unarchive_meeting_space(space)
    return None

@space_router.post("/{space_id}/publish", status_code=204)
def publish_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    repo.publish_meeting_space(space)
    return None

@space_router.post("/{space_id}/unpublish", status_code=204)
def unpublish_meeting_space(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(
        space.project_id, 
        user.id, 
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    repo.unpublish_meeting_space(space)
    return None

@space_router.post("/{space_id}/start", response_model=MeetingSessionResponse)
def start_meeting(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(space.project_id, user.id)
    session_service = MeetingSessionService(db)
    meeting = session_service.start_meeting(space_id, user.id)
    return MeetingSessionResponse(
        id=meeting.id,
        meeting_space_id=meeting.meeting_space_id,
        status=meeting.status.value,
        started_at=meeting.started_at
    )

@session_router.post("/{meeting_id}/start-stt", response_model=SuccessResponse)
def start_stt(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    # Dispatch STT Agent manually
    enqueue_arq_job(
        "dispatch_stt_agent", 
        meeting.meeting_space.livekit_room_name
    )
    
    return SuccessResponse(status="success", message="STT Agent dispatched.")

@space_router.post("/{space_id}/join", response_model=MeetingJoinResponse)
def join_meeting(
    space_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    repo = MeetingSpaceRepository(db)
    space = repo.get_meeting_space_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Meeting space not found")
        
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(space.project_id, user.id)
    session_service = MeetingSessionService(db)
    
    return session_service.join_meeting(space_id, user)

@session_router.post("/{meeting_id}/leave", response_model=SuccessResponse)
def leave_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    session_service = MeetingSessionService(db)
    session_service.leave_meeting(meeting_id, user.id)
    
    return SuccessResponse(status="success", message="Successfully left meeting.")


from .schemas import MeetingChatMessageRequest, MeetingChatMessageResponse, MeetingTranscriptResponse
from .models import MeetingChatMessage, Meeting, MeetingChatType, MeetingTranscript
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
import redis.asyncio as aioredis
import websockets
from datetime import datetime, timezone




@session_router.get("/{meeting_id}/transcript", response_model=List[MeetingTranscriptResponse])
def get_meeting_transcripts(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    transcripts = db.query(MeetingTranscript).filter(
        MeetingTranscript.meeting_id == uuid.UUID(meeting_id)
    ).order_by(MeetingTranscript.created_at.asc()).all()
    
    return [
        MeetingTranscriptResponse(
            id=t.id,
            meeting_id=t.meeting_id,
            user_id=t.user_id,
            user_name=t.user.full_name or t.user.email.split('@')[0],
            text=t.text,
            is_final=t.is_final,
            created_at=t.created_at
        ) for t in transcripts
    ]

from pydantic import BaseModel
from typing import List

class KnowledgeChunkResponse(BaseModel):
    id: str
    chunk_index: int
    entry_count: int
    participants: List[str]
    text: str
    start_timestamp: datetime
    end_timestamp: datetime

@session_router.get("/{meeting_id}/knowledge", response_model=List[KnowledgeChunkResponse])
def get_meeting_knowledge(meeting_id: str, db: Session = Depends(get_db)):
    from src.knowledge.models import KnowledgeChunk
    chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.meeting_id == meeting_id).order_by(KnowledgeChunk.chunk_index.asc()).all()
    
    # We resolve the participant IDs to names just like the plan requested
    results = []
    for c in chunks:
        participant_names = []
        for p_id in c.participant_ids:
            u = db.query(User).filter(User.id == p_id).first()
            if u:
                participant_names.append(u.full_name or u.email.split('@')[0])
                
        results.append(KnowledgeChunkResponse(
            id=str(c.id),
            chunk_index=c.chunk_index,
            entry_count=c.entry_count,
            participants=participant_names,
            text=c.text,
            start_timestamp=c.start_timestamp,
            end_timestamp=c.end_timestamp
        ))
    return results

# ==========================================
# Meeting Intelligence (Enrichment) APIs
# ==========================================

from src.meeting.models import MeetingProcessingStatus

@session_router.get("/{meeting_id}/processing")
def get_meeting_processing_status(meeting_id: str, db: Session = Depends(get_db)):
    record = db.query(MeetingProcessingStatus).filter_by(meeting_id=meeting_id).first()
    if not record:
        return {
            "transcript_status": "pending",
            "knowledge_status": "pending",
            "enrichment_status": "pending",
            "error_message": None
        }
    return {
        "transcript_status": record.transcript_status,
        "knowledge_status": record.knowledge_status,
        "enrichment_status": record.enrichment_status,
        "error_message": record.error_message,
        "last_updated": record.last_updated
    }


@session_router.websocket("/{meeting_id}/transcript/ws")
async def websocket_transcript(websocket: WebSocket, meeting_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        await websocket.close(code=1008, reason="Meeting not found")
        return
        
    room_name = meeting.meeting_space.livekit_room_name
    
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    
    last_id = "$"
    
    try:
        while True:
            streams = await redis_client.xread(
                {"meeting.events": last_id}, 
                count=10, 
                block=1000
            )
            
            if streams:
                for stream_name, messages in streams:
                    for message_id, message_data in messages:
                        last_id = message_id
                        
                        raw_event = message_data[b"event"] if b"event" in message_data else message_data.get("event")
                        if isinstance(raw_event, bytes):
                            raw_event = raw_event.decode("utf-8")
                            
                        event_data = json.loads(raw_event)
                        
                        if event_data.get("meeting_id") == room_name:
                            await websocket.send_json(event_data)
                            
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Transcript WS error: {e}")
    finally:
        await redis_client.close()

import aiohttp

@session_router.websocket("/{meeting_id}/stt/ws")
async def websocket_stt_proxy(
    websocket: WebSocket, 
    meeting_id: str, 
    language: str = "en-IN", 
    mode: str = "transcribe",
    user_name: str = "Unknown User",
    user_id: str = "",
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        await websocket.close(code=1008, reason="Meeting not found")
        return
        
    room_name = meeting.meeting_space.livekit_room_name
    sarvam_key = os.environ.get("SARVAM_API_KEY")
    if not sarvam_key:
        print("\033[91m[STT Proxy] SARVAM_API_KEY missing. Closing connection.\033[0m")
        await websocket.close(code=1011, reason="Server error")
        return

    print(f"\033[94m[STT Proxy] Starting session for room: {room_name} and user: {user_name}\033[0m")

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)

    url = f"wss://api.sarvam.ai/speech-to-text/ws?language-code={language}&model=saaras%3Av3&vad_signals=true&sample_rate=16000&mode={mode}"
    headers = {"api-subscription-key": sarvam_key}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(url, headers=headers) as sarvam_ws:
                
                async def read_from_client():
                    try:
                        while True:
                            message = await websocket.receive()
                            if "bytes" in message:
                                if len(message["bytes"]) == 0:
                                    continue

                                print(f"\033[93m[STT Proxy] Received {len(message['bytes'])} bytes from client, forwarding to Sarvam...\033[0m")
                                import base64
                                base64_audio = base64.b64encode(message["bytes"]).decode("utf-8")
                                await sarvam_ws.send_json({
                                    "audio": {
                                        "data": base64_audio,
                                        "encoding": "audio/wav",
                                        "sample_rate": 16000
                                    }
                                })
                            elif "text" in message:
                                data = json.loads(message["text"])
                                if data.get("action") == "close":
                                    print("\033[93m[STT Proxy] Client sent close action. Stopping.\033[0m")
                                    break
                    except WebSocketDisconnect:
                        print("\033[92m[STT Proxy] Client WebSocket disconnected cleanly\033[0m")
                        pass
                    except Exception as e:
                        print(f"\033[91m[STT Proxy] Error reading from client: {e}\033[0m")
                    finally:
                        print("\033[94m[STT Proxy] Exiting read_from_client loop\033[0m")
                        try:
                            await sarvam_ws.send_json({"action": "close"})
                        except:
                            pass

                async def read_from_sarvam():
                    try:
                        async for msg in sarvam_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                
                                if data.get("type") == "data" and "transcript" in data.get("data", {}):
                                    transcript = data["data"]["transcript"].strip()
                                    if transcript:
                                        print(f"\033[92m[STT Proxy] Transcript from Sarvam: '{transcript}'\033[0m")
                                        redis_event = {
                                            "type": "USER_TRANSCRIPT",
                                            "meeting_id": room_name,
                                            "timestamp": datetime.now(timezone.utc).isoformat(),
                                            "payload": {
                                                "speaker": "client",
                                                "user_name": user_name,
                                                "user_id": user_id,
                                                "text": transcript,
                                                "is_final": True
                                            }
                                        }
                                        await redis_client.xadd("meeting.events", {"event": json.dumps(redis_event)})
                                        
                                        # Also send a speaking_stop just in case
                                        redis_event_stop = {
                                            "type": "USER_ACTION",
                                            "meeting_id": room_name,
                                            "timestamp": datetime.now(timezone.utc).isoformat(),
                                            "payload": {
                                                "speaker": "client",
                                                "action": "speaking_stop"
                                            }
                                        }
                                        await redis_client.xadd("meeting.events", {"event": json.dumps(redis_event_stop)})
                                        
                                elif data.get("type") == "events":
                                    signal = data.get("data", {}).get("signal_type")
                                    if signal == "START_SPEECH":
                                        redis_event = {
                                            "type": "USER_ACTION",
                                            "meeting_id": room_name,
                                            "timestamp": datetime.now(timezone.utc).isoformat(),
                                            "payload": {
                                                "speaker": "client",
                                                "action": "speaking_start"
                                            }
                                        }
                                        await redis_client.xadd("meeting.events", {"event": json.dumps(redis_event)})
                                    elif signal == "END_SPEECH":
                                        redis_event = {
                                            "type": "USER_ACTION",
                                            "meeting_id": room_name,
                                            "timestamp": datetime.now(timezone.utc).isoformat(),
                                            "payload": {
                                                "speaker": "client",
                                                "action": "speaking_stop"
                                            }
                                        }
                                        await redis_client.xadd("meeting.events", {"event": json.dumps(redis_event)})
                                
                                elif data.get("type") == "error":
                                    print(f"\033[91m[STT Proxy] ❌ Sarvam Error: {data}\033[0m")
                            elif msg.type == aiohttp.WSMsgType.CLOSED:
                                print("\033[91m[STT Proxy] Sarvam WebSocket closed by remote\033[0m")
                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                print(f"\033[91m[STT Proxy] Sarvam WebSocket ERROR: {msg}\033[0m")
                    except Exception as e:
                        print(f"\033[91m[STT Proxy] Error reading from Sarvam: {e}\033[0m")
                    finally:
                        print("\033[94m[STT Proxy] Exiting read_from_sarvam loop\033[0m")

                client_task = asyncio.create_task(read_from_client())
                sarvam_task = asyncio.create_task(read_from_sarvam())
                
                done, pending = await asyncio.wait(
                    [client_task, sarvam_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                for task in pending:
                    task.cancel()
    except Exception as e:
        print(f"\033[91m[STT Proxy] Fatal Proxy error: {e}\033[0m")
    finally:
        print("\033[94m[STT Proxy] Closing Redis and Client WebSocket.\033[0m")
        await redis_client.close()
        try:
            await websocket.close()
        except:
            pass

# Removed websocket_stt_streaming - replaced by LiveKit Agent

@session_router.get("/{meeting_id}/messages", response_model=List[MeetingChatMessageResponse])
def get_meeting_messages(
    meeting_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    # Ensure meeting exists
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # Security: check if user is in project
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    messages = db.query(MeetingChatMessage).filter(
        MeetingChatMessage.meeting_id == uuid.UUID(meeting_id)
    ).order_by(MeetingChatMessage.created_at.asc()).all()
    
    return [
        MeetingChatMessageResponse(
            id=m.id,
            meeting_id=m.meeting_id,
            user_id=m.user_id,
            user_name=m.user.full_name or m.user.email.split('@')[0],
            message=m.message,
            message_type=m.message_type.value,
            created_at=m.created_at
        ) for m in messages
    ]

@session_router.post("/{meeting_id}/messages", response_model=MeetingChatMessageResponse)
def post_meeting_message(
    meeting_id: str,
    message_in: MeetingChatMessageRequest,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    
    meeting = db.query(Meeting).filter(Meeting.id == uuid.UUID(meeting_id)).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    project_service._check_project_access(meeting.meeting_space.project_id, user.id)
    
    new_msg = MeetingChatMessage(
        meeting_id=uuid.UUID(meeting_id),
        user_id=user.id,
        message=message_in.message,
        message_type=MeetingChatType(message_in.message_type)
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    return MeetingChatMessageResponse(
        id=new_msg.id,
        meeting_id=new_msg.meeting_id,
        user_id=new_msg.user_id,
        user_name=user.full_name or user.email.split('@')[0],
        message=new_msg.message,
        message_type=new_msg.message_type.value,
        created_at=new_msg.created_at
    )
