from pydantic import BaseModel, EmailStr, HttpUrl, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime

# Enums
class AuthProvider(str, Enum):
    GOOGLE = "google"
    GITHUB = "github"

# Social Accounts
class SocialAccountBase(BaseModel):
    provider: AuthProvider
    provider_id: str
    username: Optional[str] = None

class SocialAccountCreate(SocialAccountBase):
    pass

class SocialAccountResponse(SocialAccountBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# User
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[HttpUrl] = None

class UserCreate(UserBase):
    supertokens_id: str
    social_account: Optional[SocialAccountCreate] = None

class UserResponse(UserBase):
    id: int
    supertokens_id: str
    is_active: bool
    created_at: datetime
    social_accounts: List[SocialAccountResponse] = []

    class Config:
        from_attributes = True
