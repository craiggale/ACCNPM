"""WebSocket connection manager for real-time updates."""

import uuid
import json
from typing import Any
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections, scoped by organization."""
    
    def __init__(self):
        # Map of org_id -> list of active connections
        self.active_connections: dict[uuid.UUID, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, org_id: uuid.UUID):
        """Accept a new WebSocket connection and register it to an org."""
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = []
        self.active_connections[org_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, org_id: uuid.UUID):
        """Remove a WebSocket connection."""
        if org_id in self.active_connections:
            if websocket in self.active_connections[org_id]:
                self.active_connections[org_id].remove(websocket)
            # Clean up empty org lists
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
    
    async def broadcast_to_org(self, org_id: uuid.UUID, message: dict[str, Any]):
        """Broadcast a message to all connections in an organization."""
        if org_id not in self.active_connections:
            return
        
        message_str = json.dumps(message, default=str)
        disconnected = []
        
        for connection in self.active_connections[org_id]:
            try:
                await connection.send_text(message_str)
            except Exception:
                disconnected.append(connection)
        
        # Clean up failed connections
        for conn in disconnected:
            self.disconnect(conn, org_id)
    
    async def send_personal_message(self, websocket: WebSocket, message: dict[str, Any]):
        """Send a message to a specific connection."""
        await websocket.send_text(json.dumps(message, default=str))


# Global connection manager instance
manager = ConnectionManager()


# Event types for real-time updates
class EventType:
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED"
    PROJECT_DELETED = "PROJECT_DELETED"
    TASK_CREATED = "TASK_CREATED"
    TASK_UPDATED = "TASK_UPDATED"
    TASK_DELETED = "TASK_DELETED"
    RESOURCE_CREATED = "RESOURCE_CREATED"
    RESOURCE_UPDATED = "RESOURCE_UPDATED"
    RESOURCE_DELETED = "RESOURCE_DELETED"
    INITIATIVE_CREATED = "INITIATIVE_CREATED"
    INITIATIVE_UPDATED = "INITIATIVE_UPDATED"
    INITIATIVE_DELETED = "INITIATIVE_DELETED"
    GATEWAY_UPDATED = "GATEWAY_UPDATED"
    TASKS_AUTO_ASSIGNED = "TASKS_AUTO_ASSIGNED"
