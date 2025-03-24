#!/bin/bash

echo "🚀 Starting PhantomHub Backend Server..."

# Define the port
PORT=5001

# First kill any running backend instances
echo "🔍 Checking for existing backend processes..."
BACKEND_PIDS=$(ps aux | grep "node dist/server.js" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PIDS" ]; then
  echo "🛑 Found existing backend processes. Terminating them..."
  for PID in $BACKEND_PIDS; do
    echo "   Killing process $PID..."
    kill -9 $PID 2>/dev/null
  done
  echo "✅ Backend processes terminated"
else
  echo "✅ No existing backend processes found"
fi

# Also check for any nodemon processes for development
NODEMON_PIDS=$(ps aux | grep "nodemon --exec ts-node src/server.ts" | grep -v grep | awk '{print $2}')
if [ -n "$NODEMON_PIDS" ]; then
  echo "🛑 Found existing backend development processes. Terminating them..."
  for PID in $NODEMON_PIDS; do
    echo "   Killing process $PID..."
    kill -9 $PID 2>/dev/null
  done
  echo "✅ Backend development processes terminated"
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

# Build and start the server
echo "🏗️  Building project..."
npm run build

echo "🚀 Starting server on port $PORT..."
node dist/server.js

# This will only execute if the server crashes
echo "⚠️  Server stopped" 