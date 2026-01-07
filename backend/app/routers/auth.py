"""Authentication router for hybrid tenancy model."""

import uuid
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import (
    DbSession, 
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_pending_auth_token,
    decode_pending_auth_token,
    CurrentUser,
    CurrentSessionOrgId
)
from app.models import Organization, User, UserAssignment
from app.schemas.user import (
    UserCreate, UserRead, UserLogin, Token, RegistrationRequest,
    OrgAssignment, PendingLoginResponse, OrgSelectionRequest, UserWithOrgContext
)

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
    
    # Check if email already exists globally
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create organization
    org = Organization(name=request.org_name, slug=request.slug)
    db.add(org)
    await db.flush()
    
    # Create user (global entity)
    user = User(
        email=request.email,
        name=request.name,
        global_role="standard",
        password_hash=get_password_hash(request.password)
    )
    db.add(user)
    await db.flush()
    
    # Create assignment (user -> org, as primary admin)
    assignment = UserAssignment(
        user_id=user.id,
        org_id=org.id,
        is_primary=True,
        allocation_percent=100
    )
    db.add(assignment)
    await db.flush()
    
    # Create access token with org context
    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(org.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserWithOrgContext(
            id=user.id,
            email=user.email,
            name=user.name,
            global_role=user.global_role,
            default_role=user.default_role,
            capacity_hours=user.capacity_hours,
            cost_rate=user.cost_rate,
            billable_rate=user.billable_rate,
            is_active=user.is_active,
            created_at=user.created_at,
            current_org_id=org.id,
            current_org_name=org.name,
            org_role="admin"
        )
    )


@router.post("/login")
async def login(credentials: UserLogin, db: DbSession):
    """
    Phase 1 of login: Authenticate credentials.
    
    If user has one org: Returns full Token.
    If user has multiple orgs: Returns PendingLoginResponse for org selection.
    """
    # Find user with assignments
    result = await db.execute(
        select(User)
        .options(selectinload(User.assignments).selectinload(UserAssignment.organization))
        .where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    if not user.assignments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to any organization"
        )
    
    # Single org: return full token immediately
    if len(user.assignments) == 1:
        assignment = user.assignments[0]
        org = assignment.organization
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(org.id), "email": user.email}
        )
        return Token(
            access_token=access_token,
            user=UserWithOrgContext(
                id=user.id,
                email=user.email,
                name=user.name,
                global_role=user.global_role,
                default_role=user.default_role,
                capacity_hours=user.capacity_hours,
                cost_rate=user.cost_rate,
                billable_rate=user.billable_rate,
                is_active=user.is_active,
                created_at=user.created_at,
                current_org_id=org.id,
                current_org_name=org.name,
                org_role="admin" if assignment.is_primary else "member"
            )
        )
    
    # Multiple orgs: return pending response for org selection
    pending_token = create_pending_auth_token(user.id, user.email)
    orgs = [
        OrgAssignment(
            id=a.organization.id,
            name=a.organization.name,
            slug=a.organization.slug,
            is_primary=a.is_primary
        )
        for a in user.assignments
    ]
    
    return PendingLoginResponse(
        auth_token=pending_token,
        requires_org_selection=True,
        organizations=orgs
    )


@router.post("/select-organization", response_model=Token)
async def select_organization(request: OrgSelectionRequest, db: DbSession):
    """
    Phase 2 of login: Select organization to complete login.
    """
    # Decode pending token
    payload = decode_pending_auth_token(request.auth_token)
    user_id = uuid.UUID(payload["sub"])
    
    # Get user with assignments
    result = await db.execute(
        select(User)
        .options(selectinload(User.assignments).selectinload(UserAssignment.organization))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify user is assigned to selected org
    assignment = next((a for a in user.assignments if a.org_id == request.org_id), None)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to this organization"
        )
    
    org = assignment.organization
    
    # Create full access token with org context
    access_token = create_access_token(
        data={"sub": str(user.id), "org_id": str(org.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserWithOrgContext(
            id=user.id,
            email=user.email,
            name=user.name,
            global_role=user.global_role,
            default_role=user.default_role,
            capacity_hours=user.capacity_hours,
            cost_rate=user.cost_rate,
            billable_rate=user.billable_rate,
            is_active=user.is_active,
            created_at=user.created_at,
            current_org_id=org.id,
            current_org_name=org.name,
            org_role="admin" if assignment.is_primary else "member"
        )
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser):
    """Get current user information."""
    return UserRead.model_validate(current_user)


@router.get("/my-organizations")
async def get_my_organizations(current_user: CurrentUser, db: DbSession):
    """Get all organizations the current user is assigned to."""
    result = await db.execute(
        select(UserAssignment)
        .options(selectinload(UserAssignment.organization))
        .where(UserAssignment.user_id == current_user.id)
    )
    assignments = result.scalars().all()
    
    return [
        OrgAssignment(
            id=a.organization.id,
            name=a.organization.name,
            slug=a.organization.slug,
            is_primary=a.is_primary
        )
        for a in assignments
    ]

