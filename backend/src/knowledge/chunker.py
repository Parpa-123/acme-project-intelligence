from typing import List
from datetime import timedelta
from src.knowledge.events import ConversationEntry, KnowledgeChunkData

class ConversationChunker:
    # A rough heuristic: 1 word ~ 1.3 tokens. 500 tokens ~ 385 words.
    MAX_WORDS = 385
    MAX_PAUSE_SECONDS = 60

    def process(self, entries: List[ConversationEntry], meeting_id: str) -> List[KnowledgeChunkData]:
        if not entries:
            return []
            
        chunks = []
        
        current_chunk_entries = []
        current_word_count = 0
        current_chunk_index = 1
        
        for i, entry in enumerate(entries):
            # Check rules for breaking chunks
            if current_chunk_entries:
                prev_entry = current_chunk_entries[-1]
                time_delta = (entry.timestamp - prev_entry.timestamp).total_seconds()
                
                # Rule 1: Long pause
                break_due_to_pause = time_delta > self.MAX_PAUSE_SECONDS
                
                # Rule 2: Token limit exceeded
                break_due_to_size = current_word_count >= self.MAX_WORDS
                
                if break_due_to_pause or break_due_to_size:
                    chunks.append(self._build_chunk_data(meeting_id, current_chunk_index, current_chunk_entries))
                    current_chunk_index += 1
                    current_chunk_entries = []
                    current_word_count = 0
            
            current_chunk_entries.append(entry)
            current_word_count += len(entry.text.split())
            
        # Add the remaining entries
        if current_chunk_entries:
            chunks.append(self._build_chunk_data(meeting_id, current_chunk_index, current_chunk_entries))
            
        return chunks

    def _build_chunk_data(self, meeting_id: str, chunk_index: int, entries: List[ConversationEntry]) -> KnowledgeChunkData:
        start_ts = entries[0].timestamp
        end_ts = entries[-1].timestamp
        
        participant_ids = list(set([e.user_id for e in entries]))
        entry_count = len(entries)
        
        # Format text block
        text_lines = []
        for e in entries:
            text_lines.append(f"{e.speaker_name} ({e.modality.value}):\n{e.text}\n")
            
        full_text = "\n".join(text_lines).strip()
        
        return KnowledgeChunkData(
            chunk_index=chunk_index,
            meeting_id=meeting_id,
            start_timestamp=start_ts,
            end_timestamp=end_ts,
            text=full_text,
            participant_ids=participant_ids,
            entry_count=entry_count,
            embedding=None
        )
