from src.database import SessionLocal
from src import models
from src.meeting.models import MeetingProcessingStatus, PipelineStatus
from src.knowledge.processor import KnowledgeProcessor
import traceback

async def process_meeting_knowledge(ctx, meeting_id: str):
    """
    ARQ Background Task entrypoint.
    Called when a meeting session officially ends.
    """
    db = SessionLocal()
    try:
        # Update status to processing
        status = db.query(MeetingProcessingStatus).filter_by(meeting_id=meeting_id).first()
        if status:
            status.knowledge_status = PipelineStatus.PROCESSING
            db.commit()
            
        processor = KnowledgeProcessor(db)
        processor.run(meeting_id)
        
        # On success, update status and enqueue the next step
        if status:
            status.knowledge_status = PipelineStatus.COMPLETED
            status.enrichment_status = PipelineStatus.PROCESSING
            status.error_message = None
            db.commit()
            
        redis = ctx.get("redis")
        if redis:
            await redis.enqueue_job("enrich_meeting", meeting_id)
            print(f"Successfully enqueued enrich_meeting for {meeting_id}")
            
        return {"status": "success", "meeting_id": meeting_id}
        
    except Exception as e:
        status = db.query(MeetingProcessingStatus).filter_by(meeting_id=meeting_id).first()
        if status:
            status.knowledge_status = PipelineStatus.FAILED
            status.error_message = traceback.format_exc()
            db.commit()
        print(f"Failed to process knowledge for {meeting_id}: {e}")
        raise e
    finally:
        db.close()
