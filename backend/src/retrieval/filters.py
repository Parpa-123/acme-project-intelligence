from pydantic import BaseModel
from typing import Optional

class RetrievalFilters(BaseModel):
    project_id: int
    meeting_id: Optional[str] = None
