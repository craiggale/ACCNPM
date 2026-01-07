"""Authentication and multi-tenancy dependencies for hybrid tenancy."""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.models.user_assignment import UserAssignment
from app.schemas.user import TokenData

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_pending_auth_token(user_id: uuid.UUID, email: str) -> str:
    """Create a short-lived token for org selection (phase 2 of login)."""
    data = {"sub": str(user_id), "email": email, "pending": True}
    expire = datetime.utcnow() + timedelta(minutes=5)  # 5 min validity
    data["exp"] = expire
    return jwt.encode(data, settings.secret_key, algorithm=settings.algorithm)


def decode_pending_auth_token(token: str) -> dict:
    """Decode a pending auth token for org selection."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if not payload.get("pending"):
            raise HTTPException(status_code=400, detail="Invalid pending token")
        return payload
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired auth token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        org_id: str = payload.get("org_id")
        if user_id is None or org_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Load user with assignments
    result = await db.execute(
        select(User)
        .options(selectinload(User.assignments))
        .where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    # Verify user is assigned to the session org
    if not user.is_assigned_to_org(uuid.UUID(org_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to this organization"
        )
    
    return user


async def get_session_org_id(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> uuid.UUID:
    """Extract the session-scoped org_id directly from JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        org_id: str = payload.get("org_id")
        if org_id is None:
            raise HTTPException(status_code=401, detail="No org_id in token")
        return uuid.UUID(org_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_global_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Require the user to have global_resource_manager role."""
    if current_user.global_role != "global_resource_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires Global Resource Manager privileges"
        )
    return current_user


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentSessionOrgId = Annotated[uuid.UUID, Depends(get_session_org_id)]
GlobalAdmin = Annotated[User, Depends(require_global_admin)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

