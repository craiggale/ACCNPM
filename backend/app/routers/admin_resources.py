"""Global Admin Resource Management Router.

Protected endpoints for Global Resource Managers to manage user assignments.
"""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, GlobalAdmin, get_password_hash
from app.models import User, UserAssignment, Organization
from app.schemas.user import (
    UserCreate, UserRead, UserAssignmentCreate, 
    UserAssignmentRead, UserAssignmentWithOrg
)

router = APIRouter(prefix="/admin/resources", tags=["Global Admin"])


# --- User Management ---

@router.get("/users", response_model=list[UserRead])
async def list_all_users(admin: GlobalAdmin, db: DbSession):
    """List all global users (requires Global Resource Manager role)."""
    result = await db.execute(select(User).order_by(User.name))
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


@router.post("/users", response_model=UserRead)
async def create_global_user(
    user_data: UserCreate, 
    admin: GlobalAdmin, 
    db: DbSession
):
    """Create a new global user (requires Global Resource Manager role)."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        global_role=user_data.global_role,
        default_role=user_data.default_role,
        capacity_hours=user_data.capacity_hours,
        cost_rate=user_data.cost_rate,
        billable_rate=user_data.billable_rate,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.flush()
    
    return UserRead.model_validate(user)


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(user_id: uuid.UUID, admin: GlobalAdmin, db: DbSession):
    """Get a specific user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead.model_validate(user)


# --- Assignment Management ---

@router.get("/assignments", response_model=list[UserAssignmentWithOrg])
async def list_all_assignments(admin: GlobalAdmin, db: DbSession):
    """List all user-org assignments."""
    result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.organization))
        .order_by(UserAssignment.user_id)
    )
    assignments = result.scalars().all()
    
    return [
        UserAssignmentWithOrg(
            id=a.id,
            user_id=a.user_id,
            org_id=a.org_id,
            is_primary=a.is_primary,
            allocation_percent=a.allocation_percent,
            created_at=a.created_at,
            org_name=a.organization.name,
            org_slug=a.organization.slug
        )
        for a in assignments
    ]


@router.get("/users/{user_id}/assignments", response_model=list[UserAssignmentWithOrg])
async def get_user_assignments(user_id: uuid.UUID, admin: GlobalAdmin, db: DbSession):
    """Get all org assignments for a specific user."""
    result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.organization))
        .where(UserAssignment.user_id == user_id)
    )
    assignments = result.scalars().all()
    
    return [
        UserAssignmentWithOrg(
            id=a.id,
            user_id=a.user_id,
            org_id=a.org_id,
            is_primary=a.is_primary,
            allocation_percent=a.allocation_percent,
            created_at=a.created_at,
            org_name=a.organization.name,
            org_slug=a.organization.slug
        )
        for a in assignments
    ]


@router.post("/assignments", response_model=UserAssignmentRead)
async def create_assignment(
    assignment_data: UserAssignmentCreate,
    admin: GlobalAdmin,
    db: DbSession
):
    """Assign a user to an organization."""
    # Verify user exists
    user = await db.get(User, assignment_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify org exists
    org = await db.get(Organization, assignment_data.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if assignment already exists
    result = await db.execute(
        select(UserAssignment).where(
            UserAssignment.user_id == assignment_data.user_id,
            UserAssignment.org_id == assignment_data.org_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already assigned to this organization"
        )
    
    # Check total allocation doesn't exceed 100%
    result = await db.execute(
        select(func.sum(UserAssignment.allocation_percent))
        .where(UserAssignment.user_id == assignment_data.user_id)
    )
    current_total = result.scalar() or 0
    
    if current_total + assignment_data.allocation_percent > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total allocation would exceed 100%. Current: {current_total}%, Requested: {assignment_data.allocation_percent}%"
        )
    
    # If this is set as primary, unset other primaries
    if assignment_data.is_primary:
        result = await db.execute(
            select(UserAssignment).where(
                UserAssignment.user_id == assignment_data.user_id,
                UserAssignment.is_primary == True
            )
        )
        existing_primary = result.scalar_one_or_none()
        if existing_primary:
            existing_primary.is_primary = False
    
    assignment = UserAssignment(
        user_id=assignment_data.user_id,
        org_id=assignment_data.org_id,
        is_primary=assignment_data.is_primary,
        allocation_percent=assignment_data.allocation_percent
    )
    db.add(assignment)
    await db.flush()
    
    return UserAssignmentRead.model_validate(assignment)


@router.put("/assignments/{assignment_id}", response_model=UserAssignmentRead)
async def update_assignment(
    assignment_id: uuid.UUID,
    allocation_percent: int | None = None,
    is_primary: bool | None = None,
    admin: GlobalAdmin = None,
    db: DbSession = None
):
    """Update an assignment's allocation or primary status."""
    result = await db.execute(
        select(UserAssignment).where(UserAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if allocation_percent is not None:
        # Check new total wouldn't exceed 100%
        result = await db.execute(
            select(func.sum(UserAssignment.allocation_percent))
            .where(
                UserAssignment.user_id == assignment.user_id,
                UserAssignment.id != assignment_id
            )
        )
        other_total = result.scalar() or 0
        if other_total + allocation_percent > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total allocation would exceed 100%. Other assignments: {other_total}%"
            )
        assignment.allocation_percent = allocation_percent
    
    if is_primary is not None and is_primary:
        # Unset other primaries
        result = await db.execute(
            select(UserAssignment).where(
                UserAssignment.user_id == assignment.user_id,
                UserAssignment.is_primary == True,
                UserAssignment.id != assignment_id
            )
        )
        for existing in result.scalars():
            existing.is_primary = False
        assignment.is_primary = True
    
    await db.flush()
    return UserAssignmentRead.model_validate(assignment)


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: uuid.UUID,
    admin: GlobalAdmin,
    db: DbSession
):
    """Remove a user from an organization."""
    result = await db.execute(
        select(UserAssignment).where(UserAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await db.delete(assignment)
    await db.flush()
    
    return {"status": "deleted", "id": str(assignment_id)}


# --- Availability Check ---

@router.get("/availability/{user_id}")
async def get_user_availability(user_id: uuid.UUID, admin: GlobalAdmin, db: DbSession):
    """Check a user's allocation across all organizations."""
    result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.organization))
        .where(UserAssignment.user_id == user_id)
    )
    assignments = result.scalars().all()
    
    total_allocated = sum(a.allocation_percent for a in assignments)
    
    return {
        "user_id": str(user_id),
        "total_allocated_percent": total_allocated,
        "available_percent": max(0, 100 - total_allocated),
        "is_fully_allocated": total_allocated >= 100,
        "assignments": [
            {
                "org_id": str(a.org_id),
                "org_name": a.organization.name,
                "allocation_percent": a.allocation_percent,
                "is_primary": a.is_primary
            }
            for a in assignments
        ]
    }
