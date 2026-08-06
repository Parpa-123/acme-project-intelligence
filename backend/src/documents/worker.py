import os
import tempfile
import structlog
from typing import Dict, Any

from src.database import SessionLocal
from src.documents.models import ProjectDocument

# Boto3 for MinIO / S3
import boto3

# LlamaIndex & Pinecone
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.core.embeddings import BaseEmbedding
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone
from typing import List

from src.knowledge.embedding import EmbeddingService

class APIBasedEmbedding(BaseEmbedding):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._embedder = EmbeddingService()
        
    def _get_query_embedding(self, query: str) -> List[float]:
        return self._embedder.generate_embedding(query)
        
    def _get_text_embedding(self, text: str) -> List[float]:
        return self._embedder.generate_embedding(text)
        
    def _get_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        # For simplicity, do it sequentially. Could be batched.
        return [self._embedder.generate_embedding(text) for text in texts]
        
    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)
        
    async def _aget_text_embedding(self, text: str) -> List[float]:
        return self._get_text_embedding(text)

logger = structlog.get_logger("worker.documents")

async def process_document_pipeline(ctx: Dict[str, Any], document_id: str):
    """
    Background task to download a document from S3, parse it, and upsert vectors to Pinecone.
    """
    logger.info("Starting document processing pipeline", document_id=document_id)
    
    db = SessionLocal()
    try:
        # 1. Fetch document metadata
        document = db.query(ProjectDocument).filter(ProjectDocument.id == document_id).first()
        if not document:
            logger.error("Document not found in DB", document_id=document_id)
            return
            
        document.status = "processing"
        db.commit()

        # 2. Setup S3 client
        s3_client = boto3.client(
            's3',
            endpoint_url=os.environ.get("AWS_ENDPOINT_URL_S3", os.environ.get("MINIO_URL", "http://minio:9000")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin123"),
            region_name=os.environ.get("AWS_REGION", "us-east-1")
        )
        bucket_name = os.environ.get("S3_BUCKET_NAME", "project-documents")

        # 3. Setup Pinecone and LlamaIndex
        # Use our lightweight API-based embedder to avoid downloading PyTorch/sentence-transformers
        Settings.embed_model = APIBasedEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        pinecone_api_key = os.environ.get("PINECONE_API_KEY")
        pinecone_index_name = os.environ.get("PINECONE_INDEX_NAME")
        
        if not pinecone_api_key or not pinecone_index_name:
            raise ValueError("Pinecone configuration is missing.")
            
        pc = Pinecone(api_key=pinecone_api_key)
        pinecone_index = pc.Index(pinecone_index_name)
        vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        # 4. Download and process in a secure TemporaryDirectory
        with tempfile.TemporaryDirectory() as temp_dir:
            local_file_path = os.path.join(temp_dir, document.filename)
            
            logger.info("Downloading file from S3", s3_key=document.s3_key)
            s3_client.download_file(
                Bucket=bucket_name, 
                Key=document.s3_key, 
                Filename=local_file_path
            )
            
            logger.info("Parsing document via LlamaIndex")
            # Parse document
            documents = SimpleDirectoryReader(input_files=[local_file_path]).load_data()
            
            # Inject metadata for multi-tenant filtering
            for doc in documents:
                doc.metadata = {
                    "project_id": str(document.project_id), 
                    "document_id": str(document.id),
                    "filename": document.filename
                }
                
            logger.info("Generating embeddings and upserting to Pinecone")
            VectorStoreIndex.from_documents(documents, storage_context=storage_context)
            
        # 5. Success cleanup
        document.status = "ready"
        db.commit()
        logger.info("Document processing complete", document_id=document_id)

    except Exception as e:
        logger.error("Document pipeline failed", exc_info=True, document_id=document_id)
        if 'document' in locals() and document:
            document.status = "failed"
            db.commit()
        raise e
    finally:
        db.close()

async def delete_document_pipeline(ctx: Dict[str, Any], document_id: str):
    """
    Background task to delete a document from Postgres, S3, and Pinecone.
    """
    logger.info("Starting document deletion pipeline", document_id=document_id)
    db = SessionLocal()
    try:
        document = db.query(ProjectDocument).filter(ProjectDocument.id == document_id).first()
        if not document:
            logger.warning("Document not found in DB during deletion", document_id=document_id)
            return

        # 1. Delete from S3
        s3_client = boto3.client(
            's3',
            endpoint_url=os.environ.get("AWS_ENDPOINT_URL_S3", os.environ.get("MINIO_URL", "http://minio:9000")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin123"),
            region_name=os.environ.get("AWS_REGION", "us-east-1")
        )
        bucket_name = os.environ.get("S3_BUCKET_NAME", "project-documents")
        
        try:
            logger.info("Deleting file from S3", s3_key=document.s3_key)
            s3_client.delete_object(Bucket=bucket_name, Key=document.s3_key)
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")

        # 2. Delete from Pinecone
        pinecone_api_key = os.environ.get("PINECONE_API_KEY")
        pinecone_index_name = os.environ.get("PINECONE_INDEX_NAME")
        
        if pinecone_api_key and pinecone_index_name:
            try:
                pc = Pinecone(api_key=pinecone_api_key)
                pinecone_index = pc.Index(pinecone_index_name)
                logger.info("Deleting vectors from Pinecone")
                pinecone_index.delete(filter={"document_id": document_id})
            except Exception as e:
                logger.error(f"Failed to delete from Pinecone: {e}")
                
        # 3. Delete from DB
        logger.info("Deleting record from Postgres")
        db.delete(document)
        db.commit()
        
    except Exception as e:
        logger.error("Document deletion pipeline failed", exc_info=True, document_id=document_id)
        if 'document' in locals() and document:
            document.status = "error"
            db.commit()
        raise e
    finally:
        db.close()
