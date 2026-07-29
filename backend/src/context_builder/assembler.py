from sqlalchemy.orm import Session
from src.knowledge.models import KnowledgeChunk as DBKnowledgeChunk
from src.reranking.schemas import RerankedChunk
from .schemas import ContextSource
from typing import List, Dict, Set, Tuple

class ContextAssembler:
    def __init__(self, db: Session):
        self.db = db

    def expand_neighbors(self, chunks: List[RerankedChunk]) -> List[DBKnowledgeChunk]:
        """
        Fetches neighboring chunks for highly relevant ones to provide context.
        """
        if not chunks:
            return []
            
        target_ids = set()
        for chunk in chunks:
            target_ids.add(chunk.chunk_id)
            
        # First, fetch all the DB chunks to get their sequence numbers
        db_chunks = self.db.query(DBKnowledgeChunk).filter(DBKnowledgeChunk.id.in_(target_ids)).all()
        
        # Build query for neighbors (seq-1, seq, seq+1) for each meeting
        expanded_chunks = []
        seen_ids = set()
        
        for db_chunk in db_chunks:
            # We want seq-1, seq, seq+1 from the same meeting
            neighbors = self.db.query(DBKnowledgeChunk).filter(
                DBKnowledgeChunk.meeting_id == db_chunk.meeting_id,
                DBKnowledgeChunk.sequence_number >= db_chunk.sequence_number - 1,
                DBKnowledgeChunk.sequence_number <= db_chunk.sequence_number + 1
            ).all()
            
            for n in neighbors:
                if n.id not in seen_ids:
                    seen_ids.add(n.id)
                    expanded_chunks.append(n)
                    
        return expanded_chunks

    def deduplicate_and_sort(self, chunks: List[DBKnowledgeChunk]) -> List[DBKnowledgeChunk]:
        """
        Sorts chunks chronologically and removes exact duplicates.
        """
        # Sort by meeting_id, then sequence_number
        chunks.sort(key=lambda c: (str(c.meeting_id), c.sequence_number))
        
        # Remove exact duplicates based on chunk ID
        # (Though seen_ids in expand_neighbors already helps, we do this for safety)
        unique_chunks = []
        seen = set()
        for c in chunks:
            if c.id not in seen:
                seen.add(c.id)
                unique_chunks.append(c)
                
        return unique_chunks

    def estimate_tokens(self, text: str) -> int:
        """
        Rough heuristic: ~4 characters per token.
        Can be upgraded to tiktoken later.
        """
        return len(text) // 4

    def build_context_string(self, chunks: List[DBKnowledgeChunk], original_reranked: List[RerankedChunk], max_tokens: int = 6000) -> Tuple[str, int, List[ContextSource]]:
        """
        Assembles the final context string, enforcing the token budget.
        """
        # Map original reranked for quick lookup
        rerank_map = {c.chunk_id: c for c in original_reranked}
        
        context_blocks = []
        current_meeting = None
        total_tokens = 0
        sources = []
        
        current_block = ""
        
        for chunk in chunks:
            # Format chunk
            text_to_add = ""
            if current_meeting != chunk.meeting_id:
                if current_block:
                    context_blocks.append(current_block)
                # We could ideally fetch meeting date/name here, 
                # but we'll keep it simple: just note the meeting break.
                text_to_add += f"\n\n--- [Meeting Session: {chunk.meeting_id}] ---\n"
                current_meeting = chunk.meeting_id
            
            text_to_add += f"{chunk.text}\n"
            
            chunk_tokens = self.estimate_tokens(text_to_add)
            
            if total_tokens + chunk_tokens > max_tokens:
                break
                
            current_block += text_to_add
            total_tokens += chunk_tokens
            
            # Add to sources if it was an original hit
            orig = rerank_map.get(str(chunk.id))
            score = orig.score if orig else 0.0
            rerank_score = orig.rerank_score if orig else 0.0
            
            sources.append(
                ContextSource(
                    chunk_id=str(chunk.id),
                    meeting_id=str(chunk.meeting_id),
                    sequence_number=chunk.sequence_number,
                    score=score,
                    rerank_score=rerank_score
                )
            )
            
        if current_block:
            context_blocks.append(current_block)
            
        final_text = "".join(context_blocks).strip()
        
        return final_text, total_tokens, sources
