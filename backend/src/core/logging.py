import structlog
import logging
import sys
from asgi_correlation_id import correlation_id

def setup_logging():
    # Setup standard python logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)

# Context vars helper for FastAPI middleware
def bind_request_context(request):
    """Binds request data to the structured logger context"""
    structlog.contextvars.clear_contextvars()
    
    # Base bindings
    structlog.contextvars.bind_contextvars(
        request_id=correlation_id.get(),
        method=request.method,
        path=request.url.path,
    )
    
    # We can bind more context later, like user_id after auth, 
    # or project_id/meeting_id from path params.
