"""User model for authentication and global resources."""

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """User entity - global resource that can be assigned to multiple organizations."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    
    # Global role for system-wide permissions
    global_role: Mapped[str] = mapped_column(String(50), default="standard")  # 'global_resource_manager' or 'standard'
    
    # Resource properties (global, not org-specific)
    default_role: Mapped[str | None] = mapped_column(String(100))  # Developer, Designer, etc.
    capacity_hours: Mapped[int] = mapped_column(default=160)  # hours/month
    cost_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    billable_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    assignments: Mapped[list["UserAssignment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    managed_projects: Mapped[list["Project"]] = relationship(back_populates="pm")
    
    def get_primary_org_id(self) -> uuid.UUID | None:
        """Get the user's primary organization ID."""
        for assignment in self.assignments:
            if assignment.is_primary:
                return assignment.org_id
        return self.assignments[0].org_id if self.assignments else None
    
    def is_assigned_to_org(self, org_id: uuid.UUID) -> bool:
        """Check if user is assigned to a specific organization."""
        return any(a.org_id == org_id for a in self.assignments)
    
    def get_total_allocation(self) -> int:
        """Get total allocation percentage across all orgs."""
        return sum(a.allocation_percent for a in self.assignments)

