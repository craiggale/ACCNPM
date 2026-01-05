"""Resource schemas."""

import uuid
from decimal import Decimal
from pydantic import BaseModel


class ResourceBase(BaseModel):
    """Base resource schema."""
    name: str
    role: str | None = None
    team: str | None = None
    capacity: int = 160
    leave_hours: int = 0
    cost_rate: Decimal | None = None
    billable_rate: Decimal | None = None


class ResourceCreate(ResourceBase):
    """Schema for creating a resource."""
    user_id: uuid.UUID | None = None


class ResourceUpdate(BaseModel):
    """Schema for updating a resource."""
    name: str | None = None
    role: str | None = None
    team: str | None = None
    capacity: int | None = None
    leave_hours: int | None = None
    cost_rate: Decimal | None = None
    billable_rate: Decimal | None = None


class ResourceRead(ResourceBase):
    """Schema for reading a resource."""
    id: uuid.UUID
    org_id: uuid.UUID
    user_id: uuid.UUID | None
    
    class Config:
        from_attributes = True
