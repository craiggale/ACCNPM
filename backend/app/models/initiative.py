"""Initiative models for strategic value tracking."""

import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Initiative(Base):
    """Initiative entity - strategic value drivers."""
    
    __tablename__ = "initiatives"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_goal: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="Planning")
    value_proposition: Mapped[str | None] = mapped_column(Text)
    change_type: Mapped[str | None] = mapped_column(String(100))
    start_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="initiatives")
    value_metrics: Mapped[list["InitiativeValueMetric"]] = relationship(back_populates="initiative", cascade="all, delete-orphan")
    task_links: Mapped[list["InitiativeTaskLink"]] = relationship(back_populates="initiative", cascade="all, delete-orphan")


class InitiativeValueMetric(Base):
    """Value metrics that an initiative can track."""
    
    __tablename__ = "initiative_value_metrics"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    initiative_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("initiatives.id", ondelete="CASCADE"), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Relationships
    initiative: Mapped["Initiative"] = relationship(back_populates="value_metrics")


class InitiativeTaskLink(Base):
    """Link between initiatives and impacted tasks."""
    
    __tablename__ = "initiative_task_links"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    initiative_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("initiatives.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    date_linked: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    initiative: Mapped["Initiative"] = relationship(back_populates="task_links")
    task: Mapped["Task"] = relationship(back_populates="initiative_links")
    values: Mapped[list["InitiativeTaskValue"]] = relationship(back_populates="link", cascade="all, delete-orphan")


class InitiativeTaskValue(Base):
    """Specific value captured by linking a task to an initiative."""
    
    __tablename__ = "initiative_task_values"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    link_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("initiative_task_links.id", ondelete="CASCADE"), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    
    # Relationships
    link: Mapped["InitiativeTaskLink"] = relationship(back_populates="values")
