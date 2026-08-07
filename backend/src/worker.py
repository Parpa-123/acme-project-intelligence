import os
import resend
import os
import resend
from arq.connections import RedisSettings


# Ensure API key is picked up from env
resend.api_key = os.environ.get("RESEND_API_KEY", "dummy_key")

from src.core.logging import get_logger, setup_logging
import structlog

# Setup structlog for worker
setup_logging()
logger = get_logger("worker")

async def send_project_invitation_email(ctx, email: str, inviter_name: str, project_name: str, token: str):
    """
    Background task to send an email via Resend.
    """
    structlog.contextvars.bind_contextvars(email=email, project_name=project_name)
    web_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000").rstrip("/")
    confirm_url = f"{web_url}/invitations/{token}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
        <h1>You have been invited!</h1>
        <p>{inviter_name} invited you to join the project <b>{project_name}</b>.</p>
        <a href="{confirm_url}"
            style="display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px;">
        Accept Invitation
        </a>
        <p style="color: #999; margin-top: 20px;">
        If you didn't expect this invitation, you can ignore this email.
        </p>
    </div>
    """

    try:
        logger.info("Sending email...")
        result = resend.Emails.send({
            "from": os.environ.get("EMAIL_FROM", "Acme <notifications@blos-acme-conf.website>"),
            "to": [email],
            "subject": f"Invitation to join {project_name}",
            "html": html_content,
        })
        logger.info("Email sent successfully", resend_id=result.get("id"))
        return result
    except Exception as e:
        logger.error("Error sending email", exc_info=True)
        raise


async def notify_project_members_meeting_started(ctx, meeting_id: str, initiator_id: int):
    """
    Background task to notify all project members that a meeting has started.
    """
    from src.database import SessionLocal
    from src.meeting.models import Meeting
    from src.projects.models import ProjectMembers
    from src.models import User
    
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return
            
        space = meeting.meeting_space
        project = space.project
        initiator = db.query(User).filter(User.id == initiator_id).first()
        
        # Get all members except initiator
        members = db.query(ProjectMembers).filter(
            ProjectMembers.project_id == project.id,
            ProjectMembers.user_id != initiator_id
        ).all()
        
        web_url = os.environ.get("VITE_WEB_URL", "http://localhost:3000").rstrip("/")
        # Using the standard route pattern for meetings
        join_url = f"{web_url}/projects/{project.id}/meeting/{space.id}"
        
        for member in members:
            recipient = member.user
            if not recipient:
                continue
                
            html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 40px; background-color: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="color: #111827;">Live Meeting Started</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        <b>{initiator.full_name or initiator.email}</b> has just started a live session in the space <b>"{space.name}"</b> for the project <b>"{project.name}"</b>.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{join_url}"
                           style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Join Meeting Now
                        </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 20px;">
                        If you're busy, you can catch up on the AI-generated notes later.
                    </p>
                </div>
            </div>
            """
            
            try:
                resend.Emails.send({
                    "from": os.environ.get("EMAIL_FROM", "Acme <notifications@blos-acme-conf.website>"),
                    "to": [recipient.email],
                    "subject": f"🔴 Live Now: Session started by {initiator.full_name or initiator.email} in {project.name}",
                    "html": html_content,
                })
                logger.info("Meeting notification email sent", recipient=recipient.email)
            except Exception as e:
                logger.error("Failed to send meeting notification email", recipient=recipient.email, exc_info=True)
                
    finally:
        db.close()


from src.knowledge.worker import process_meeting_knowledge
from src.enrichment.worker import enrich_meeting
from src.documents.worker import process_document_pipeline, delete_document_pipeline

class WorkerSettings:
    functions = [send_project_invitation_email, notify_project_members_meeting_started, process_meeting_knowledge, enrich_meeting, process_document_pipeline, delete_document_pipeline]
    job_timeout = 3600  # Allow long running tasks (1 hour)
    max_tries = 3
    
    # We use redis as hostname since we run in docker-compose.
    redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
