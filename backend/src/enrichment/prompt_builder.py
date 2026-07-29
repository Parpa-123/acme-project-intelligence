from src.knowledge.models import KnowledgeChunk
from typing import List

class PromptBuilder:
    def build_system_prompt(self) -> str:
        return (
            "You are an expert executive assistant. You will be provided with a chronological "
            "transcript of a meeting that has been grouped into logical chunks. Each chunk is prefixed with its ID.\n"
            "Your task is to analyze the conversation and extract a summary, action items, key decisions, "
            "requirements, concerns, and topics.\n\n"
            "CRITICAL TRACEABILITY REQUIREMENT:\n"
            "For every single action item, decision, requirement, concern, and topic you extract, you MUST include "
            "the `knowledge_chunk_id` that provides the evidence for it. Copy the exact UUID from the chunk prefix.\n\n"
            "You must respond ONLY with valid JSON conforming strictly to the requested schema. "
            "Do not include markdown blocks or extra text.\n"
            "Schema:\n"
            '{\n'
            '  "summary": "1-2 paragraphs",\n'
            '  "action_items": [{"knowledge_chunk_id": "UUID", "assignee": "Name", "task": "Task", "due_date": "Date"}],\n'
            '  "key_decisions": [{"knowledge_chunk_id": "UUID", "decision": "Decision", "confidence": "high/medium/low"}],\n'
            '  "requirements": [{"knowledge_chunk_id": "UUID", "requirement": "Req", "priority": "high/medium/low"}],\n'
            '  "concerns": [{"knowledge_chunk_id": "UUID", "concern": "Risk", "severity": "high/medium/low"}],\n'
            '  "topics": [{"knowledge_chunk_id": "UUID", "topic": "Topic Name"}]\n'
            '}'
        )
        
    def build_user_prompt(self, chunks: List[KnowledgeChunk]) -> str:
        full_transcript = []
        for chunk in chunks:
            full_transcript.append(f"--- Chunk ID: {chunk.id} ---")
            full_transcript.append(chunk.text)
            
        compiled_text = "\n\n".join(full_transcript)
        
        return (
            "Please analyze the following meeting transcript and extract the intelligence in JSON format.\n\n"
            f"{compiled_text}"
        )
