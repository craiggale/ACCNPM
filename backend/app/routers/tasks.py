"""Tasks router with full CRUD and auto-assignment."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentSessionOrgId
from app.models import Task, TaskMarketStatus, Resource, Project
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, AutoAssignResult
from app.websocket import manager, EventType
from app.services import auto_assign_resources, update_task_cascade

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    db: DbSession, 
    org_id: CurrentSessionOrgId,
    project_id: uuid.UUID | None = None
):
    """List tasks, optionally filtered by project."""
    query = select(Task).where(Task.org_id == org_id).options(
        selectinload(Task.market_statuses)
    )
    
    if project_id:
        query = query.where(Task.project_id == project_id)
    
    result = await db.execute(query.order_by(Task.start_date))
    tasks = result.scalars().all()
    return [TaskRead.model_validate(t) for t in tasks]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(task_data: TaskCreate, db: DbSession, org_id: CurrentSessionOrgId):
    """Create a new task."""
    # Verify project belongs to org
    result = await db.execute(
        select(Project).where(Project.id == task_data.project_id, Project.org_id == org_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    task = Task(
        org_id=org_id,
        **task_data.model_dump()
    )
    db.add(task)
    await db.flush()
    
    # Add market statuses if market-specific
    if task.is_market_specific:
        # Get project markets
        result = await db.execute(
            select(Project)
            .where(Project.id == task.project_id)
            .options(selectinload(Project.launch_details))
        )
        project = result.scalar_one()
        for ld in project.launch_details:
            if ld.market != "Global":
                market_status = TaskMarketStatus(
                    task_id=task.id,
                    market=ld.market,
                    status="Planning"
                )
                db.add(market_status)
    
    await db.flush()
    
    # Reload with relationships
    result = await db.execute(
        select(Task).where(Task.id == task.id).options(selectinload(Task.market_statuses))
    )
    task = result.scalar_one()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.TASK_CREATED,
        "payload": TaskRead.model_validate(task).model_dump()
    })
    
    return TaskRead.model_validate(task)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Get a specific task."""
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id, Task.org_id == org_id)
        .options(selectinload(Task.market_statuses))
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    updates: TaskUpdate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Update a task."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.org_id == org_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.flush()
    
    # Reload with relationships
    result = await db.execute(
        select(Task).where(Task.id == task.id).options(selectinload(Task.market_statuses))
    )
    task = result.scalar_one()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.TASK_UPDATED,
        "payload": TaskRead.model_validate(task).model_dump()
    })
    
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Delete a task."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.org_id == org_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    await db.delete(task)
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.TASK_DELETED,
        "payload": {"id": str(task_id)}
    })


@router.post("/auto-assign", response_model=AutoAssignResult)
async def auto_assign_tasks(db: DbSession, org_id: CurrentSessionOrgId):
    """
    Auto-assign tasks to resources using 3-tier algorithm:
    1. Primary resources (belong to current portfolio)
    2. Shared resources (from other portfolios with allocation)
    3. Cross-portfolio suggestions (candidates for reallocation)
    """
    # Use the service layer for business logic
    result = await auto_assign_resources(db, org_id)
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.TASKS_AUTO_ASSIGNED,
        "payload": result
    })
    
    return AutoAssignResult(
        assigned_count=result['summary']['assigned'],
        gaps=result['gaps'],
        shared_assignments=result.get('shared_assignments', []),
        cross_portfolio_suggestions=result.get('cross_portfolio_suggestions', [])
    )

