"""FastAPI main application entry point."""

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError

from app.config import get_settings
from app.database import init_db
from app.routers import auth, projects, tasks, resources, initiatives, kvi
from app.websocket import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    # Startup
    await init_db()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title=settings.app_name,
    description="ACCN-PM Backend API - Multi-tenant Project Management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(initiatives.router, prefix="/api")
app.include_router(kvi.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    """
    WebSocket endpoint for real-time updates.
    
    Connect with: ws://host/ws?token=<jwt_token>
    """
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # Validate token and get org_id
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        org_id_str = payload.get("org_id")
        if not org_id_str:
            await websocket.close(code=4001, reason="Invalid token")
            return
        org_id = uuid.UUID(org_id_str)
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    # Accept connection and register with org
    await manager.connect(websocket, org_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message(websocket, {
            "type": "CONNECTED",
            "payload": {"org_id": str(org_id), "message": "Connected to ACCN-PM real-time updates"}
        })
        
        # Keep connection alive and listen for ping/pong
        while True:
            data = await websocket.receive_text()
            # Handle ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
