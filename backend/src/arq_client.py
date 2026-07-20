import os
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

def enqueue_arq_job(job_name: str, *args, **kwargs):
    """
    Synchronous wrapper to enqueue a job into ARQ from synchronous endpoints.
    """
    async def _enqueue():
        redis_host = os.environ.get("REDIS_HOST", "redis")
        pool = await create_pool(RedisSettings(host=redis_host, port=6379))
        await pool.enqueue_job(job_name, *args, **kwargs)
        await pool.close()

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_enqueue())
    except RuntimeError:
        asyncio.run(_enqueue())
