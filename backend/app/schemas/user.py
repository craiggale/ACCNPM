"""User and authentication schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: str
    name: str
    role: str = "member"


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str
    org_id: uuid.UUID | None = None  # Optional for registration with org creation


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str
    password: str


class UserRead(UserBase):
    """Schema for reading a user."""
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    user_id: uuid.UUID
    org_id: uuid.UUID
    email: str


class RegistrationRequest(BaseModel):
    """Combined registration request with user and org data."""
    # User fields
    email: str
    password: str
    name: str
    # Organization fields
    org_name: str  # Will be mapped to organization name
    slug: str      # Organization slug
