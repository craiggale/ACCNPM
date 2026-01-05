"""Authentication router."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import (
    DbSession, 
    get_password_hash, 
    verify_password, 
    create_access_token,
    CurrentUser
)
from app.models import Organization, User
from app.schemas.user import UserCreate, UserRead, UserLogin, Token, RegistrationRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(request: RegistrationRequest, db: DbSession):
    """Register a new user and organization."""
    # Check if org slug exists
    result = await db.execute(select(Organization).where(Organization.slug == request.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already exists"
        )
    
    # Create organization
    org = Organization(name=request.org_name, slug=request.slug)
    db.add(org)
    await db.flush()
    
    # Create user
    user = User(
        org_id=org.id,
        email=request.email,
        name=request.name,
        role="admin",  # First user is admin
        password_hash=get_password_hash(request.password)
    )
    db.add(user)
    await db.flush()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(org.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserRead.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: DbSession):
    """Login and get access token."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(user.org_id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserRead.model_validate(user)
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser):
    """Get current user information."""
    return UserRead.model_validate(current_user)


@router.post("/users", response_model=UserRead)
async def create_user(user_data: UserCreate, current_user: CurrentUser, db: DbSession):
    """Create a new user in the current organization (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users"
        )
    
    # Check if email exists in org
    result = await db.execute(
        select(User).where(User.org_id == current_user.org_id, User.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists in organization"
        )
    
    user = User(
        org_id=current_user.org_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.flush()
    
    return UserRead.model_validate(user)
