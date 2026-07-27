from sqlalchemy.orm import Session
from src.knowledge.repository import KnowledgeRepository
from src.knowledge.chunker import ConversationChunker
from src.knowledge.embedding import EmbeddingService

class KnowledgeProcessor:
    def __init__(self, db: Session):
        self.repository = KnowledgeRepository(db)
        self.chunker = ConversationChunker()
        self.embedder = EmbeddingService()
        
    def run(self, meeting_id: str):
        print(f"Starting Knowledge Processing for meeting {meeting_id}")
        
        # 1. Load the unified timeline
        entries = self.repository.load_conversation(meeting_id)
        if not entries:
            print(f"No conversation data found for meeting {meeting_id}")
            return
            
        print(f"Loaded {len(entries)} conversation entries.")
        
        # 2. Chunk the timeline
        chunks = self.chunker.process(entries, meeting_id)
        print(f"Generated {len(chunks)} semantic chunks.")
        
        # 3. Generate Embeddings
        for chunk in chunks:
            chunk.embedding = self.embedder.generate_embedding(chunk.text)
            
        # 4. Save to Repository
        self.repository.save_knowledge_chunks(meeting_id, chunks)
        print(f"Successfully saved chunks for meeting {meeting_id}")
