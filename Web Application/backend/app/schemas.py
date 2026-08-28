from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    is_active: bool = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

from pydantic import BaseModel
from typing import List


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    price: float
    features: List[str]
    storage: str
    ai_features: List[str]

from pydantic import BaseModel
from typing import Optional


class FileResponse(BaseModel):
    id: str
    name: str
    owner: str
    size: int
    folder_id: Optional[str] = None
    object_name: str
    bucket_name: str
    url: Optional[str] = None
    uploaded_at: str