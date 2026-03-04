#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting deployment..."

# Start Backend
echo "Starting Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup execution first."
    exit 1
fi
source venv/bin/activate
# check if command exists
if ! command -v uvicorn &> /dev/null; then
    echo "uvicorn could not be found. Installing dependencies..."
    pip install -r requirements.txt
fi

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing..."
    npm install
fi

npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo "Application running locally."
echo "Backend: http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop."

wait $BACKEND_PID $FRONTEND_PID
