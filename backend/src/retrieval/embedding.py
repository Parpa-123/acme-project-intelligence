from typing import List
from src.knowledge.embedding import EmbeddingService as BaseEmbeddingService

class RetrievalEmbeddingService:
    def __init__(self):
        self.base_embedder = BaseEmbeddingService()
        
    def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generates an embedding for the user's search query, ensuring 
        it lives in the exact same vector space as the indexed knowledge.
        """
        return self.base_embedder.generate_embedding(query)
