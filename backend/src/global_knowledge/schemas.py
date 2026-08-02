from pydantic import BaseModel, ConfigDict
from typing import Optional, Generic, TypeVar, List
from src.knowledge.schemas import DecisionResponse, RequirementResponse, ActionItemResponse, SearchResultResponse

class GlobalCitationMixin(BaseModel):
    project_name: Optional[str] = None
    project_id: Optional[int] = None
    meeting_title: Optional[str] = None

class GlobalDecisionResponse(DecisionResponse, GlobalCitationMixin):
    pass

class GlobalRequirementResponse(RequirementResponse, GlobalCitationMixin):
    pass

class GlobalActionItemResponse(ActionItemResponse, GlobalCitationMixin):
    pass

class GlobalSearchResultResponse(SearchResultResponse):
    project_name: Optional[str] = None
    project_id: Optional[int] = None

T = TypeVar("T")
class GlobalPaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    has_more: bool
