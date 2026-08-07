import os
import sys
from dotenv import load_dotenv

# Load environment variables if running locally
load_dotenv()

from src.database import SessionLocal
from src.meeting.models import Meeting, MeetingStatus, MeetingProcessingStatus, PipelineStatus
from src.arq_client import enqueue_arq_job_sync

def main():
    db = SessionLocal()
    
    # Find all completed meetings
    meetings = db.query(Meeting).filter(Meeting.status == MeetingStatus.COMPLETED).all()
    
    count = 0
    for m in meetings:
        print(f"Reprocessing meeting: {m.id} (Name: {m.name})")
        
        # Upsert the processing status
        ps = db.query(MeetingProcessingStatus).filter_by(meeting_id=m.id).first()
        if not ps:
            ps = MeetingProcessingStatus(meeting_id=m.id)
            db.add(ps)
            
        # Reset the status back to pending so the UI updates
        ps.knowledge_status = PipelineStatus.PENDING
        ps.enrichment_status = PipelineStatus.PENDING
        db.commit()
        
        # Enqueue the job synchronously
        enqueue_arq_job_sync("process_meeting_knowledge", str(m.id))
        count += 1
        
    print(f"\nSuccessfully enqueued {count} completed meetings for reprocessing!")
    db.close()

if __name__ == "__main__":
    main()
