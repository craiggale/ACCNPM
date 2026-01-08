"""
Task Dependencies Service

Handles cascading date resolution when task dates change.
If a predecessor task's end date changes, dependent tasks are pushed forward.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Task


class TaskDependencyService:
    """Handles task dependency resolution and cascading updates."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def update_task_with_cascade(
        self, 
        task_id: UUID, 
        updates: dict,
        cascade_dates: bool = True
    ) -> dict:
        """
        Update a task and cascade date changes to dependent tasks.
        
        Args:
            task_id: ID of task to update
            updates: Dictionary of fields to update
            cascade_dates: Whether to cascade date changes to successors
            
        Returns:
            Updated tasks info with cascade results
        """
        # Get the task
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        # Track affected tasks
        affected_tasks = [{'id': str(task_id), 'title': task.title, 'change': 'updated'}]
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        # If end_date changed, cascade to successors
        if cascade_dates and 'end_date' in updates:
            cascade_results = await self._resolve_dependencies(task)
            affected_tasks.extend(cascade_results)
        
        await self.db.commit()
        
        return {
            'updated_task': {
                'id': str(task.id),
                'title': task.title,
                'start_date': str(task.start_date) if task.start_date else None,
                'end_date': str(task.end_date) if task.end_date else None
            },
            'cascaded_tasks': affected_tasks[1:],
            'total_affected': len(affected_tasks)
        }
    
    async def _resolve_dependencies(self, parent_task: Task) -> List[dict]:
        """
        Recursively resolve task dependencies.
        Push successor tasks when parent date changes.
        
        Args:
            parent_task: The task whose date changed
            
        Returns:
            List of affected tasks
        """
        affected = []
        
        # Find tasks that depend on this task
        result = await self.db.execute(
            select(Task).where(Task.predecessor_id == parent_task.id)
        )
        successors = result.scalars().all()
        
        for successor in successors:
            parent_end = parent_task.end_date
            successor_start = successor.start_date
            
            # If parent ends on or after successor starts, push successor
            if parent_end and successor_start and parent_end >= successor_start:
                # Calculate duration of successor task
                duration = (successor.end_date - successor.start_date) if successor.end_date and successor.start_date else timedelta(days=0)
                
                # New start is day after parent ends
                new_start = parent_end + timedelta(days=1)
                new_end = new_start + duration
                
                old_start = successor.start_date
                old_end = successor.end_date
                
                successor.start_date = new_start
                successor.end_date = new_end
                
                affected.append({
                    'id': str(successor.id),
                    'title': successor.title,
                    'change': 'cascaded',
                    'old_start': str(old_start) if old_start else None,
                    'old_end': str(old_end) if old_end else None,
                    'new_start': str(new_start),
                    'new_end': str(new_end)
                })
                
                # Recursively resolve for this successor
                nested = await self._resolve_dependencies(successor)
                affected.extend(nested)
        
        return affected
    
    async def get_dependency_chain(self, task_id: UUID) -> dict:
        """
        Get the full dependency chain for a task.
        
        Args:
            task_id: Task ID to get chain for
            
        Returns:
            Dictionary with predecessors and successors chains
        """
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        predecessors = await self._get_predecessors_chain(task)
        successors = await self._get_successors_chain(task)
        
        return {
            'task': {'id': str(task.id), 'title': task.title},
            'predecessors': predecessors,
            'successors': successors
        }
    
    async def _get_predecessors_chain(self, task: Task) -> List[dict]:
        """Get all predecessors recursively."""
        chain = []
        current = task
        
        while current.predecessor_id:
            result = await self.db.execute(
                select(Task).where(Task.id == current.predecessor_id)
            )
            pred = result.scalar_one_or_none()
            if not pred:
                break
            chain.append({
                'id': str(pred.id),
                'title': pred.title,
                'end_date': str(pred.end_date) if pred.end_date else None
            })
            current = pred
        
        return chain
    
    async def _get_successors_chain(self, task: Task) -> List[dict]:
        """Get all successors recursively (can branch)."""
        chain = []
        
        result = await self.db.execute(
            select(Task).where(Task.predecessor_id == task.id)
        )
        successors = result.scalars().all()
        
        for succ in successors:
            chain.append({
                'id': str(succ.id),
                'title': succ.title,
                'start_date': str(succ.start_date) if succ.start_date else None,
                'successors': await self._get_successors_chain(succ)
            })
        
        return chain


async def update_task_cascade(
    db: AsyncSession, 
    task_id: UUID, 
    updates: dict
) -> dict:
    """
    Main entry point for updating a task with dependency cascade.
    
    Args:
        db: Database session
        task_id: Task to update
        updates: Fields to update
        
    Returns:
        Update results with cascade info
    """
    service = TaskDependencyService(db)
    return await service.update_task_with_cascade(task_id, updates)
