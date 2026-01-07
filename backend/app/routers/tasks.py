"""Tasks router with full CRUD and auto-assignment."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentSessionOrgId
from app.models import Task, TaskMarketStatus, Resource, Project
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, AutoAssignResult
from app.websocket import manager, EventType

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
    """Auto-assign tasks to resources based on team and capacity."""
    # Get all unassigned tasks
    tasks_result = await db.execute(
        select(Task)
        .where(Task.org_id == org_id, Task.assignee_id == None, Task.status != "Completed")
        .options(selectinload(Task.project))
    )
    tasks = list(tasks_result.scalars().all())
    
    # Get all resources with their current load
    resources_result = await db.execute(
        select(Resource).where(Resource.org_id == org_id)
    )
    resources = list(resources_result.scalars().all())
    
    # Calculate current usage per resource
    resource_usage = {r.id: 0 for r in resources}
    assigned_tasks_result = await db.execute(
        select(Task).where(Task.org_id == org_id, Task.assignee_id != None)
    )
    for task in assigned_tasks_result.scalars():
        if task.assignee_id in resource_usage:
            resource_usage[task.assignee_id] += task.estimate or 0
    
    assigned_count = 0
    gaps = []
    
    for task in tasks:
        project = task.project
        if not project:
            continue
        
        required_team = project.type
        estimate = task.estimate or 0
        
        # Find suitable resource
        best_resource = None
        for resource in resources:
            if resource.team == required_team:
                available = (resource.capacity or 160) - (resource.leave_hours or 0) - resource_usage.get(resource.id, 0)
                if available >= estimate:
                    best_resource = resource
                    break
        
        if best_resource:
            task.assignee_id = best_resource.id
            resource_usage[best_resource.id] = resource_usage.get(best_resource.id, 0) + estimate
            assigned_count += 1
        else:
            team_exists = any(r.team == required_team for r in resources)
            gaps.append({
                "task_id": str(task.id),
                "task_title": task.title,
                "project_name": project.name if project else "Unknown",
                "required_team": required_team,
                "estimate": estimate,
                "reason": "Insufficient Capacity" if team_exists else "No Team Members"
            })
    
    await db.flush()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.TASKS_AUTO_ASSIGNED,
        "payload": {"assigned_count": assigned_count, "gaps": gaps}
    })
    
    return AutoAssignResult(assigned_count=assigned_count, gaps=gaps)
