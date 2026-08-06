import os
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

import logging

logger = logging.getLogger(__name__)

async def enqueue_arq_job(job_name: str, *args, **kwargs):
    """
    Asynchronous wrapper to enqueue a job into ARQ from async endpoints.
    """
    try:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        logger.info(f"Enqueuing {job_name} on {redis_url}")
        pool = await create_pool(RedisSettings.from_dsn(redis_url))
        job = await pool.enqueue_job(job_name, *args, **kwargs)
        logger.info(f"Successfully enqueued {job_name} with job id {job.job_id if job else 'None'}")
        await pool.close()
        return job
    except Exception as e:
        logger.error(f"Failed to enqueue {job_name}: {e}")
        return None

def enqueue_arq_job_sync(job_name: str, *args, **kwargs):
    """
    Synchronous wrapper to enqueue a job into ARQ from sync endpoints.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        loop.create_task(enqueue_arq_job(job_name, *args, **kwargs))
    else:
        asyncio.run(enqueue_arq_job(job_name, *args, **kwargs))
