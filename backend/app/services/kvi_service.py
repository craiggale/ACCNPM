"""
KVI (Key Value Indicators) Service

Handles value metrics calculations for initiatives and portfolios.
Calculates efficiency gains, cost savings, and other business value metrics.
"""

from typing import Dict, List, Optional
from uuid import UUID
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Initiative, Task, Project


class KVIService:
    """Handles KVI calculations and metrics aggregation."""
    
    # Value metric categories
    METRIC_CATEGORIES = {
        'efficiency': [
            'Efficiency Gains - FTE Hour Reduction (Hrs)',
            'Efficiency Gains - FTE Fee Reduction (£)',
            'Efficiency Gains - Asset Cost Reduction (£)'
        ],
        'revenue': [
            'Revenue - Pipeline Increase (£)',
            'Revenue - Conversion Rate Increase (%)'
        ],
        'brand': [
            'Brand & Experience - NPS Score (%)',
            'Brand & Experience - Customer Satisfaction (%)'
        ]
    }
    
    def __init__(self, db: AsyncSession, org_id: UUID):
        self.db = db
        self.org_id = org_id
    
    async def get_portfolio_health(self) -> dict:
        """
        Calculate overall portfolio health metrics.
        
        Returns:
            Portfolio health summary with project statuses and trends
        """
        # Get all projects for this org
        result = await self.db.execute(
            select(Project).where(Project.org_id == self.org_id)
        )
        projects = result.scalars().all()
        
        # Count by status
        status_counts = {}
        for project in projects:
            status = project.health or 'Unknown'
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Calculate health score (weighted average)
        health_weights = {
            'On Track': 100,
            'At Risk': 50,
            'Off Track': 0,
            'Unknown': 50
        }
        
        total_weight = 0
        weighted_sum = 0
        for status, count in status_counts.items():
            weight = health_weights.get(status, 50)
            weighted_sum += weight * count
            total_weight += count
        
        health_score = round(weighted_sum / total_weight) if total_weight > 0 else 0
        
        return {
            'health_score': health_score,
            'total_projects': len(projects),
            'status_breakdown': status_counts,
            'trend': 'stable'  # Would calculate from historical data
        }
    
    async def get_initiative_value(self, initiative_id: Optional[UUID] = None) -> dict:
        """
        Calculate value delivered by initiatives.
        
        Args:
            initiative_id: Optional specific initiative, or all if None
            
        Returns:
            Value metrics breakdown
        """
        # Get initiatives
        query = select(Initiative).where(Initiative.org_id == self.org_id)
        if initiative_id:
            query = query.where(Initiative.id == initiative_id)
        
        result = await self.db.execute(query)
        initiatives = result.scalars().all()
        
        # Aggregate values
        total_by_category = {cat: Decimal(0) for cat in self.METRIC_CATEGORIES}
        initiatives_data = []
        
        for initiative in initiatives:
            init_values = await self._calculate_initiative_values(initiative)
            initiatives_data.append({
                'id': str(initiative.id),
                'name': initiative.name,
                'status': initiative.status,
                'values': init_values,
                'total_value': sum(v.get('value', 0) for v in init_values.values())
            })
            
            # Aggregate by category
            for category, metrics in self.METRIC_CATEGORIES.items():
                for metric in metrics:
                    if metric in init_values:
                        total_by_category[category] += Decimal(str(init_values[metric].get('value', 0)))
        
        return {
            'initiatives': initiatives_data,
            'totals_by_category': {k: float(v) for k, v in total_by_category.items()},
            'grand_total': float(sum(total_by_category.values()))
        }
    
    async def _calculate_initiative_values(self, initiative: Initiative) -> dict:
        """Calculate aggregated values for a single initiative."""
        values = {}
        
        # Get linked tasks and their values
        result = await self.db.execute(
            select(Task)
            .where(Task.linked_initiative_id == initiative.id)
        )
        linked_tasks = result.scalars().all()
        
        for task in linked_tasks:
            # Aggregate task values (stored as JSON or separate table)
            task_values = task.value_metrics or {}
            for metric, value in task_values.items():
                if metric not in values:
                    values[metric] = {'value': 0, 'task_count': 0}
                values[metric]['value'] += value
                values[metric]['task_count'] += 1
        
        return values
    
    async def get_schedule_variance(self) -> dict:
        """
        Calculate schedule variance for all projects.
        
        Returns:
            Schedule variance metrics and at-risk projects
        """
        result = await self.db.execute(
            select(Project).where(Project.org_id == self.org_id)
        )
        projects = result.scalars().all()
        
        variances = []
        at_risk = []
        
        for project in projects:
            variance = await self._calculate_project_variance(project)
            variances.append(variance)
            
            if variance['days_variance'] > 0:
                at_risk.append({
                    'id': str(project.id),
                    'name': project.name,
                    'days_late': variance['days_variance'],
                    'original_end': str(project.original_end_date) if project.original_end_date else None,
                    'current_end': str(project.end_date) if project.end_date else None
                })
        
        # Calculate average variance
        avg_variance = sum(v['days_variance'] for v in variances) / len(variances) if variances else 0
        
        return {
            'average_variance_days': round(avg_variance, 1),
            'projects_at_risk': len(at_risk),
            'total_projects': len(projects),
            'at_risk_details': at_risk
        }
    
    async def _calculate_project_variance(self, project: Project) -> dict:
        """Calculate schedule variance for a single project."""
        original = project.original_end_date
        current = project.end_date
        
        if original and current:
            variance_days = (current - original).days
        else:
            variance_days = 0
        
        return {
            'project_id': str(project.id),
            'project_name': project.name,
            'days_variance': variance_days,
            'status': 'late' if variance_days > 0 else ('early' if variance_days < 0 else 'on_time')
        }


async def get_portfolio_kvi(db: AsyncSession, org_id: UUID) -> dict:
    """
    Get comprehensive KVI metrics for a portfolio.
    
    Args:
        db: Database session
        org_id: Organization/portfolio ID
        
    Returns:
        Complete KVI dashboard data
    """
    service = KVIService(db, org_id)
    
    health = await service.get_portfolio_health()
    value = await service.get_initiative_value()
    variance = await service.get_schedule_variance()
    
    return {
        'portfolio_health': health,
        'initiative_value': value,
        'schedule_variance': variance
    }
