import os
import resend
from arq.connections import RedisSettings


# Ensure API key is picked up from env
resend.api_key = os.environ.get("RESEND_API_KEY", "dummy_key")

async def send_project_invitation_email(ctx, email: str, inviter_name: str, project_name: str, token: str):
    """
    Background task to send an email via Resend.
    """
    confirm_url = f"http://localhost:3000/accept-invite?token={token}"
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
        print(f"Sending email to {email}...")
        result = resend.Emails.send({
            "from": os.environ.get("EMAIL_FROM", "Acme <onboarding@resend.dev>"),
            "to": [email],
            "subject": f"Invitation to join {project_name}",
            "html": html_content,
        })
        print(f"Email sent successfully to {email}, id: {result.get('id')}")
        return result
    except Exception as e:
        print(f"Error sending email to {email}: {str(e)}")

        raise


from src.knowledge.worker import process_meeting_knowledge
from src.enrichment.worker import enrich_meeting

class WorkerSettings:
    functions = [send_project_invitation_email, process_meeting_knowledge, enrich_meeting]
    job_timeout = 3600  # Allow long running tasks (1 hour)
    max_tries = 3
    
    # We use redis as hostname since we run in docker-compose.
    redis_settings = RedisSettings(host=os.environ.get("REDIS_HOST", "redis"), port=6379)
