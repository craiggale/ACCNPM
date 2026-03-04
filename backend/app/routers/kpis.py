"""KPI (Key Performance Indicators) router for business outcomes tracking."""

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbSession, CurrentSessionOrgId
from app.models import KPIDefinition, PortfolioKPI, ValueGap
from app.services.kpi_service import KPIService

router = APIRouter(prefix="/kpis", tags=["KPIs"])


# ============= Pydantic Schemas =============

class KPIDefinitionCreate(BaseModel):
    """Schema for creating a new KPI definition."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=50)
    direction: str = Field(default="higher_better", pattern="^(higher_better|lower_better)$")
    target_value: Decimal
    warning_threshold: Optional[Decimal] = None
    critical_threshold: Optional[Decimal] = None
    display_order: int = 0


class KPIDefinitionUpdate(BaseModel):
    """Schema for updating a KPI definition."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    direction: Optional[str] = Field(None, pattern="^(higher_better|lower_better)$")
    target_value: Optional[Decimal] = None
    warning_threshold: Optional[Decimal] = None
    critical_threshold: Optional[Decimal] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class KPIValueCreate(BaseModel):
    """Schema for recording a new KPI value."""
    period: date
    actual_value: Decimal
    forecast_value: Optional[Decimal] = None
    previous_value: Optional[Decimal] = None
    metadata: Optional[dict] = None
    notes: Optional[str] = None


class ValueGapResolve(BaseModel):
    """Schema for resolving a Value Gap."""
    resolution_notes: Optional[str] = None


# ============= KPI Definition Endpoints =============

@router.get("")
async def list_kpi_definitions(
    db: DbSession, 
    org_id: CurrentSessionOrgId,
    category: Optional[str] = Query(None, description="Filter by category")
):
    """List all KPI definitions for the current portfolio."""
    query = select(KPIDefinition).where(KPIDefinition.org_id == org_id)
    
    if category:
        query = query.where(KPIDefinition.category == category)
    
    query = query.order_by(KPIDefinition.display_order, KPIDefinition.name)
    
    result = await db.execute(query)
    definitions = result.scalars().all()
    
    return [_serialize_definition(d) for d in definitions]


@router.get("/dashboard")
async def get_kpi_dashboard(db: DbSession, org_id: CurrentSessionOrgId):
    """Get complete KPI dashboard with current values, trends, and status."""
    service = KPIService(db, org_id)
    return await service.get_kpi_dashboard()


