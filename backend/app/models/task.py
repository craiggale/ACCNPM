"""Task models including market-specific status."""

import uuid
from sqlalchemy import String, Date, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Task(Base):
    """Task entity - work items within projects."""
    
    __tablename__ = "tasks"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Planning")
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("resources.id"))
    estimate: Mapped[int | None] = mapped_column(Integer)  # hours
    actual: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[str | None] = mapped_column(Date)
    end_date: Mapped[str | None] = mapped_column(Date)
    predecessor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"))
    is_market_specific: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rework: Mapped[bool] = mapped_column(Boolean, default=False)
    gateway_dependency: Mapped[str | None] = mapped_column(String(255))
    gateway_source: Mapped[str | None] = mapped_column(String(255))
    linked_initiative_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("initiatives.id"))
    value_saved: Mapped[int | None] = mapped_column(Integer)
    
    # Relationships
    project: Mapped["Project"] = relationship(back_populates="tasks")
    assignee: Mapped["Resource"] = relationship(back_populates="assigned_tasks")
    predecessor: Mapped["Task"] = relationship(remote_side=[id])
    market_statuses: Mapped[list["TaskMarketStatus"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    initiative_links: Mapped[list["InitiativeTaskLink"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskMarketStatus(Base):
    """Per-market status for market-specific tasks."""
    
    __tablename__ = "task_market_status"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    market: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Planning")
    
    # Relationships
    task: Mapped["Task"] = relationship(back_populates="market_statuses")
    
    __table_args__ = (
        # Unique market per task
        {"sqlite_autoincrement": True},
    )
