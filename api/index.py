import sys
import os

# Add the backend directory to sys.path so 'app' module can be found
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# This shim allows Vercel to treat the entire FastAPI app as a single function
# served at /api/*
