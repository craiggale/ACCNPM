"""Projects router with full CRUD."""

import uuid
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentSessionOrgId, CurrentUser
from app.models import Project, LaunchDetail, InputGateway, GatewayVersion, Task, TaskMarketStatus
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate, InputGatewayUpdate
from app.websocket import manager, EventType

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(db: DbSession, org_id: CurrentSessionOrgId):
    """List all projects for the current organization."""
    result = await db.execute(
        select(Project)
        .where(Project.org_id == org_id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
            .selectinload(InputGateway.versions)
        )
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return [ProjectRead.model_validate(p) for p in projects]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate, 
    db: DbSession, 
    org_id: CurrentSessionOrgId
):
    """Create a new project with launch details."""
    # Create project
    project = Project(
        org_id=org_id,
        name=project_data.name,
        status=project_data.status,
        health=project_data.health,
        pm_id=project_data.pm_id,
        type=project_data.type,
        scale=project_data.scale,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        original_end_date=project_data.end_date,
    )
    db.add(project)
    await db.flush()
    
    # Create Global launch detail
    global_launch = LaunchDetail(
        project_id=project.id,
        market="Global",
        goal_live=project_data.end_date
    )
    db.add(global_launch)
    
    # Create market-specific launch details
    for market in project_data.markets:
        launch = LaunchDetail(
            project_id=project.id,
            market=market,
            goal_live=project_data.end_date
        )
        db.add(launch)
    
    await db.flush()
    
    # Reload with relationships
    result = await db.execute(
        select(Project)
        .where(Project.id == project.id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
        )
    )
    project = result.scalar_one()
    
    # Broadcast create event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.PROJECT_CREATED,
        "payload": ProjectRead.model_validate(project).model_dump()
    })
    
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Get a specific project."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.org_id == org_id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
            .selectinload(InputGateway.versions)
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    updates: ProjectUpdate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Update a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.org_id == org_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.flush()
    
    # Reload with relationships
    result = await db.execute(
        select(Project)
        .where(Project.id == project.id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
        )
    )
    project = result.scalar_one()
    
    # Broadcast update event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.PROJECT_UPDATED,
        "payload": ProjectRead.model_validate(project).model_dump()
    })
    
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: uuid.UUID, db: DbSession, org_id: CurrentSessionOrgId):
    """Delete a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.org_id == org_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    await db.delete(project)
    
    # Broadcast delete event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.PROJECT_DELETED,
        "payload": {"id": str(project_id)}
    })


@router.patch("/{project_id}/gateways/{gateway_id}", response_model=ProjectRead)
async def update_gateway(
    project_id: uuid.UUID,
    gateway_id: uuid.UUID,
    update_data: InputGatewayUpdate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Update an input gateway status (triggers rework logic if needed)."""
    # Get project and gateway
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.org_id == org_id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
            .selectinload(InputGateway.versions)
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Find the gateway
    gateway = None
    launch_detail = None
    for ld in project.launch_details:
        for gw in ld.input_gateways:
            if gw.id == gateway_id:
                gateway = gw
                launch_detail = ld
                break
        if gateway:
            break
    
    if not gateway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gateway not found")
    
    # Create version entry
    version_number = len(gateway.versions) + 1
    is_on_time = update_data.status == "Received" and update_data.date <= gateway.expected_date if gateway.expected_date else True
    
    version = GatewayVersion(
        gateway_id=gateway.id,
        version_number=version_number,
        status=update_data.status,
        date=update_data.date,
        notes=update_data.notes,
        is_on_time=is_on_time
    )
    db.add(version)
    
    # Update gateway status
    gateway.status = update_data.status
    if update_data.status == "Received":
        gateway.received_date = update_data.date
    
    # Rework logic: if Late or re-delivery, create rework tasks
    is_redelivery = version_number > 1
    if update_data.status == "Late" or (update_data.status == "Received" and is_redelivery):
        # Create rework task
        rework_task = Task(
            org_id=org_id,
            project_id=project.id,
            title=f"Rework: {gateway.name} ({launch_detail.market})",
            status="Planning",
            estimate=8,  # Default 8 hour estimate
            start_date=update_data.date,
            end_date=update_data.date + timedelta(days=5),
            is_market_specific=True,
            is_rework=True,
            gateway_source=gateway.name
        )
        db.add(rework_task)
        await db.flush()
        
        # Add market status
        market_status = TaskMarketStatus(
            task_id=rework_task.id,
            market=launch_detail.market,
            status="Planning"
        )
        db.add(market_status)
    
    await db.flush()
    
    # Reload project
    result = await db.execute(
        select(Project)
        .where(Project.id == project.id)
        .options(
            selectinload(Project.launch_details)
            .selectinload(LaunchDetail.input_gateways)
            .selectinload(InputGateway.versions)
        )
    )
    project = result.scalar_one()
    
    # Broadcast event
    await manager.broadcast_to_org(org_id, {
        "type": EventType.GATEWAY_UPDATED,
        "payload": ProjectRead.model_validate(project).model_dump()
    })
    
    return ProjectRead.model_validate(project)
