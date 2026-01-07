"""User and authentication schemas for hybrid tenancy."""

import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: str
    name: str


class UserCreate(BaseModel):
    """Schema for creating a global user."""
    email: str
    password: str
    name: str
    global_role: str = "standard"  # 'global_resource_manager' or 'standard'
    default_role: str | None = None
    capacity_hours: int = 160
    cost_rate: Decimal | None = None
    billable_rate: Decimal | None = None


class UserLogin(BaseModel):
    """Schema for user login - phase 1."""
    email: str
    password: str


class OrgAssignment(BaseModel):
    """Organization assignment info for login response."""
    id: uuid.UUID
    name: str
    slug: str
    is_primary: bool
    
    class Config:
        from_attributes = True


class PendingLoginResponse(BaseModel):
    """Response when user has multiple orgs - requires org selection."""
    auth_token: str  # Temporary token for phase 2
    requires_org_selection: bool = True
    organizations: list[OrgAssignment]


class OrgSelectionRequest(BaseModel):
    """Request to complete login with org selection."""
    auth_token: str
    org_id: uuid.UUID


class UserRead(BaseModel):
    """Schema for reading a user."""
    id: uuid.UUID
    email: str
    name: str
    global_role: str
    default_role: str | None = None
    capacity_hours: int
    cost_rate: Decimal | None = None
    billable_rate: Decimal | None = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserWithOrgContext(UserRead):
    """User with current session org context."""
    current_org_id: uuid.UUID
    current_org_name: str
    org_role: str  # Role within current org context


class Token(BaseModel):
    """JWT token response - final auth token."""
    access_token: str
    token_type: str = "bearer"
    user: UserWithOrgContext


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    user_id: uuid.UUID
    org_id: uuid.UUID  # Session-scoped org
    email: str


class RegistrationRequest(BaseModel):
    """Combined registration request with user and org data."""
    # User fields
    email: str
    password: str
    name: str
    # Organization fields
    org_name: str
    slug: str


# UserAssignment Schemas
class UserAssignmentCreate(BaseModel):
    """Schema for assigning a user to an org."""
    user_id: uuid.UUID
    org_id: uuid.UUID
    is_primary: bool = False
    allocation_percent: int = 100
    org_role: str = "member"  # Role within the org


class UserAssignmentRead(BaseModel):
    """Schema for reading a user assignment."""
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: uuid.UUID
    is_primary: bool
    allocation_percent: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserAssignmentWithOrg(UserAssignmentRead):
    """Assignment with org details."""
    org_name: str
    org_slug: str

