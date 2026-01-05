"""Project models including launch details, gateways, and versions."""

import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Project(Base):
    """Project entity - core of project management."""
    
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Planning")
    health: Mapped[str] = mapped_column(String(50), default="On Track")
    pm_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str | None] = mapped_column(String(100))  # Website, Configurator, Asset Production
    scale: Mapped[str | None] = mapped_column(String(50))  # Small, Medium, Large
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    original_end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="projects")
    pm: Mapped["User"] = relationship(back_populates="managed_projects")
    launch_details: Mapped[list["LaunchDetail"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class LaunchDetail(Base):
    """Launch details per market for a project."""
    
    __tablename__ = "launch_details"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    market: Mapped[str] = mapped_column(String(100), nullable=False)
    goal_live: Mapped[date | None] = mapped_column(Date)
    
    # Relationships
    project: Mapped["Project"] = relationship(back_populates="launch_details")
    input_gateways: Mapped[list["InputGateway"]] = relationship(back_populates="launch_detail", cascade="all, delete-orphan")
    
    __table_args__ = (
        # Unique market per project
        {"sqlite_autoincrement": True},
    )


class InputGateway(Base):
    """Input gateways for launch details."""
    
    __tablename__ = "input_gateways"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    launch_detail_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("launch_details.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending")
    expected_date: Mapped[date | None] = mapped_column(Date)
    received_date: Mapped[date | None] = mapped_column(Date)
    
    # Relationships
    launch_detail: Mapped["LaunchDetail"] = relationship(back_populates="input_gateways")
    versions: Mapped[list["GatewayVersion"]] = relationship(back_populates="gateway", cascade="all, delete-orphan")


class GatewayVersion(Base):
    """Version history for gateway updates."""
    
    __tablename__ = "gateway_versions"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    gateway_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("input_gateways.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str | None] = mapped_column(String(50))
    date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    is_on_time: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    gateway: Mapped["InputGateway"] = relationship(back_populates="versions")
