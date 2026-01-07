"""User Assignment model - bridge table for hybrid tenancy."""

import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserAssignment(Base):
    """Bridge table linking users to organizations with allocation tracking."""
    
    __tablename__ = "user_assignments"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    allocation_percent: Mapped[int] = mapped_column(Integer, default=100)  # 0-100% of capacity allocated to this org
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="assignments")
    organization: Mapped["Organization"] = relationship(back_populates="user_assignments")
    
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_user_org_assignment"),
    )
