from src.database import SessionLocal
from src.enrichment.orchestrator import EnrichmentOrchestrator
from src.meeting.models import MeetingProcessingStatus, PipelineStatus
from src.enrichment import models
import traceback

async def enrich_meeting(ctx, meeting_id: str):
    """
    ARQ Background Task that generates summaries and action items for a completed meeting.
    """
    db = SessionLocal()
    try:
        status = db.query(MeetingProcessingStatus).filter_by(meeting_id=meeting_id).first()
        if status:
            status.enrichment_status = PipelineStatus.PROCESSING
            db.commit()
            
        orchestrator = EnrichmentOrchestrator(db)
        orchestrator.run(meeting_id)
        
        if status:
            status.enrichment_status = PipelineStatus.COMPLETED
            status.error_message = None
            db.commit()
            
    except Exception as e:
        status = db.query(MeetingProcessingStatus).filter_by(meeting_id=meeting_id).first()
        if status:
            status.enrichment_status = PipelineStatus.FAILED
            status.error_message = traceback.format_exc()
            db.commit()
        print(f"Error in enrich_meeting worker for meeting {meeting_id}: {e}")
        raise
    finally:
        db.close()
