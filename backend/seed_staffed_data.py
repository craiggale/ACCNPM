
import asyncio
import uuid
from datetime import date, datetime
from sqlalchemy import select
from app.database import engine, Base, async_session_maker
from app.models import Organization, User, UserAssignment, Project, Resource, Task
from app.dependencies import get_password_hash

async def seed():
    async with engine.begin() as conn:
        # Create all tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        # 1. Create Organization
        org_id = uuid.uuid4()
        org = Organization(
            id=org_id,
            name="Falcon Motors",
            slug="falcon-motors"
        )
        session.add(org)
        
        # 2. Create Admin User
        user_id = uuid.uuid4()
        admin = User(
            id=user_id,
            email="admin@falcon.com",
            name="Sarah Jenkins",
            global_role="standard",
            password_hash=get_password_hash("password123")
        )
        session.add(admin)
        await session.flush()
        
        # 3. Org Assignment
        assignment = UserAssignment(
            id=uuid.uuid4(),
            user_id=user_id,
            org_id=org_id,
            is_primary=True,
            allocation_percent=100
        )
        session.add(assignment)

        # 4. Create Projects
        # Project 1: Falcon GT Website (Medium, Website -> Dev: 0.5, Design: 0.3, QA: 0.1, Manager: 0.1)
        # Demand: 320h/mo total -> 160h Dev, 96h Design, 32h QA, 32h Manager
        p1_id = uuid.uuid4()
        p1 = Project(
            id=p1_id,
            org_id=org_id,
            name="Falcon GT Website",
            status="Active",
            health="On Track",
            pm_id=user_id,
            type="Website",
            scale="Medium",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 6, 30)
        )
        
        # Project 2: Eagle SUV Configurator (Large, Configurator -> Dev: 0.6, Design: 0.2, QA: 0.1, Manager: 0.1)
        # Demand: 640h/mo total -> 384h Dev, 128h Design, 64h QA, 64h Manager
        p2_id = uuid.uuid4()
        p2 = Project(
            id=p2_id,
            org_id=org_id,
            name="Eagle SUV Configurator",
            status="Active",
            health="At Risk",
            pm_id=user_id,
            type="Configurator",
            scale="Medium",
            start_date=date(2026, 2, 1),
            end_date=date(2026, 7, 31)
        )
        
        # Project 3: Phoenix EV Campaign (Medium, Asset Production -> Design: 0.8, Manager: 0.2)
        # Demand: 320h/mo total -> 256h Design, 64h Manager
        p3_id = uuid.uuid4()
        p3 = Project(
            id=p3_id,
            org_id=org_id,
            name="Phoenix EV Campaign",
            status="Planning",
            health="On Track",
            pm_id=user_id,
            type="Asset Production",
            scale="Medium",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 9, 30)
        )
        
        session.add_all([p1, p2, p3])

        # 5. Create Resources to staff Projects 1 and 3
        # Total Demand (P1 + P3):
        # Dev: 160h
        # Design: 96h (P1) + 256h (P3) = 352h
        # QA: 32h
        # Manager: 32h (P1) + 64h (P3) = 96h
        
        resources_data = [
            ("Sarah Jenkins", "Developer", "Website", 160),
            ("Emily Chen", "Developer", "Website", 160), # Extra capacity but Dev for P2 needs 384, so P2 still unstaffed for Dev
            ("James Wilson", "Designer", "Asset Production", 160),
            ("Noah Thompson", "Designer", "Asset Production", 160),
            ("Anna Garcia", "Designer", "Asset Production", 160), # Total 480 Design. Covers P1+P3 (352) and some of P2 (128).
            ("Mike Ross", "3D Artist", "Configurator", 160), # Normalized to Designer
            ("Tom Baker", "QA", "Asset Production", 160),
            ("Robert Taylor", "Manager", "Website", 160),
        ]
        
        resource_models = []
        for name, role, team, cap in resources_data:
            r = Resource(
                id=uuid.uuid4(),
                org_id=org_id,
                name=name,
                role=role,
                team=team,
                capacity=cap
            )
            resource_models.append(r)
        
        session.add_all(resource_models)
        
        # 6. Add Tasks for Projects (needed for UI breakdown)
        # We'll just add one main task per project for now or multiple if required by UI
        def create_task(p_id, title, role, estimate):
            return Task(
                id=uuid.uuid4(),
                org_id=org_id,
                project_id=p_id,
                title=title,
                status="Active",
                estimate=estimate,
                actual=0,
                is_market_specific=False,
                is_rework=False
            )
        
        # Tasks for P1
        session.add(create_task(p1_id, "Website Development", "Developer", 800))
        # Tasks for P3
        session.add(create_task(p3_id, "Campaign Assets", "Designer", 1200))
        
        await session.commit()
        print("Database seeded successfully with 3 projects and staffed resources for two of them.")

if __name__ == "__main__":
    asyncio.run(seed())
