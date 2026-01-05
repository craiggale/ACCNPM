"""Initiatives router with full CRUD and task linking."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentOrgId
from app.models import Initiative, InitiativeValueMetric, InitiativeTaskLink, InitiativeTaskValue, Task
from app.schemas.initiative import InitiativeCreate, InitiativeRead, InitiativeUpdate, TaskLinkCreate
from app.websocket import manager, EventType

router = APIRouter(prefix="/initiatives", tags=["Initiatives"])


@router.get("", response_model=list[InitiativeRead])
async def list_initiatives(db: DbSession, org_id: CurrentOrgId):
    """List all initiatives for the current organization."""
    result = await db.execute(
        select(Initiative)
        .where(Initiative.org_id == org_id)
        .options(
            selectinload(Initiative.value_metrics),
            selectinload(Initiative.task_links).selectinload(InitiativeTaskLink.values)
        )
        .order_by(Initiative.created_at.desc())
    )
    initiatives = result.scalars().all()
    
    # Transform to schema format
    initiatives_out = []
    for init in initiatives:
        init_dict = {
            "id": init.id,
            "org_id": init.org_id,
            "name": init.name,
            "business_goal": init.business_goal,
            "status": init.status,
            "value_proposition": init.value_proposition,
            "change_type": init.change_type,
            "start_date": init.start_date,
            "created_at": init.created_at,
            "value_metrics": [m.metric_name for m in init.value_metrics],
            "task_links": init.task_links
        }
        initiatives_out.append(InitiativeRead.model_validate(init_dict))
    
    return initiatives_out


@router.post("", response_model=InitiativeRead, status_code=status.HTTP_201_CREATED)
async def create_initiative(init_data: InitiativeCreate, db: DbSession, org_id: CurrentOrgId):
    """Create a new initiative."""
    initiative = Initiative(
        org_id=org_id,
        name=init_data.name,
        business_goal=init_data.business_goal,
        status=init_data.status,
        value_proposition=init_data.value_proposition,
        change_type=init_data.change_type,
        start_date=init_data.start_date
    )
    db.add(initiative)
    await db.flush()
    
    # Add value metrics
    for metric_name in init_data.value_metrics:
        metric = InitiativeValueMetric(
            initiative_id=initiative.id,
            metric_name=metric_name
        )
        db.add(metric)
    
    await db.flush()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.INITIATIVE_CREATED,
        "payload": {"id": str(initiative.id), "name": initiative.name}
    })
    
    return InitiativeRead(
        id=initiative.id,
        org_id=initiative.org_id,
        name=initiative.name,
        business_goal=initiative.business_goal,
        status=initiative.status,
        value_proposition=initiative.value_proposition,
        change_type=initiative.change_type,
        start_date=initiative.start_date,
        created_at=initiative.created_at,
        value_metrics=init_data.value_metrics,
        task_links=[]
    )


@router.get("/{initiative_id}", response_model=InitiativeRead)
async def get_initiative(initiative_id: uuid.UUID, db: DbSession, org_id: CurrentOrgId):
    """Get a specific initiative."""
    result = await db.execute(
        select(Initiative)
        .where(Initiative.id == initiative_id, Initiative.org_id == org_id)
        .options(
            selectinload(Initiative.value_metrics),
            selectinload(Initiative.task_links).selectinload(InitiativeTaskLink.values)
        )
    )
    initiative = result.scalar_one_or_none()
    
    if not initiative:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    return InitiativeRead(
        id=initiative.id,
        org_id=initiative.org_id,
        name=initiative.name,
        business_goal=initiative.business_goal,
        status=initiative.status,
        value_proposition=initiative.value_proposition,
        change_type=initiative.change_type,
        start_date=initiative.start_date,
        created_at=initiative.created_at,
        value_metrics=[m.metric_name for m in initiative.value_metrics],
        task_links=initiative.task_links
    )


@router.patch("/{initiative_id}", response_model=InitiativeRead)
async def update_initiative(
    initiative_id: uuid.UUID,
    updates: InitiativeUpdate,
    db: DbSession,
    org_id: CurrentOrgId
):
    """Update an initiative."""
    result = await db.execute(
        select(Initiative).where(Initiative.id == initiative_id, Initiative.org_id == org_id)
    )
    initiative = result.scalar_one_or_none()
    
    if not initiative:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(initiative, field, value)
    
    await db.flush()
    
    # Reload
    result = await db.execute(
        select(Initiative)
        .where(Initiative.id == initiative_id)
        .options(
            selectinload(Initiative.value_metrics),
            selectinload(Initiative.task_links).selectinload(InitiativeTaskLink.values)
        )
    )
    initiative = result.scalar_one()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.INITIATIVE_UPDATED,
        "payload": {"id": str(initiative.id), "name": initiative.name}
    })
    
    return InitiativeRead(
        id=initiative.id,
        org_id=initiative.org_id,
        name=initiative.name,
        business_goal=initiative.business_goal,
        status=initiative.status,
        value_proposition=initiative.value_proposition,
        change_type=initiative.change_type,
        start_date=initiative.start_date,
        created_at=initiative.created_at,
        value_metrics=[m.metric_name for m in initiative.value_metrics],
        task_links=initiative.task_links
    )


@router.delete("/{initiative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_initiative(initiative_id: uuid.UUID, db: DbSession, org_id: CurrentOrgId):
    """Delete an initiative."""
    result = await db.execute(
        select(Initiative).where(Initiative.id == initiative_id, Initiative.org_id == org_id)
    )
    initiative = result.scalar_one_or_none()
    
    if not initiative:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    await db.delete(initiative)
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.INITIATIVE_DELETED,
        "payload": {"id": str(initiative_id)}
    })


@router.post("/{initiative_id}/link-task", response_model=InitiativeRead)
async def link_task_to_initiative(
    initiative_id: uuid.UUID,
    link_data: TaskLinkCreate,
    db: DbSession,
    org_id: CurrentOrgId
):
    """Link a task to an initiative with value metrics."""
    # Get initiative
    result = await db.execute(
        select(Initiative).where(Initiative.id == initiative_id, Initiative.org_id == org_id)
    )
    initiative = result.scalar_one_or_none()
    
    if not initiative:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    # Verify task exists
    result = await db.execute(
        select(Task).where(Task.id == link_data.task_id, Task.org_id == org_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Create link
    link = InitiativeTaskLink(
        initiative_id=initiative_id,
        task_id=link_data.task_id
    )
    db.add(link)
    await db.flush()
    
    # Add values
    for value_item in link_data.values:
        value = InitiativeTaskValue(
            link_id=link.id,
            metric_name=value_item["metric_name"],
            value=value_item.get("value")
        )
        db.add(value)
    
    # Update task with initiative link
    task.linked_initiative_id = initiative_id
    
    await db.flush()
    
    # Reload initiative
    result = await db.execute(
        select(Initiative)
        .where(Initiative.id == initiative_id)
        .options(
            selectinload(Initiative.value_metrics),
            selectinload(Initiative.task_links).selectinload(InitiativeTaskLink.values)
        )
    )
    initiative = result.scalar_one()
    
    return InitiativeRead(
        id=initiative.id,
        org_id=initiative.org_id,
        name=initiative.name,
        business_goal=initiative.business_goal,
        status=initiative.status,
        value_proposition=initiative.value_proposition,
        change_type=initiative.change_type,
        start_date=initiative.start_date,
        created_at=initiative.created_at,
        value_metrics=[m.metric_name for m in initiative.value_metrics],
        task_links=initiative.task_links
    )


@router.delete("/{initiative_id}/unlink-task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_task_from_initiative(
    initiative_id: uuid.UUID,
    task_id: uuid.UUID,
    db: DbSession,
    org_id: CurrentOrgId
):
    """Unlink a task from an initiative."""
    # Find and delete the link
    result = await db.execute(
        select(InitiativeTaskLink).where(
            InitiativeTaskLink.initiative_id == initiative_id,
            InitiativeTaskLink.task_id == task_id
        )
    )
    link = result.scalar_one_or_none()
    
    if link:
        await db.delete(link)
    
    # Clear task link
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.org_id == org_id)
    )
    task = result.scalar_one_or_none()
    
    if task:
        task.linked_initiative_id = None
