from sqlalchemy.orm import Session
from src.knowledge.models import KnowledgeChunk
from src.enrichment.models import (
    MeetingSummary, MeetingDecision, MeetingActionItem, 
    MeetingRequirement, MeetingConcern, MeetingTopic
)
from src.enrichment.events import EnrichmentResult

class EnrichmentRepository:
    def __init__(self, db: Session):
        self.db = db
        
    def load_meeting_chunks(self, meeting_id: str) -> list[KnowledgeChunk]:
        """Loads all chunks for a meeting, ordered sequentially."""
        return self.db.query(KnowledgeChunk)\
            .filter(KnowledgeChunk.meeting_id == meeting_id)\
            .order_by(KnowledgeChunk.chunk_index.asc())\
            .all()
            
    def save_enrichment(self, meeting_id: str, result: EnrichmentResult):
        """Saves the synthesized insights to the database, enforcing idempotency."""
        
        # 1. Clear existing enrichments for this meeting
        self.db.query(MeetingSummary).filter_by(meeting_id=meeting_id).delete()
        self.db.query(MeetingDecision).filter_by(meeting_id=meeting_id).delete()
        self.db.query(MeetingActionItem).filter_by(meeting_id=meeting_id).delete()
        self.db.query(MeetingRequirement).filter_by(meeting_id=meeting_id).delete()
        self.db.query(MeetingConcern).filter_by(meeting_id=meeting_id).delete()
        self.db.query(MeetingTopic).filter_by(meeting_id=meeting_id).delete()
        
        # 2. Insert new Summary
        summary_record = MeetingSummary(
            meeting_id=meeting_id,
            summary=result.summary,
            model="meta-llama/Llama-3.2-3B-Instruct"
        )
        self.db.add(summary_record)
        
        # 3. Insert Decisions
        for d in result.key_decisions:
            self.db.add(MeetingDecision(
                meeting_id=meeting_id,
                knowledge_chunk_id=d.knowledge_chunk_id,
                decision=d.decision,
                confidence=d.confidence
            ))
            
        # 4. Insert Action Items
        for a in result.action_items:
            self.db.add(MeetingActionItem(
                meeting_id=meeting_id,
                knowledge_chunk_id=a.knowledge_chunk_id,
                assignee=a.assignee,
                description=a.task,
                due_date=a.due_date
            ))
            
        # 5. Insert Requirements
        for r in result.requirements:
            self.db.add(MeetingRequirement(
                meeting_id=meeting_id,
                knowledge_chunk_id=r.knowledge_chunk_id,
                requirement=r.requirement,
                priority=r.priority
            ))
            
        # 6. Insert Concerns
        for c in result.concerns:
            self.db.add(MeetingConcern(
                meeting_id=meeting_id,
                knowledge_chunk_id=c.knowledge_chunk_id,
                concern=c.concern,
                severity=c.severity
            ))
            
        # 7. Insert Topics
        for t in result.topics:
            self.db.add(MeetingTopic(
                meeting_id=meeting_id,
                knowledge_chunk_id=t.knowledge_chunk_id,
                topic=t.topic
            ))
            
        self.db.commit()
