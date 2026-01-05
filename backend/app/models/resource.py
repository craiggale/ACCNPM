"""Resource model for team members with capacity."""

import uuid
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Resource(Base):
    """Resource entity - team members with capacity and rates."""
    
    __tablename__ = "resources"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(100))
    team: Mapped[str | None] = mapped_column(String(100))
    capacity: Mapped[int] = mapped_column(Integer, default=160)  # hours/month
    leave_hours: Mapped[int] = mapped_column(Integer, default=0)
    cost_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    billable_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    
    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="resources")
    assigned_tasks: Mapped[list["Task"]] = relationship(back_populates="assignee")
