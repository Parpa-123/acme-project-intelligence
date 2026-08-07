import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from src.database import get_db
from supertokens_python.recipe.session.framework.fastapi import verify_session
from src.projects.service import ProjectService
from .models import ProjectDocument
from .schemas import ProjectDocumentResponse
from supertokens_python.recipe.session import SessionContainer

# Boto3 handles S3 / MinIO
import boto3
from botocore.exceptions import ClientError

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    endpoint_url=os.environ.get("AWS_ENDPOINT_URL_S3", os.environ.get("MINIO_URL", "http://minio:9000")),
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin123"),
    region_name=os.environ.get("AWS_REGION", "us-east-1")
)

BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "project-documents")

def ensure_bucket_exists():
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
        except Exception as e:
            print(f"Warning: Could not create bucket {BUCKET_NAME}: {e}")

@router.post("/upload", response_model=ProjectDocumentResponse)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    # Verify Project Access
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    # 1. Generate unique S3 key
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if file_ext.startswith('.'):
        file_ext = file_ext[1:]
        
    s3_key = f"projects/{project_id}/{uuid.uuid4()}_{file.filename}"
    
    # 2. Upload to S3/MinIO
    try:
        from src.arq_client import enqueue_arq_job
        ensure_bucket_exists()
        s3_client.upload_fileobj(
            file.file, 
            BUCKET_NAME, 
            s3_key,
            ExtraArgs={"ContentType": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")
        
    # 3. Create Document Record
    doc = ProjectDocument(
        project_id=project_id,
        filename=file.filename or "Untitled",
        file_type=file_ext,
        s3_key=s3_key,
        status="processing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # 4. Dispatch Arq Background Task for LlamaIndex/Pinecone ingestion
    await enqueue_arq_job("process_document_pipeline", str(doc.id))
    
    # 5. Dispatch notification to other project members
    await enqueue_arq_job("notify_document_uploaded", project_id, str(doc.id), user.id)
    
    return doc

@router.get("", response_model=List[ProjectDocumentResponse])
async def list_documents(
    project_id: int,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(project_id, user.id)
    
    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).order_by(ProjectDocument.created_at.desc()).all()
    return docs

@router.delete("/{document_id}")
async def delete_document(
    project_id: int,
    document_id: str,
    db: Session = Depends(get_db),
    session: SessionContainer = Depends(verify_session())
):
    from src.projects.models import MemberRole
    
    project_service = ProjectService(db)
    user = project_service._get_user_by_supertokens_id(session.get_user_id())
    project_service._check_project_access(
        project_id, 
        user.id,
        require_role=[MemberRole.OWNER, MemberRole.ADMIN]
    )
    
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == document_id, ProjectDocument.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.status = "deleting"
    db.commit()
    
    from src.arq_client import enqueue_arq_job
    await enqueue_arq_job("delete_document_pipeline", str(doc.id))
    
    return {"message": "Deletion accepted"}
