import asyncio
import json
import os
from datetime import datetime, timezone
import redis.asyncio as aioredis
from sqlalchemy.orm import Session
from src.database import SessionLocal
from src.meeting.models import Meeting, MeetingSpace, MeetingTranscript, MeetingParticipant

async def consume_meeting_events():
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    
    stream_name = "meeting.events"
    group_name = "transcript_workers"
    consumer_name = "worker-1"
    
    # Try to create the consumer group, ignore if it already exists
    try:
        await redis_client.xgroup_create(stream_name, group_name, mkstream=True, id="0")
    except aioredis.ResponseError as e:
        if "BUSYGROUP Consumer Group name already exists" not in str(e):
            print(f"Redis group creation error: {e}")

    print("Started Redis Consumer for Meeting Transcripts...")
    
    try:
        while True:
            # Read from the group, getting unacknowledged messages
            streams = await redis_client.xreadgroup(
                group_name,
                consumer_name,
                {stream_name: ">"},
                count=10,
                block=2000
            )
            
            if not streams:
                continue
                
            for stream, messages in streams:
                for message_id, message_data in messages:
                    try:
                        raw_event = message_data[b"event"] if b"event" in message_data else message_data.get("event")
                        if isinstance(raw_event, bytes):
                            raw_event = raw_event.decode("utf-8")
                            
                        event_data = json.loads(raw_event)
                        
                        # We only care about transcripts
                        if event_data.get("type") == "USER_TRANSCRIPT":
                            room_name = event_data.get("meeting_id")
                            payload = event_data.get("payload", {})
                            text = payload.get("text")
                            is_final = payload.get("is_final", True)
                            
                            if room_name and text:
                                # Save to DB
                                db: Session = SessionLocal()
                                try:
                                    # 1. Find the meeting space by room_name
                                    space = db.query(MeetingSpace).filter(MeetingSpace.livekit_room_name == room_name).first()
                                    if space:
                                        # 2. Find the most recent meeting for this space
                                        meeting = db.query(Meeting).filter(Meeting.meeting_space_id == space.id).order_by(Meeting.started_at.desc()).first()
                                        if meeting:
                                            # 3. Resolve a user_id (fallback to creator if not found)
                                            user_id = payload.get("user_id")
                                            if not user_id:
                                                participant = db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == meeting.id).first()
                                                user_id = participant.user_id if participant else space.creator_id
                                            
                                            # Convert user_id to int if necessary
                                            try:
                                                user_id = int(user_id)
                                            except (ValueError, TypeError):
                                                pass

                                            # 4. Insert the transcript
                                            transcript = MeetingTranscript(
                                                meeting_id=meeting.id,
                                                user_id=user_id,
                                                text=text,
                                                is_final=is_final
                                            )
                                            db.add(transcript)
                                            db.commit()
                                            print(f"Saved transcript for meeting {meeting.id} by user {user_id}: {text}")
                                finally:
                                    db.close()
                                    
                    except Exception as ex:
                        print(f"Error processing message {message_id}: {ex}")
                        
                    # Always acknowledge so we don't process it again
                    await redis_client.xack(stream_name, group_name, message_id)
                    
    except asyncio.CancelledError:
        print("Redis Consumer shutting down...")
    except Exception as e:
        print(f"Fatal Redis Consumer Error: {e}")
    finally:
        await redis_client.close()
