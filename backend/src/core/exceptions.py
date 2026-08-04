from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from .schemas import ErrorResponse, ErrorDetail

class BaseAPIException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400, details: dict = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

class NotFoundException(BaseAPIException):
    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(message=message, code="NOT_FOUND", status_code=404, details=details)

class ForbiddenException(BaseAPIException):
    def __init__(self, message: str = "Access denied", details: dict = None):
        super().__init__(message=message, code="FORBIDDEN", status_code=403, details=details)

class ValidationException(BaseAPIException):
    def __init__(self, message: str = "Validation error", details: dict = None):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422, details=details)

def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(BaseAPIException)
    async def custom_api_exception_handler(request: Request, exc: BaseAPIException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=ErrorDetail(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details
                )
            ).model_dump()
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Convert standard FastAPI HTTPExceptions into our standard format
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="HTTP_ERROR",
                    message=str(exc.detail),
                )
            ).model_dump()
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="UNPROCESSABLE_ENTITY",
                    message="Request validation failed",
                    details=exc.errors()
                )
            ).model_dump()
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        # Do not expose DB internals in production
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="DATABASE_ERROR",
                    message="An internal database error occurred."
                )
            ).model_dump()
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Catch-all for unhandled exceptions
        print(f"Unhandled Exception: {exc}") # Should ideally be replaced with proper logging
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected internal error occurred."
                )
            ).model_dump()
        )
