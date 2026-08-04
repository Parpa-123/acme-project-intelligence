from typing import Any, Generic, TypeVar, Optional, List
from pydantic import BaseModel, Field

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(description="Total number of items")
    page: int = Field(default=1, description="Current page number")
    size: int = Field(default=20, description="Number of items per page")
    has_more: bool = Field(description="Whether there are more items to fetch")

class SuccessResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
