from sqlalchemy.orm import Session
from .assembler import ContextAssembler
from .schemas import ContextPackage
from src.reranking.schemas import RerankedChunk
from typing import List
import logging

logger = logging.getLogger(__name__)

class ContextBuilderService:
    def __init__(self, db: Session):
        self.db = db
        self.assembler = ContextAssembler(db)

    def build_context(self, query: str, reranked_chunks: List[RerankedChunk], max_tokens: int = 6000) -> ContextPackage:
        """
        Takes reranked chunks and builds a cohesive context package for LLM consumption.
        """
        try:
            # Separate meeting and document chunks
            meeting_chunks = [c for c in reranked_chunks if getattr(c, 'source_type', 'meeting') == 'meeting']
            document_chunks = [c for c in reranked_chunks if getattr(c, 'source_type', 'meeting') == 'document']
            
            # 1. Expand Neighbors (fetching DB chunks)
            expanded_db_chunks = self.assembler.expand_neighbors(meeting_chunks)
            
            # 2. Deduplicate and Sort chronologically
            sorted_unique_chunks = self.assembler.deduplicate_and_sort(expanded_db_chunks)
            
            # 3. Assemble string and enforce token budget
            context_text, total_tokens, sources = self.assembler.build_context_string(
                sorted_unique_chunks, 
                meeting_chunks, 
                max_tokens=max_tokens
            )
            
            # 4. Append Document Chunks
            doc_context_blocks = []
            for doc in document_chunks:
                chunk_tokens = self.assembler.estimate_tokens(doc.text)
                if total_tokens + chunk_tokens > max_tokens:
                    break
                
                filename = doc.metadata.get("filename", "Unknown Document")
                doc_context_blocks.append(f"\n\n--- [Document Source: {filename}] ---\n{doc.text}\n")
                total_tokens += chunk_tokens
                
                sources.append({
                    "chunk_id": doc.chunk_id,
                    "document_id": getattr(doc, 'document_id', None),
                    "score": doc.score,
                    "rerank_score": getattr(doc, 'rerank_score', 0.0)
                })
                
            if doc_context_blocks:
                context_text += "".join(doc_context_blocks)
            
            return ContextPackage(
                context_text=context_text,
                total_tokens=total_tokens,
                sources=sources,
                metadata={"query": query, "max_tokens_budget": max_tokens}
            )
            
        except Exception as e:
            logger.error(f"Error building context: {e}")
            # Fallback: Just join the original chunks without neighbor expansion
            context_text = "\n\n".join([c.text for c in reranked_chunks])
            return ContextPackage(
                context_text=context_text,
                total_tokens=self.assembler.estimate_tokens(context_text),
                sources=[],
                metadata={"query": query, "error": str(e), "fallback": True}
            )
