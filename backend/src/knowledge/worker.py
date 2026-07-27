from src.database import SessionLocal
from src import models
from src.projects import models as project_models
from src.meeting import models as meeting_models
from src.knowledge import models as knowledge_models
from src.knowledge.processor import KnowledgeProcessor

async def process_meeting_knowledge(ctx, meeting_id: str):
    """
    ARQ Background Task entrypoint.
    Called when a meeting session officially ends.
    """
    db = SessionLocal()
    try:
        processor = KnowledgeProcessor(db)
        processor.run(meeting_id)
        return {"status": "success", "meeting_id": meeting_id}
    except Exception as e:
        print(f"Failed to process knowledge for {meeting_id}: {e}")
        raise e
    finally:
        db.close()