@router.post("")
async def create_kpi_definition(
    data: KPIDefinitionCreate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Create a new KPI definition for the portfolio."""
    definition = KPIDefinition(
        org_id=org_id,
        name=data.name,
        description=data.description,
        category=data.category,
        unit=data.unit,
        direction=data.direction,
        target_value=data.target_value,
        warning_threshold=data.warning_threshold,
        critical_threshold=data.critical_threshold,
        display_order=data.display_order
    )
    db.add(definition)
    await db.flush()
    
    return _serialize_definition(definition)


@router.get("/{kpi_id}")
async def get_kpi_definition(
    kpi_id: uuid.UUID,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Get a specific KPI definition with its values."""
    result = await db.execute(
        select(KPIDefinition)
        .where(KPIDefinition.id == kpi_id)
        .where(KPIDefinition.org_id == org_id)
        .options(selectinload(KPIDefinition.values))
    )
    definition = result.scalar_one_or_none()
    
    if not definition:
        raise HTTPException(status_code=404, detail="KPI definition not found")
    
    data = _serialize_definition(definition)
    data['values'] = [_serialize_value(v) for v in sorted(definition.values, key=lambda x: x.period)]
    
    return data


@router.put("/{kpi_id}")
async def update_kpi_definition(
    kpi_id: uuid.UUID,
    data: KPIDefinitionUpdate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Update a KPI definition."""
    result = await db.execute(
        select(KPIDefinition)
        .where(KPIDefinition.id == kpi_id)
        .where(KPIDefinition.org_id == org_id)
    )
    definition = result.scalar_one_or_none()
    
    if not definition:
        raise HTTPException(status_code=404, detail="KPI definition not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(definition, field, value)
    
    return _serialize_definition(definition)


@router.delete("/{kpi_id}")
async def delete_kpi_definition(
    kpi_id: uuid.UUID,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Soft delete a KPI definition (sets is_active=False)."""
    result = await db.execute(
        select(KPIDefinition)
        .where(KPIDefinition.id == kpi_id)
        .where(KPIDefinition.org_id == org_id)
    )
    definition = result.scalar_one_or_none()
    
    if not definition:
        raise HTTPException(status_code=404, detail="KPI definition not found")
    
    definition.is_active = False
    
    return {"status": "deleted", "id": str(kpi_id)}


# ============= KPI Value Endpoints =============

@router.get("/{kpi_id}/values")
async def get_kpi_values(
    kpi_id: uuid.UUID,
    db: DbSession,
    org_id: CurrentSessionOrgId,
    limit: int = Query(12, ge=1, le=100)
):
    """Get time-series values for a KPI."""
    # Verify KPI belongs to this org
    defn_result = await db.execute(
        select(KPIDefinition)
        .where(KPIDefinition.id == kpi_id)
        .where(KPIDefinition.org_id == org_id)
    )
    if not defn_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="KPI definition not found")
    
    result = await db.execute(
        select(PortfolioKPI)
        .where(PortfolioKPI.definition_id == kpi_id)
        .order_by(PortfolioKPI.period.desc())
        .limit(limit)
    )
    values = result.scalars().all()
    
    return [_serialize_value(v) for v in reversed(values)]


@router.post("/{kpi_id}/values")
async def record_kpi_value(
    kpi_id: uuid.UUID,
    data: KPIValueCreate,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Record a new KPI value for a period."""
    # Verify KPI belongs to this org
    defn_result = await db.execute(
        select(KPIDefinition)
        .where(KPIDefinition.id == kpi_id)
        .where(KPIDefinition.org_id == org_id)
    )
    if not defn_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="KPI definition not found")
    
    # Check for existing value in this period
    existing = await db.execute(
        select(PortfolioKPI)
        .where(PortfolioKPI.definition_id == kpi_id)
        .where(PortfolioKPI.period == data.period)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Value already exists for this period")
    
    value = PortfolioKPI(
        definition_id=kpi_id,
        period=data.period,
        actual_value=data.actual_value,
        forecast_value=data.forecast_value,
        previous_value=data.previous_value,
        metadata=data.metadata,
        notes=data.notes
    )
    db.add(value)
    await db.flush()
    
    return _serialize_value(value)


# ============= Value Gap Endpoints =============

@router.get("/value-gaps", tags=["Value Gaps"])
async def get_value_gaps(
    db: DbSession,
    org_id: CurrentSessionOrgId,
    include_resolved: bool = Query(False, description="Include resolved gaps")
):
    """Get detected Value Gaps for the portfolio."""
    query = select(ValueGap).where(ValueGap.org_id == org_id)
    
    if not include_resolved:
        query = query.where(ValueGap.resolved_at == None)
    
    query = query.order_by(
        ValueGap.severity.desc(),
        ValueGap.detected_at.desc()
    )
    
    result = await db.execute(query)
    gaps = result.scalars().all()
    
    return [_serialize_gap(g) for g in gaps]


@router.get("/value-gaps/detect", tags=["Value Gaps"])
async def detect_value_gaps(db: DbSession, org_id: CurrentSessionOrgId):
    """Run Value Gap detection and return newly detected gaps."""
    service = KPIService(db, org_id)
    gaps = await service.detect_value_gaps()
    await db.commit()
    return gaps


@router.post("/value-gaps/{gap_id}/resolve", tags=["Value Gaps"])
async def resolve_value_gap(
    gap_id: uuid.UUID,
    data: ValueGapResolve,
    db: DbSession,
    org_id: CurrentSessionOrgId
):
    """Mark a Value Gap as resolved."""
    result = await db.execute(
        select(ValueGap)
        .where(ValueGap.id == gap_id)
        .where(ValueGap.org_id == org_id)
    )
    gap = result.scalar_one_or_none()
    
    if not gap:
        raise HTTPException(status_code=404, detail="Value Gap not found")
    
    if gap.resolved_at:
        raise HTTPException(status_code=400, detail="Gap already resolved")
    
    from datetime import datetime
    gap.resolved_at = datetime.utcnow()
    gap.resolution_notes = data.resolution_notes
    
    return _serialize_gap(gap)


# ============= Serializers =============

def _serialize_definition(defn: KPIDefinition) -> dict:
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
        'display_order': defn.display_order,
        'is_active': defn.is_active
    }


def _serialize_value(value: PortfolioKPI) -> dict:
    return {
        'id': str(value.id),
        'period': value.period.isoformat(),
        'actual_value': float(value.actual_value),
        'forecast_value': float(value.forecast_value) if value.forecast_value else None,
        'previous_value': float(value.previous_value) if value.previous_value else None,
        'metadata': value.metadata,
        'notes': value.notes,
        'recorded_at': value.recorded_at.isoformat() if value.recorded_at else None
    }


def _serialize_gap(gap: ValueGap) -> dict:
    return {
        'id': str(gap.id),
        'gap_type': gap.gap_type,
        'severity': gap.severity,
        'title': gap.title,
        'description': gap.description,
        'suggested_action': gap.suggested_action,
        'project_id': str(gap.project_id) if gap.project_id else None,
        'related_kpi_ids': gap.related_kpi_ids,
        'impact_score': float(gap.impact_score) if gap.impact_score else None,
        'detected_at': gap.detected_at.isoformat() if gap.detected_at else None,
        'resolved_at': gap.resolved_at.isoformat() if gap.resolved_at else None,
        'resolution_notes': gap.resolution_notes
    }
