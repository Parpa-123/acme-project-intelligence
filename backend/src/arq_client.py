import os
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

import logging

logger = logging.getLogger(__name__)

def enqueue_arq_job(job_name: str, *args, **kwargs):
    """
    Synchronous wrapper to enqueue a job into ARQ from synchronous endpoints.
    """
    async def _enqueue():
        try:
            redis_host = os.environ.get("REDIS_HOST", "redis")
            logger.info(f"Enqueuing {job_name} on redis://{redis_host}:6379")
            pool = await create_pool(RedisSettings(host=redis_host, port=6379))
            job = await pool.enqueue_job(job_name, *args, **kwargs)
            logger.info(f"Successfully enqueued {job_name} with job id {job.job_id if job else 'None'}")
            await pool.close()
        except Exception as e:
            logger.error(f"Failed to enqueue {job_name}: {e}")

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_enqueue())
    except RuntimeError:
        asyncio.run(_enqueue())
