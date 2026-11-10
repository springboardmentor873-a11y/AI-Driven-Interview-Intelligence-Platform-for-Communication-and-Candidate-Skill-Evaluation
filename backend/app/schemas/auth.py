
from pydantic import BaseModel, ConfigDict, Field
from app.models.user import UserRole



class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.CANDIDATE



class UserLogin(BaseModel):
    email: str
    password: str
    role: UserRole


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
