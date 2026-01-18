#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

echo "---------------------------------------------------"
echo "Starting Fresh Corridor Ecosystem..."
echo "---------------------------------------------------"

# 1. Start Agri Service (Port 8001)
echo "[1/2] Starting Agri-Logistics Service (Port 8001)..."
cd "agri"
if [ -f "../fresh_corridor_backend/venv/bin/python" ]; then
    ../fresh_corridor_backend/venv/bin/python manage.py runserver 8001 &
else
    echo "Error: Virtual environment not found for Agri service."
fi

# 2. Start Main Backend (Port 8000)
echo "[2/2] Starting Main Backend Service (Port 8000)..."
cd "../fresh_corridor_backend"
if [ -f "./venv/bin/python" ]; then
    ./venv/bin/python manage.py runserver &
else
    echo "Error: Virtual environment not found for Main backend."
fi

echo "---------------------------------------------------"
echo "Services are running in background."
echo "Agri API: http://127.0.0.1:8001"
echo "Main API: http://127.0.0.1:8000"
echo "---------------------------------------------------"
echo "To view the Urban Nexus, open fresh_corridor_web/index.html in your browser."
echo "Press Ctrl+C to stop all services."

# Wait for any key to exit
wait
