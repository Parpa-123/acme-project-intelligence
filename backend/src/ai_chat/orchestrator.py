import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .llm import LLMProvider, get_default_llm
from .tools import TOOLS_SCHEMA, execute_tool

logger = logging.getLogger(__name__)

class RAGOrchestrator:
    def __init__(self, db: Session, llm: Optional[LLMProvider] = None):
        self.db = db
        self.llm = llm or get_default_llm()

    async def gather_evidence(self, query: str, project_id: int, chat_history: List[Dict[str, str]] = None) -> str:
        """
        The Agent Loop:
        1. Analyzes the user's question.
        2. Decides which retrieval tool(s) are needed.
        3. Gathers evidence.
        4. Stops when sufficient evidence exists.
        5. Returns compiled evidence.
        """
        messages = []
        if chat_history:
            messages.extend(chat_history)
            
        messages.append({
            "role": "system",
            "content": "You are a research orchestrator. Your job is to use available tools to gather evidence to answer the user's question. You must call tools until you have enough information, then stop."
        })
        messages.append({"role": "user", "content": query})

        max_iterations = 3
        evidence_gathered = []

        for i in range(max_iterations):
            logger.info(f"Orchestrator iteration {i+1}")
            try:
                response_msg = await self.llm.generate(messages, tools=TOOLS_SCHEMA)
            except Exception as e:
                logger.error(f"LLM generation failed: {e}")
                break

            messages.append(response_msg)

            if "tool_calls" in response_msg and response_msg["tool_calls"]:
                for tool_call in response_msg["tool_calls"]:
                    tool_name = tool_call["function"]["name"]
                    tool_args = tool_call["function"]["arguments"]
                    
                    logger.info(f"Executing tool: {tool_name}")
                    evidence = await execute_tool(tool_name, tool_args, self.db, project_id)
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": tool_name,
                        "content": evidence
                    })
                    evidence_gathered.append(f"Source Tool: {tool_name}\nEvidence:\n{evidence}")
            else:
                # No more tool calls, the LLM thinks it has enough info.
                break

        if not evidence_gathered:
            return "No evidence could be gathered for this query. Inform the user you couldn't find anything."
            
        # Compile all evidence into a single structured string block
        compiled_evidence = "\n\n=== EVIDENCE BLOCK ===\n\n".join(evidence_gathered)
        return compiled_evidence
