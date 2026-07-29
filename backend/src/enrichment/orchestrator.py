from sqlalchemy.orm import Session
from src.enrichment.repository import EnrichmentRepository
from src.enrichment.llm_service import LLMService
from src.enrichment.prompt_builder import PromptBuilder
from src.enrichment.parser import OutputParser

class EnrichmentOrchestrator:
    def __init__(self, db: Session):
        self.repository = EnrichmentRepository(db)
        self.llm = LLMService()
        self.prompt_builder = PromptBuilder()
        self.parser = OutputParser()
        
    def run(self, meeting_id: str):
        chunks = self.repository.load_meeting_chunks(meeting_id)
        if not chunks:
            print(f"No chunks found for meeting {meeting_id}. Skipping enrichment.")
            return
            
        system_prompt = self.prompt_builder.build_system_prompt()
        user_prompt = self.prompt_builder.build_user_prompt(chunks)
        
        print("Calling LLM for Meeting Enrichment...")
        raw_response = self.llm.generate_insights(system_prompt, user_prompt)
        
        enrichment_result = self.parser.parse_llm_response(raw_response)
        
        self.repository.save_enrichment(meeting_id, enrichment_result)
        print(f"Successfully generated and saved insights for meeting {meeting_id}.")
