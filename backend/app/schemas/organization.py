"""Organization schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel


class OrganizationBase(BaseModel):
    """Base organization schema."""
    name: str
    slug: str


class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization."""
    pass


class OrganizationRead(OrganizationBase):
    """Schema for reading an organization."""
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
