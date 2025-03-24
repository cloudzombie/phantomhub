#!/bin/bash

echo "🚀 Starting PhantomHub Frontend Server..."

# Define the port
PORT=5173

# First kill any running frontend instances by finding the Vite dev server
echo "🔍 Checking for existing frontend processes..."
FRONTEND_PIDS=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}')
if [ -n "$FRONTEND_PIDS" ]; then
  echo "🛑 Found existing frontend processes. Terminating them..."
  for PID in $FRONTEND_PIDS; do
    echo "   Killing process $PID..."
    kill -9 $PID 2>/dev/null
  done
  echo "✅ Frontend processes terminated"
else
  echo "✅ No existing frontend processes found"
fi

# Then check if the port is in use by any other process
echo "🔍 Checking if port $PORT is already in use..."
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "🛑 Found process using port $PORT. Terminating process $PID..."
  kill -9 $PID
  echo "✅ Process terminated"
else
  echo "✅ Port $PORT is available"
fi

# Small delay to ensure ports are freed
sleep 1

# Start the frontend development server
echo "🚀 Starting frontend on port $PORT..."
npm run dev -- --port $PORT 