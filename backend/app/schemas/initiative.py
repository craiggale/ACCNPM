"""Initiative schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class InitiativeValueRead(BaseModel):
    """Schema for reading a value attached to a task link."""
    metric_name: str
    value: Decimal | None
    
    class Config:
        from_attributes = True


class TaskLinkRead(BaseModel):
    """Schema for reading a task link."""
    id: uuid.UUID
    task_id: uuid.UUID
    date_linked: datetime
    values: list[InitiativeValueRead] = []
    
    class Config:
        from_attributes = True


class TaskLinkCreate(BaseModel):
    """Schema for linking a task to an initiative."""
    task_id: uuid.UUID
    values: list[dict]  # List of {metric_name, value}


class InitiativeBase(BaseModel):
    """Base initiative schema."""
    name: str
    business_goal: str | None = None
    status: str = "Planning"
    value_proposition: str | None = None
    change_type: str | None = None
    start_date: date | None = None
    value_metrics: list[str] = []  # List of metric names


class InitiativeCreate(InitiativeBase):
    """Schema for creating an initiative."""
    pass


class InitiativeUpdate(BaseModel):
    """Schema for updating an initiative."""
    name: str | None = None
    business_goal: str | None = None
    status: str | None = None
    value_proposition: str | None = None
    change_type: str | None = None
    start_date: date | None = None


class InitiativeRead(InitiativeBase):
    """Schema for reading an initiative."""
    id: uuid.UUID
    org_id: uuid.UUID
    created_at: datetime
    task_links: list[TaskLinkRead] = []
    
    class Config:
        from_attributes = True
