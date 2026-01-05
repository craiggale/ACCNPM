"""Template models for tasks, gateways, teams, and markets."""

import uuid
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskTemplate(Base):
    """Task template for auto-generating tasks when creating projects."""
    
    __tablename__ = "task_templates"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    team: Mapped[str] = mapped_column(String(100), nullable=False)
    scale: Mapped[str] = mapped_column(String(50), nullable=False)  # Small, Medium, Large
    task_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    estimate: Mapped[int | None] = mapped_column(Integer)
    gateway_dependency: Mapped[str | None] = mapped_column(String(255))


class GatewayTemplate(Base):
    """Gateway template for auto-generating gateways when creating launches."""
    
    __tablename__ = "gateway_templates"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    team: Mapped[str] = mapped_column(String(100), nullable=False)
    scale: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    offset_weeks: Mapped[int] = mapped_column(Integer, default=0)


class Team(Base):
    """Team/department within an organization."""
    
    __tablename__ = "teams"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="teams")


class Market(Base):
    """Market/region for project launches."""
    
    __tablename__ = "markets"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="markets")
