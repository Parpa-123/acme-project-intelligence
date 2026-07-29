from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class ActionItem(BaseModel):
    knowledge_chunk_id: Optional[uuid.UUID] = Field(description="The ID of the chunk this action originated from. DO NOT HALLUCINATE.")
    assignee: Optional[str] = Field(description="The person responsible for the action. Null if not specified.")
    task: str = Field(description="The action item to be completed.")
    due_date: Optional[str] = Field(description="The due date if specified. Null if not specified.")

class KeyDecision(BaseModel):
    knowledge_chunk_id: Optional[uuid.UUID] = Field(description="The ID of the chunk this decision originated from.")
    decision: str = Field(description="A key decision made during the meeting.")
    confidence: Optional[str] = Field(description="Confidence level (e.g., 'high', 'medium', 'low') based on how explicitly it was agreed upon.")

class Requirement(BaseModel):
    knowledge_chunk_id: Optional[uuid.UUID] = Field(description="The ID of the chunk this requirement originated from.")
    requirement: str = Field(description="A functional or technical requirement discussed.")
    priority: Optional[str] = Field(description="Priority if mentioned (e.g., 'high', 'low'). Null otherwise.")

class Concern(BaseModel):
    knowledge_chunk_id: Optional[uuid.UUID] = Field(description="The ID of the chunk this concern originated from.")
    concern: str = Field(description="A blocker, risk, or concern mentioned.")
    severity: Optional[str] = Field(description="Severity if mentioned. Null otherwise.")

class Topic(BaseModel):
    knowledge_chunk_id: Optional[uuid.UUID] = Field(description="The ID of the chunk this topic originated from.")
    topic: str = Field(description="A major discussion topic.")

class EnrichmentResult(BaseModel):
    summary: str = Field(description="A concise meeting summary. This does not need a chunk ID as it spans the whole meeting.")
    action_items: List[ActionItem] = Field(default_factory=list, description="A list of action items identified in the meeting.")
    key_decisions: List[KeyDecision] = Field(default_factory=list, description="A list of key decisions made.")
    requirements: List[Requirement] = Field(default_factory=list, description="A list of requirements discussed.")
    concerns: List[Concern] = Field(default_factory=list, description="A list of concerns or risks raised.")
    topics: List[Topic] = Field(default_factory=list, description="A list of major topics discussed.")
