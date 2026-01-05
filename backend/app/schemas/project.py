"""Project and related schemas."""

import uuid
from datetime import date, datetime
from pydantic import BaseModel


class InputGatewayVersionRead(BaseModel):
    """Schema for gateway version history."""
    version_number: int
    status: str | None
    date: date | None
    notes: str | None
    is_on_time: bool | None
    
    class Config:
        from_attributes = True


class InputGatewayRead(BaseModel):
    """Schema for reading input gateways."""
    id: uuid.UUID
    name: str
    status: str
    expected_date: date | None
    received_date: date | None
    versions: list[InputGatewayVersionRead] = []
    
    class Config:
        from_attributes = True


class InputGatewayUpdate(BaseModel):
    """Schema for updating a gateway status."""
    status: str
    date: date
    notes: str | None = None


class LaunchDetailRead(BaseModel):
    """Schema for reading launch details."""
    id: uuid.UUID
    market: str
    goal_live: date | None
    input_gateways: list[InputGatewayRead] = []
    
    class Config:
        from_attributes = True


class LaunchDetailCreate(BaseModel):
    """Schema for creating launch details."""
    market: str
    goal_live: date | None = None


class ProjectBase(BaseModel):
    """Base project schema."""
    name: str
    status: str = "Planning"
    health: str = "On Track"
    type: str | None = None
    scale: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    pm_id: uuid.UUID | None = None
    markets: list[str] = []  # List of markets to auto-create launch details


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: str | None = None
    status: str | None = None
    health: str | None = None
    pm_id: uuid.UUID | None = None
    type: str | None = None
    scale: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectRead(ProjectBase):
    """Schema for reading a project."""
    id: uuid.UUID
    org_id: uuid.UUID
    pm_id: uuid.UUID | None
    original_end_date: date | None
    created_at: datetime
    launch_details: list[LaunchDetailRead] = []
    
    class Config:
        from_attributes = True
