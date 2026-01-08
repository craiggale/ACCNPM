"""Task schemas."""

import uuid
from datetime import date
from pydantic import BaseModel


class TaskMarketStatusRead(BaseModel):
    """Schema for task market status."""
    market: str
    status: str
    
    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    """Base task schema."""
    title: str
    status: str = "Planning"
    estimate: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_market_specific: bool = False
    gateway_dependency: str | None = None


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    project_id: uuid.UUID
    assignee_id: uuid.UUID | None = None
    predecessor_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: str | None = None
    status: str | None = None
    assignee_id: uuid.UUID | None = None
    estimate: int | None = None
    actual: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    linked_initiative_id: uuid.UUID | None = None


class TaskRead(TaskBase):
    """Schema for reading a task."""
    id: uuid.UUID
    org_id: uuid.UUID
    project_id: uuid.UUID
    assignee_id: uuid.UUID | None
    actual: int
    predecessor_id: uuid.UUID | None
    is_rework: bool
    gateway_source: str | None
    linked_initiative_id: uuid.UUID | None
    value_saved: int | None
    market_statuses: list[TaskMarketStatusRead] = []
    
    class Config:
        from_attributes = True


class AutoAssignResult(BaseModel):
    """Result of auto-assignment operation."""
    assigned_count: int
    gaps: list[dict]
    shared_assignments: list[dict] = []
    cross_portfolio_suggestions: list[dict] = []

