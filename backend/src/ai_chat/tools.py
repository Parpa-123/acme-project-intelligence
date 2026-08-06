import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.retrieval.service import RetrievalService
from src.reranking.service import RerankingService
from src.reranking.schemas import RerankedChunk
from src.context_builder.service import ContextBuilderService
from src.enrichment.models import MeetingDecision, MeetingRequirement, MeetingActionItem

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
    },
    {
        "type": "function",
        "function": {
            "name": "save_decision",
            "description": "Autonomously saves a final, agreed-upon architectural or project decision to the project's permanent memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "decision": {
                        "type": "string",
                        "description": "The decision text."
                    },
                    "confidence": {
                        "type": "string",
                        "description": "Confidence level (e.g., 'high', 'medium', 'low')."
                    }
                },
                "required": ["decision"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_requirement",
            "description": "Autonomously saves a new project requirement to the permanent memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "requirement": {
                        "type": "string",
                        "description": "The requirement text."
                    },
                    "priority": {
                        "type": "string",
                        "description": "Priority (e.g., 'high', 'medium', 'low')."
                    }
                },
                "required": ["requirement"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_action_item",
            "description": "Autonomously saves a new action item or task to the permanent memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "What needs to be done."
                    },
                    "assignee": {
                        "type": "string",
                        "description": "Who will do it (if known)."
                    },
                    "due_date": {
                        "type": "string",
                        "description": "When it is due (if known)."
                    }
                },
                "required": ["description"]
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
                document_id=getattr(c, 'document_id', None),
                source_type=getattr(c, 'source_type', 'meeting'),
                text=c.text,
                score=c.score,
                rerank_score=0.0,
                metadata=c.metadata
            ) for c in candidates
        ]
        top_reranked = await reranker.rerank(query, reranked_input, top_k=10)
        
        context_service = ContextBuilderService(db)
        package = context_service.build_context(query, top_reranked)
        return package.context_text
        
    elif tool_name == "save_decision":
        decision = args_dict.get("decision")
        confidence = args_dict.get("confidence")
        new_decision = MeetingDecision(project_id=project_id, decision=decision, confidence=confidence)
        db.add(new_decision)
        db.commit()
        return f"Successfully saved decision to project memory: {decision}"
        
    elif tool_name == "save_requirement":
        requirement = args_dict.get("requirement")
        priority = args_dict.get("priority")
        new_req = MeetingRequirement(project_id=project_id, requirement=requirement, priority=priority)
        db.add(new_req)
        db.commit()
        return f"Successfully saved requirement to project memory: {requirement}"
        
    elif tool_name == "save_action_item":
        description = args_dict.get("description")
        assignee = args_dict.get("assignee")
        due_date = args_dict.get("due_date")
        new_task = MeetingActionItem(project_id=project_id, description=description, assignee=assignee, due_date=due_date)
        db.add(new_task)
        db.commit()
        return f"Successfully saved action item to project memory: {description}"
    
    return f"Error: Tool {tool_name} not found or implemented."
