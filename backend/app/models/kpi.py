"""KPI models for flexible business outcome tracking."""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KPIDefinition(Base):
    """Industry-specific KPI template.
    
    Allows each portfolio to define custom KPIs without schema changes.
    Categories enable grouping (Commercial, Operational, Experience).
    """
    
    __tablename__ = "kpi_definitions"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # Commercial, Operational, Experience
    unit: Mapped[str] = mapped_column(String(50), nullable=False)  # %, £, count, days, score
    direction: Mapped[str] = mapped_column(String(20), default="higher_better")  # higher_better, lower_better
    target_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    warning_threshold: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    critical_threshold: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    is_active: Mapped[bool] = mapped_column(default=True)
    display_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="kpi_definitions")
    values: Mapped[list["PortfolioKPI"]] = relationship(back_populates="definition", cascade="all, delete-orphan")


class PortfolioKPI(Base):
    """Time-series KPI values for a portfolio.
    
    Stores actual vs forecast values with optional metadata for drill-down.
    The metadata field (JSONB) allows arbitrary industry-specific context.
    """
    
    __tablename__ = "portfolio_kpis"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    definition_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kpi_definitions.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[date] = mapped_column(Date, nullable=False)  # Month/quarter start date
    actual_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    forecast_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    previous_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))  # For trend calculation
    kpi_metadata: Mapped[dict | None] = mapped_column(JSON)  # Industry-specific drill-down data
    notes: Mapped[str | None] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    definition: Mapped["KPIDefinition"] = relationship(back_populates="values")
    
    __table_args__ = (
        # Unique constraint: one value per KPI per period
        {"sqlite_autoincrement": True},
    )


class ValueGap(Base):
    """AI-detected gap between project health (KVI) and business outcomes (KPI).
    
    The Resolution Engine detects discrepancies and suggests resource pivots.
    Types:
    - high_kvi_low_kpi: Project healthy but KPIs declining (execution vs impact mismatch)
    - low_kvi_high_kpi: Project struggling but KPIs strong (may need to deprioritize)
    - resource_mismatch: Resource allocation doesn't match KPI priorities
    """
    
    __tablename__ = "value_gaps"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    gap_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # info, warning, critical
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_action: Mapped[str] = mapped_column(Text, nullable=False)
    related_kpi_ids: Mapped[list | None] = mapped_column(JSON)  # Array of KPI definition IDs
    impact_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))  # 0-100 priority score
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="value_gaps")
    project: Mapped["Project"] = relationship(back_populates="value_gaps")
