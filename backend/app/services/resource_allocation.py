"""
Resource Allocation Service

3-tier auto-assignment algorithm:
1. Primary resources (belong to current portfolio)
2. Shared resources (from other portfolios with available capacity)
3. Cross-portfolio suggestions (candidates for reallocation)
"""

from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Task, Project, User, UserAssignment, Organization


class ResourceAllocationService:
    """Handles resource allocation and auto-assignment logic."""
    
    def __init__(self, db: AsyncSession, org_id: UUID):
        self.db = db
        self.org_id = org_id
    
    async def auto_assign_tasks(self) -> dict:
        """
        Auto-assign unassigned tasks to available resources.
        
        Returns a dictionary with:
        - gaps: Tasks that couldn't be assigned
        - shared_assignments: Tasks assigned to shared resources
        - cross_portfolio_suggestions: Candidates from other portfolios
        - summary: Assignment statistics
        """
        # Load tasks for this organization
        tasks = await self._get_unassigned_tasks()
        resources = await self._get_available_resources()
        
        # Categorize resources
        primary_resources = [r for r in resources if r['is_primary']]
        shared_resources = [r for r in resources if not r['is_primary'] and r['allocation'] < 100]
        
        # Track assignments
        gaps = []
        shared_assignments = []
        cross_portfolio_suggestions = []
        assigned_count = 0
        
        for task in tasks:
            project = await self._get_project(task.project_id)
            if not project:
                continue
                
            required_team = project.type_name  # e.g., 'Website', 'Configurator'
            estimate = task.estimate_hours or 0
            
            # TIER 1: Primary resources
            assigned = await self._try_assign_primary(task, primary_resources, required_team, estimate)
            if assigned:
                assigned_count += 1
                continue
            
            # TIER 2: Shared resources
            assigned, shared_info = await self._try_assign_shared(task, shared_resources, required_team, estimate, project)
            if assigned:
                shared_assignments.append(shared_info)
                assigned_count += 1
                continue
            
            # TIER 3: Cross-portfolio suggestions
            candidates = self._find_cross_portfolio_candidates(resources, required_team, estimate)
            if candidates:
                cross_portfolio_suggestions.append({
                    'task_id': str(task.id),
                    'task_title': task.title,
                    'project_name': project.name,
                    'required_team': required_team,
                    'estimate': estimate,
                    'candidates': candidates,
                    'type': 'reallocation_suggestion'
                })
            
            # Record gap
            gaps.append({
                'task_id': str(task.id),
                'task_title': task.title,
                'project_name': project.name,
                'required_team': required_team,
                'estimate': estimate,
                'reason': 'Primary Resources at Capacity' if any(r['team'] == required_team for r in primary_resources) else 'No Primary Team Members',
                'type': 'gap',
                'has_cross_portfolio_option': len(candidates) > 0
            })
        
        await self.db.commit()
        
        return {
            'gaps': [g for g in gaps if g['type'] == 'gap'],
            'shared_assignments': shared_assignments,
            'cross_portfolio_suggestions': cross_portfolio_suggestions,
            'summary': {
                'assigned': assigned_count,
                'unassigned': len([g for g in gaps if g['type'] == 'gap']),
                'used_shared_resources': len(shared_assignments),
                'can_reallocate': len(cross_portfolio_suggestions)
            }
        }
    
    async def _get_unassigned_tasks(self) -> list:
        """Get all unassigned tasks for projects in this organization."""
        result = await self.db.execute(
            select(Task)
            .join(Project, Task.project_id == Project.id)
            .where(Project.org_id == self.org_id)
            .where(Task.assignee_id == None)
        )
        return result.scalars().all()
    
    async def _get_available_resources(self) -> list:
        """
        Get all available resources with their allocation info.
        Returns primary resources (this org) and shared resources (other orgs with capacity).
        """
        # Get all users with assignments
        result = await self.db.execute(
            select(User, UserAssignment)
            .join(UserAssignment, User.id == UserAssignment.user_id)
            .where(User.is_active == True)
        )
        rows = result.all()
        
        resources = []
        for user, assignment in rows:
            # Calculate available capacity
            capacity = user.capacity_hours or 160
            used = await self._get_user_assigned_hours(user.id)
            available = capacity - used
            
            resources.append({
                'id': str(user.id),
                'name': user.name,
                'team': user.default_role,  # Maps to project type
                'capacity': capacity,
                'used': used,
                'available': available,
                'org_id': str(assignment.org_id),
                'is_primary': assignment.org_id == self.org_id,
                'allocation': assignment.allocation_percent or 100
            })
        
        return resources
    
    async def _get_user_assigned_hours(self, user_id: UUID) -> int:
        """Calculate total hours already assigned to this user."""
        result = await self.db.execute(
            select(Task)
            .where(Task.assignee_id == user_id)
        )
        tasks = result.scalars().all()
        return sum(t.estimate_hours or 0 for t in tasks)
    
    async def _get_project(self, project_id: UUID) -> Optional[Project]:
        """Get a project by ID."""
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        return result.scalar_one_or_none()
    
    async def _try_assign_primary(self, task, resources: list, required_team: str, estimate: int) -> bool:
        """Try to assign task to a primary resource. Returns True if successful."""
        for resource in resources:
            if resource['team'] == required_team and resource['available'] >= estimate:
                task.assignee_id = UUID(resource['id'])
                resource['used'] += estimate
                resource['available'] -= estimate
                return True
        return False
    
    async def _try_assign_shared(self, task, resources: list, required_team: str, estimate: int, project) -> tuple:
        """
        Try to assign task to a shared resource.
        Returns (success: bool, assignment_info: dict or None)
        """
        for resource in resources:
            if resource['team'] == required_team and resource['available'] >= estimate:
                task.assignee_id = UUID(resource['id'])
                resource['used'] += estimate
                resource['available'] -= estimate
                
                info = {
                    'task_id': str(task.id),
                    'task_title': task.title,
                    'project_name': project.name,
                    'required_team': required_team,
                    'estimate': estimate,
                    'assigned_to': resource['name'],
                    'resource_id': resource['id'],
                    'primary_portfolio_id': resource['org_id'],
                    'target_portfolio_id': str(self.org_id),
                    'current_allocation': resource['allocation'],
                    'suggested_split': 30,
                    'type': 'shared_assignment'
                }
                return True, info
        return False, None
    
    def _find_cross_portfolio_candidates(self, resources: list, required_team: str, estimate: int) -> list:
        """Find candidates from other portfolios who could be reallocated."""
        candidates = []
        for resource in resources:
            if (resource['team'] == required_team and 
                not resource['is_primary'] and 
                resource['allocation'] < 100 and 
                resource['available'] >= estimate):
                candidates.append({
                    'id': resource['id'],
                    'name': resource['name'],
                    'current_allocation': resource['allocation'],
                    'available_hours': int(resource['capacity'] * (100 - resource['allocation']) / 100),
                    'portfolio_id': resource['org_id']
                })
        return candidates


async def auto_assign_resources(db: AsyncSession, org_id: UUID) -> dict:
    """
    Main entry point for auto-assigning resources.
    
    Args:
        db: Database session
        org_id: Current organization/portfolio ID
        
    Returns:
        Assignment results with gaps, shared assignments, and suggestions
    """
    service = ResourceAllocationService(db, org_id)
    return await service.auto_assign_tasks()
