"""Resources router with full CRUD."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession, CurrentOrgId
from app.models import Resource
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate
from app.websocket import manager, EventType

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=list[ResourceRead])
async def list_resources(db: DbSession, org_id: CurrentOrgId):
    """List all resources for the current organization."""
    result = await db.execute(
        select(Resource)
        .where(Resource.org_id == org_id)
        .order_by(Resource.name)
    )
    resources = result.scalars().all()
    return [ResourceRead.model_validate(r) for r in resources]


@router.post("", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(resource_data: ResourceCreate, db: DbSession, org_id: CurrentOrgId):
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
async def get_resource(resource_id: uuid.UUID, db: DbSession, org_id: CurrentOrgId):
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
    org_id: CurrentOrgId
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
async def delete_resource(resource_id: uuid.UUID, db: DbSession, org_id: CurrentOrgId):
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
