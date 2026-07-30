from abc import ABC, abstractmethod
from typing import List, Dict, Any
import httpx
import os
from .schemas import RerankedChunk
from .exceptions import RerankerProviderError

class BaseReranker(ABC):
    @abstractmethod
    async def rerank(self, query: str, chunks: List[RerankedChunk]) -> List[RerankedChunk]:
        """Reranks a list of chunks against a query."""
        pass

class HuggingFaceReranker(BaseReranker):
    def __init__(self, model: str = "BAAI/bge-reranker-v2-m3", api_key: str = None):
        self.model = model
        self.api_key = api_key or os.getenv("HF_API_KEY")
        self.api_url = os.environ.get("RERANKER_URL", "http://reranker:8000/rerank")
        
    async def rerank(self, query: str, chunks: List[RerankedChunk]) -> List[RerankedChunk]:
        if not chunks:
            return []
            
        # If no API key is provided, we'll implement a graceful fallback to just return the chunks
        # with their original retrieval score as the rerank score, rather than completely failing.
        # This is useful for local development without an API key.
        if not self.api_key:
            for chunk in chunks:
                chunk.rerank_score = chunk.score
            return chunks

        # TEI format
        payload = {"query": query, "texts": [chunk.text for chunk in chunks]}
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise RerankerProviderError(f"Reranker API returned {response.status_code}: {response.text}")
                    
                results = response.json()
                
                if not isinstance(results, list):
                    raise RerankerProviderError("Invalid response format from Reranker API")
                    
                # Map scores back to chunks (TEI returns list of dicts with 'index' and 'score')
                for item in results:
                    idx = item.get("index")
                    if idx is not None and 0 <= idx < len(chunks):
                        chunks[idx].rerank_score = float(item.get("score", 0.0))
                    
                return chunks
                
        except httpx.RequestError as e:
            raise RerankerProviderError(f"HTTP Request failed: {str(e)}")
