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


from src.knowledge.worker import process_meeting_knowledge
from src.enrichment.worker import enrich_meeting
from src.documents.worker import process_document_pipeline, delete_document_pipeline

class WorkerSettings:
    functions = [send_project_invitation_email, process_meeting_knowledge, enrich_meeting, process_document_pipeline, delete_document_pipeline]
    job_timeout = 3600  # Allow long running tasks (1 hour)
    max_tries = 3
    
    # We use redis as hostname since we run in docker-compose.
    redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
