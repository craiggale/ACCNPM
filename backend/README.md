# ACCN-PM Backend

A FastAPI backend for the ACCN-PM project management application.

## Prerequisites

- Python 3.11+
- PostgreSQL database (e.g., Neon)

## Setup

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials and secret key
```

4. **Run the server:**
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT secret key | Required |
| `CORS_ORIGINS` | Allowed origins (JSON array) | `["http://localhost:5173"]` |
| `DEBUG` | Enable debug mode | `false` |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new org + user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project
- `PATCH /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `PATCH /api/projects/{id}/gateways/{gw_id}` - Update gateway (triggers rework)

### Tasks
- `GET /api/tasks` - List tasks (optional `?project_id=`)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/auto-assign` - Auto-assign tasks

### Resources
- Full CRUD at `/api/resources`

### Initiatives
- Full CRUD at `/api/initiatives`
- `POST /api/initiatives/{id}/link-task` - Link task
- `DELETE /api/initiatives/{id}/unlink-task/{task_id}` - Unlink task

### KVI
- `GET /api/kvi/portfolio-health` - Portfolio health summary
- `GET /api/kvi/initiative-value` - Initiative value totals
- `GET /api/kvi/schedule-variance` - Schedule variance by project

## WebSocket

Connect to `/ws?token=<jwt_token>` for real-time updates.

Events:
- `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELETED`
- `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`
- `RESOURCE_CREATED`, `RESOURCE_UPDATED`, `RESOURCE_DELETED`
- `INITIATIVE_CREATED`, `INITIATIVE_UPDATED`, `INITIATIVE_DELETED`
- `GATEWAY_UPDATED`, `TASKS_AUTO_ASSIGNED`
