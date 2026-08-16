import hashlib
from typing import Optional, Callable, Any, Dict, Tuple
from fastapi import Request, Response
from fastapi_cache import FastAPICache
from supertokens_python.recipe.session import SessionContainer

def user_specific_key_builder(
    func: Callable[..., Any],
    namespace: Optional[str] = "",
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    args: Optional[Tuple[Any, ...]] = None,
    kwargs: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Builds a secure cache key that includes the authenticated user's ID
    and request parameters, safely excluding non-serializable dependencies
    like database Sessions, services, or request objects.
    """
    prefix = f"{FastAPICache.get_prefix()}:{namespace}:" if namespace else f"{FastAPICache.get_prefix()}:"
    
    user_id = "anonymous"
    clean_params = {}
    
    if kwargs:
        for k, v in kwargs.items():
            if isinstance(v, SessionContainer):
                try:
                    user_id = v.get_user_id()
                except Exception:
                    pass
            elif k in ("db", "service", "session", "request", "response") or hasattr(v, "execute"):
                # Skip non-primitive dependencies
                continue
            elif isinstance(v, (int, str, float, bool)) or v is None:
                clean_params[k] = v
            elif isinstance(v, (list, tuple, dict)):
                try:
                    clean_params[k] = str(v)
                except Exception:
                    pass

    path = request.url.path if request else ""
    query = request.url.query if request else ""
    
    raw_key = f"{prefix}{func.__module__}:{func.__name__}:user:{user_id}:path:{path}:query:{query}:params:{sorted(clean_params.items())}"
    return hashlib.md5(raw_key.encode("utf-8")).hexdigest()
