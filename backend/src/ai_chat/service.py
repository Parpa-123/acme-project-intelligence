import json
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
import logging

from .repository import ChatRepository
from .orchestrator import RAGOrchestrator
from .prompt_builder import PromptBuilder
from .llm import get_default_llm

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ChatRepository(db)
        self.orchestrator = RAGOrchestrator(db, llm=get_default_llm())
        self.llm = get_default_llm()

    async def stream_chat(self, query: str, project_id: Optional[int], user_id: int, session_id: str = None, is_global: bool = False) -> AsyncGenerator[str, None]:
        if not session_id:
            session = self.repository.create_session(project_id, user_id, title=query[:50])
            session_id = session.id
            
        # 1. Save user message
        self.repository.add_message(session_id, role="user", content=query)
        
        # 2. Fetch History
        all_messages = self.repository.get_messages(session_id)
        # Exclude the current query which is the last message
        history = [{"role": m.role, "content": m.content} for m in all_messages[:-1]]

        # Tell frontend we are starting
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': 'Analyzing query...'})}\n\n"
        
        try:
            # 3. Orchestrator gathers evidence
            yield f"data: {json.dumps({'type': 'status', 'content': 'Gathering evidence...'})}\n\n"
            evidence = await self.orchestrator.gather_evidence(query, project_id, history, is_global=is_global)
            
            yield f"data: {json.dumps({'type': 'status', 'content': 'Reading evidence and writing response...'})}\n\n"
            
            # 4. Build prompt
            final_prompt = PromptBuilder.build_prompt(query, evidence, history)
            
            from src.core.metrics import llm_latency_histogram
            
            # 5. Stream response
            full_response = ""
            with llm_latency_histogram.time():
                async for chunk_text in self.llm.stream(final_prompt):
                    full_response += chunk_text
                    # stream token
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk_text})}\n\n"
                
            # 6. Save assistant message to history
            self.repository.add_message(
                session_id, 
                role="assistant", 
                content=full_response, 
                metadata={"used_evidence": bool(evidence)}
            )
            
            # 7. Close stream
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error in chat stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': 'An internal error occurred while generating the response.'})}\n\n"
