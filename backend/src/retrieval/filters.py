from pydantic import BaseModel
from typing import Optional

class RetrievalFilters(BaseModel):
    project_id: Optional[int] = None
    meeting_id: Optional[str] = None
    is_global_search: bool = False
