"""Resources router with full CRUD and tiered availability."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentSessionOrgId
from app.models import Resource, User, UserAssignment
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate
from app.websocket import manager, EventType

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=list[ResourceRead])
async def list_resources(db: DbSession, org_id: CurrentSessionOrgId):
    """List all resources for the current organization."""
    result = await db.execute(
        select(Resource)
        .where(Resource.org_id == org_id)
        .order_by(Resource.name)
    )
    resources = result.scalars().all()
    return [ResourceRead.model_validate(r) for r in resources]


@router.get("/available")
async def get_available_resources(db: DbSession, org_id: CurrentSessionOrgId):
    """
    Get tiered list of available resources for task assignment.
    
    Returns:
    - primary: Users assigned to this org as primary (is_primary=True)
    - shared: Users with capacity available (total allocation < 100%)
    """
    # Get primary resources for this org
    primary_result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.user))
        .where(
            UserAssignment.org_id == org_id,
            UserAssignment.is_primary == True
        )
    )
    primary_assignments = primary_result.scalars().all()
    
    primary_resources = [
        {
            "id": str(a.user.id),
            "name": a.user.name,
            "email": a.user.email,
            "default_role": a.user.default_role,
            "capacity_hours": a.user.capacity_hours,
            "allocation_percent": a.allocation_percent,
            "is_primary": True,
            "cost_rate": float(a.user.cost_rate) if a.user.cost_rate else None,
            "billable_rate": float(a.user.billable_rate) if a.user.billable_rate else None
        }
        for a in primary_assignments if a.user.is_active
    ]
    
    # Get shared resources (users not primary to this org but with available capacity)
    # First get users assigned to this org but not as primary
    non_primary_result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.user))
        .where(
            UserAssignment.org_id == org_id,
            UserAssignment.is_primary == False
        )
    )
    non_primary_assignments = non_primary_result.scalars().all()
    
    shared_resources = [
        {
            "id": str(a.user.id),
            "name": a.user.name,
            "email": a.user.email,
            "default_role": a.user.default_role,
            "capacity_hours": a.user.capacity_hours,
            "allocation_percent": a.allocation_percent,
            "is_primary": False,
            "cost_rate": float(a.user.cost_rate) if a.user.cost_rate else None,
            "billable_rate": float(a.user.billable_rate) if a.user.billable_rate else None
        }
        for a in non_primary_assignments if a.user.is_active
    ]
    
    # Also get global users with less than 100% allocation who could potentially be shared
    # (This is for the Global Resource Manager to see candidates for assignment)
    
    return {
        "primary": primary_resources,
        "shared": shared_resources
    }


@router.post("", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(resource_data: ResourceCreate, db: DbSession, org_id: CurrentSessionOrgId):
    """Create a new resource."""
    resource = Resource(
        org_id=org_id,
        **resource_data.model_dump()
    )
    db.add(resource)
    await db.flush()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.RESOURCE_CREATED,
        "payload": ResourceRead.model_validate(resource).model_dump()
    })
    
    return ResourceRead.model_validate(resource)


@router.get("/{resource_id}", response_model=ResourceRead)
async def get_resource(resource_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Get a specific resource."""
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.org_id == org_id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    return ResourceRead.model_validate(resource)


@router.patch("/{resource_id}", response_model=ResourceRead)
async def update_resource(
    resource_id: uuid.UUID,
    updates: ResourceUpdate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Update a resource."""
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.org_id == org_id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)
    
    await db.flush()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.RESOURCE_UPDATED,
        "payload": ResourceRead.model_validate(resource).model_dump()
    })
    
    return ResourceRead.model_validate(resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(resource_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Delete a resource."""
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.org_id == org_id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    await db.delete(resource)
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.RESOURCE_DELETED,
        "payload": {"id": str(resource_id)}
    })

