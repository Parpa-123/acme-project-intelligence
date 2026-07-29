from typing import List
from .schemas import RerankedChunk
from .providers import BaseReranker, HuggingFaceReranker
import logging

logger = logging.getLogger(__name__)

class RerankingService:
    def __init__(self, provider: BaseReranker = None):
        self.provider = provider or HuggingFaceReranker()

    async def rerank(self, query: str, chunks: List[RerankedChunk], top_k: int = 10) -> List[RerankedChunk]:
        """
        Reranks the retrieved chunks using the configured provider and returns the top_k.
        """
        if not chunks:
            return []

        try:
            # 1. Call provider
            reranked = await self.provider.rerank(query, chunks)
            
            # 2. Sort descending by rerank_score
            reranked.sort(key=lambda x: x.rerank_score, reverse=True)
            
            # 3. Truncate to top_k
            return reranked[:top_k]
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}. Falling back to original retrieval scores.")
            # Fallback: just use original scores if provider fails
            for chunk in chunks:
                if getattr(chunk, 'rerank_score', None) is None:
                    chunk.rerank_score = chunk.score
            chunks.sort(key=lambda x: x.rerank_score, reverse=True)
            return chunks[:top_k]
