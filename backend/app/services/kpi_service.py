"""
KPI Service - Business Outcomes Tracking

Handles KPI calculations, aggregations, and Value Gap detection.
Integrates with the Resolution Engine to weigh resource allocation by KPI priority.
"""

from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models import KPIDefinition, PortfolioKPI, ValueGap, Project


class KPIService:
    """Handles KPI calculations and Value Gap detection."""
    
    def __init__(self, db: AsyncSession, org_id: UUID):
        self.db = db
        self.org_id = org_id
    
    async def get_kpi_definitions(self) -> list[dict]:
        """Get all KPI definitions for this portfolio."""
        result = await self.db.execute(
            select(KPIDefinition)
            .where(KPIDefinition.org_id == self.org_id)
            .where(KPIDefinition.is_active == True)
            .order_by(KPIDefinition.display_order, KPIDefinition.category)
        )
        definitions = result.scalars().all()
        
        return [self._serialize_definition(d) for d in definitions]
    
    async def get_kpi_dashboard(self) -> dict:
        """
        Get complete KPI dashboard data with current values and trends.
        
        Returns:
            Dictionary with KPIs by category, overall health score, and trends
        """
        result = await self.db.execute(
            select(KPIDefinition)
            .where(KPIDefinition.org_id == self.org_id)
            .where(KPIDefinition.is_active == True)
            .options(selectinload(KPIDefinition.values))
            .order_by(KPIDefinition.display_order)
        )
        definitions = result.scalars().all()
        
        by_category = {}
        total_score = 0
        kpi_count = 0
        
        for defn in definitions:
            # Get latest value
            latest = self._get_latest_value(defn.values)
            status = self._calculate_status(defn, latest)
            trend = self._calculate_trend(defn.values)
            
            kpi_data = {
                'id': str(defn.id),
                'name': defn.name,
                'target': float(defn.target_value),
                'actual': float(latest.actual_value) if latest else None,
                'unit': defn.unit,
                'direction': defn.direction,
                'status': status,
                'trend': trend,
                'trend_values': self._get_trend_values(defn.values)
            }
            
            category = defn.category
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(kpi_data)
            
            # Calculate health contribution
            if latest:
                score = self._calculate_kpi_score(defn, latest)
                total_score += score
                kpi_count += 1
        
        overall_health = round(total_score / kpi_count) if kpi_count > 0 else 0
        
        return {
            'by_category': by_category,
            'overall_health': overall_health,
            'kpi_count': kpi_count,
            'last_updated': datetime.utcnow().isoformat()
        }
    
    async def detect_value_gaps(self) -> list[dict]:
        """
        Detect discrepancies between project health (KVI) and business outcomes (KPI).
        
        Returns:
            List of detected Value Gaps with suggested actions
        """
        # Get projects with their health status
        projects_result = await self.db.execute(
            select(Project).where(Project.org_id == self.org_id)
        )
        projects = projects_result.scalars().all()
        
        # Get KPIs with current status
        kpis_result = await self.db.execute(
            select(KPIDefinition)
            .where(KPIDefinition.org_id == self.org_id)
            .where(KPIDefinition.is_active == True)
            .options(selectinload(KPIDefinition.values))
        )
        definitions = kpis_result.scalars().all()
        
        gaps = []
        
        # Analyze KPI performance
        underperforming_kpis = []
        for defn in definitions:
            latest = self._get_latest_value(defn.values)
            if latest:
                status = self._calculate_status(defn, latest)
                if status in ['warning', 'critical']:
                    underperforming_kpis.append({
                        'definition': defn,
                        'latest': latest,
                        'status': status
                    })
        
        # Detect: High KVI (On Track) but declining KPIs
        on_track_projects = [p for p in projects if p.health == 'On Track']
        for project in on_track_projects:
            for kpi_info in underperforming_kpis:
                defn = kpi_info['definition']
                trend = self._calculate_trend(defn.values)
                
                if trend == 'declining':
                    gap = await self._create_or_get_gap(
                        gap_type='high_kvi_low_kpi',
                        severity=kpi_info['status'],
                        title=f'{project.name} On Track, but {defn.name} declining',
                        description=f'Project "{project.name}" shows healthy execution, but the {defn.name} KPI has been declining. This suggests the work may not be driving the intended business outcomes.',
                        suggested_action=f'Review the {defn.name} funnel analytics. Consider pivoting sprint focus to address the gap between delivery and impact.',
                        project_id=project.id,
                        related_kpi_ids=[str(defn.id)]
                    )
                    gaps.append(gap)
        
        # Detect: Low KVI (At Risk) with critical KPI miss
        at_risk_projects = [p for p in projects if p.health in ['At Risk', 'Late']]
        for project in at_risk_projects:
            critical_kpis = [k for k in underperforming_kpis if k['status'] == 'critical']
            if critical_kpis:
                kpi_names = ', '.join([k['definition'].name for k in critical_kpis[:3]])
                gap = await self._create_or_get_gap(
                    gap_type='low_kvi_high_kpi',
                    severity='critical',
                    title=f'{project.name} at risk with critical KPI impact',
                    description=f'Project "{project.name}" is struggling AND critical KPIs ({kpi_names}) are missing targets. Immediate intervention required.',
                    suggested_action=f'Consider pulling resources from the Global Pool to accelerate {project.name}. Alternatively, descope to focus on high-impact features.',
                    project_id=project.id,
                    related_kpi_ids=[str(k['definition'].id) for k in critical_kpis[:3]]
                )
                gaps.append(gap)
        
        # Detect: Resource mismatch - high resource allocation, flat KPIs
        active_projects = [p for p in projects if p.status == 'Active']
        for defn in definitions:
            latest = self._get_latest_value(defn.values)
            trend = self._calculate_trend(defn.values)
            
            if trend == 'flat' and len(active_projects) > 2:
                gap = await self._create_or_get_gap(
                    gap_type='resource_mismatch',
                    severity='warning',
                    title=f'{defn.name} flat despite active projects',
                    description=f'The {defn.name} KPI has remained flat while {len(active_projects)} projects are actively consuming resources. This may indicate a mismatch between effort and impact.',
                    suggested_action=f'Consider reallocating 1-2 resources to {defn.name}-driving activities (e.g., documentation, SDK improvements, user research).',
                    project_id=None,
                    related_kpi_ids=[str(defn.id)]
                )
                gaps.append(gap)
        
        return gaps
    
    async def _create_or_get_gap(
        self, 
        gap_type: str, 
        severity: str, 
        title: str, 
        description: str, 
        suggested_action: str,
        project_id: Optional[UUID],
        related_kpi_ids: list[str]
    ) -> dict:
        """Create a new Value Gap or return existing unresolved one."""
        # Check for existing unresolved gap
        existing = await self.db.execute(
            select(ValueGap)
            .where(ValueGap.org_id == self.org_id)
            .where(ValueGap.gap_type == gap_type)
            .where(ValueGap.project_id == project_id)
            .where(ValueGap.resolved_at == None)
        )
        gap = existing.scalar_one_or_none()
        
        if not gap:
            gap = ValueGap(
                org_id=self.org_id,
                project_id=project_id,
                gap_type=gap_type,
                severity=severity,
                title=title,
                description=description,
                suggested_action=suggested_action,
                related_kpi_ids=related_kpi_ids
            )
            self.db.add(gap)
            await self.db.flush()
        
        return self._serialize_gap(gap)
    
    def _get_latest_value(self, values: list[PortfolioKPI]) -> Optional[PortfolioKPI]:
        """Get the most recent KPI value."""
        if not values:
            return None
        return max(values, key=lambda v: v.period)
    
    def _calculate_status(self, defn: KPIDefinition, value: Optional[PortfolioKPI]) -> str:
        """Calculate KPI status: on_track, warning, critical."""
        if not value:
            return 'unknown'
        
        actual = float(value.actual_value)
        target = float(defn.target_value)
        
        if defn.direction == 'higher_better':
            if actual >= target:
                return 'on_track'
            elif defn.warning_threshold and actual >= float(defn.warning_threshold):
                return 'warning'
            else:
                return 'critical'
        else:  # lower_better
            if actual <= target:
                return 'on_track'
            elif defn.warning_threshold and actual <= float(defn.warning_threshold):
                return 'warning'
            else:
                return 'critical'
    
    def _calculate_trend(self, values: list[PortfolioKPI]) -> str:
        """Calculate trend: improving, declining, flat."""
        if len(values) < 2:
            return 'flat'
        
        sorted_values = sorted(values, key=lambda v: v.period)[-3:]  # Last 3 periods
        if len(sorted_values) < 2:
            return 'flat'
        
        first = float(sorted_values[0].actual_value)
        last = float(sorted_values[-1].actual_value)
        
        pct_change = ((last - first) / abs(first)) * 100 if first != 0 else 0
        
        if pct_change > 5:
            return 'improving'
        elif pct_change < -5:
            return 'declining'
        else:
            return 'flat'
    
    def _get_trend_values(self, values: list[PortfolioKPI]) -> list[dict]:
        """Get last 6 periods of values for trend chart."""
        sorted_values = sorted(values, key=lambda v: v.period)[-6:]
        return [
            {'period': v.period.isoformat(), 'value': float(v.actual_value)}
            for v in sorted_values
        ]
    
    def _calculate_kpi_score(self, defn: KPIDefinition, value: PortfolioKPI) -> float:
        """Calculate a 0-100 score for this KPI's performance."""
        actual = float(value.actual_value)
        target = float(defn.target_value)
        
        if defn.direction == 'higher_better':
            ratio = actual / target if target != 0 else 0
        else:
            ratio = target / actual if actual != 0 else 0
        
        return min(100, max(0, ratio * 100))
    
    def _serialize_definition(self, defn: KPIDefinition) -> dict:
        """Serialize KPI definition to dict."""
        return {
            'id': str(defn.id),
            'name': defn.name,
            'description': defn.description,
            'category': defn.category,
            'unit': defn.unit,
            'direction': defn.direction,
            'target_value': float(defn.target_value),
            'warning_threshold': float(defn.warning_threshold) if defn.warning_threshold else None,
            'critical_threshold': float(defn.critical_threshold) if defn.critical_threshold else None,
            'display_order': defn.display_order
        }
    
    def _serialize_gap(self, gap: ValueGap) -> dict:
        """Serialize Value Gap to dict."""
        return {
            'id': str(gap.id),
            'gap_type': gap.gap_type,
            'severity': gap.severity,
            'title': gap.title,
            'description': gap.description,
            'suggested_action': gap.suggested_action,
            'project_id': str(gap.project_id) if gap.project_id else None,
            'related_kpi_ids': gap.related_kpi_ids,
            'detected_at': gap.detected_at.isoformat() if gap.detected_at else None,
            'resolved_at': gap.resolved_at.isoformat() if gap.resolved_at else None
        }


def calculate_kpi_weight(kpi_status: str) -> float:
    """
    Calculate priority weight factor based on KPI status.
    Used by Resource Allocation Service to boost priority for underperforming KPIs.
    
    Returns:
        Weight multiplier (1.0 = normal, >1.0 = boosted, <1.0 = reduced)
    """
    weights = {
        'critical': 1.5,  # 50% priority boost
        'warning': 1.2,   # 20% priority boost
        'on_track': 1.0,  # Normal priority
        'unknown': 1.0    # Default
    }
    return weights.get(kpi_status, 1.0)
