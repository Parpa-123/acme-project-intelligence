import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.retrieval.service import RetrievalService
from src.reranking.service import RerankingService
from src.reranking.schemas import RerankedChunk
from src.context_builder.service import ContextBuilderService

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "retrieve_chunks",
            "description": "Searches the project's knowledge base for relevant meetings, conversations, decisions, and technical documentation. Use this to gather factual evidence.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A highly specific natural language query or keyword phrase to search for."
                    },
                    "meeting_id": {
                        "type": "string",
                        "description": "Optional specific meeting ID to restrict the search to. Provide only if known."
                    }
                },
                "required": ["query"]
            }
        }
    }
]

async def execute_tool(tool_name: str, arguments: str, db: Session, project_id: int) -> str:
    """Executes a requested tool and returns the evidence as a string."""
    try:
        args_dict = json.loads(arguments)
    except Exception as e:
        return f"Error parsing arguments: {str(e)}"
        
    if tool_name == "retrieve_chunks":
        query = args_dict.get("query")
        meeting_id = args_dict.get("meeting_id")
        
        # 1. Retrieve
        retrieval_service = RetrievalService(db)
        candidates = retrieval_service.retrieve(query=query, project_id=project_id, meeting_id=meeting_id, limit=30)
        
        if not candidates:
            return "No relevant chunks found for this query."
            
        # 2. Rerank
        reranker = RerankingService()
        reranked_input = [
            RerankedChunk(
                chunk_id=c.chunk_id,
                meeting_id=c.meeting_id,
                text=c.text,
                score=c.score,
                rerank_score=0.0,
                metadata=c.metadata
            ) for c in candidates
        ]
        top_reranked = await reranker.rerank(query, reranked_input, top_k=10)
        
        # 3. Build Context
        context_service = ContextBuilderService(db)
        package = context_service.build_context(query, top_reranked)
        return package.context_text
    
    return f"Error: Tool {tool_name} not found or implemented."
