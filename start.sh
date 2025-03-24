#!/bin/bash

echo "🚀 Starting PhantomHub Application..."

# Check the operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  echo "📱 Detected macOS"
  echo "⚙️ Starting backend server..."
  osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run reliable-start"'
  
  echo "🖥️ Starting frontend server..."
  osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run reliable-start"'
  
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  echo "🐧 Detected Linux"
  echo "⚙️ Starting backend server..."
  gnome-terminal -- bash -c "cd \"$(pwd)/backend\" && npm run reliable-start; exec bash"
  
  echo "🖥️ Starting frontend server..."
  gnome-terminal -- bash -c "cd \"$(pwd)/frontend\" && npm run reliable-start; exec bash"
  
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
  # Windows Git Bash or similar
  echo "🪟 Detected Windows"
  echo "⚙️ Starting backend server..."
  start cmd /k "cd \"$(pwd)/backend\" && npm run reliable-start"
  
  echo "🖥️ Starting frontend server..."
  start cmd /k "cd \"$(pwd)/frontend\" && npm run reliable-start"
  
else
  echo "❓ Unknown operating system: $OSTYPE"
  echo "Please start the servers manually:"
  echo "1. Backend: cd backend && npm run reliable-start"
  echo "2. Frontend: cd frontend && npm run reliable-start"
  exit 1
fi

echo "✅ Startup scripts launched. Check the new terminal windows for application output."
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "⚙️ Backend API will be available at: http://localhost:5001" 