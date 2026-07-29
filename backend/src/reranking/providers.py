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
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"
        
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

        # Prepare payload: pairs of [query, chunk_text]
        inputs = {"source_sentence": query, "sentences": [chunk.text for chunk in chunks]}
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    json={"inputs": inputs},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise RerankerProviderError(f"HuggingFace API returned {response.status_code}: {response.text}")
                    
                scores = response.json()
                
                if not isinstance(scores, list) or len(scores) != len(chunks):
                    # Sometimes HF API is loading the model and returns an error dictionary
                    if isinstance(scores, dict) and "error" in scores:
                        raise RerankerProviderError(f"Model is loading: {scores['error']}")
                    raise RerankerProviderError("Invalid response format from HuggingFace API")
                    
                # Map scores back to chunks
                for i, score in enumerate(scores):
                    chunks[i].rerank_score = float(score)
                    
                return chunks
                
        except httpx.RequestError as e:
            raise RerankerProviderError(f"HTTP Request failed: {str(e)}")
