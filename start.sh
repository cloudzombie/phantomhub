#!/bin/bash

# Terminal color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║            ${GREEN}PhantomHub - O.MG Mission Control${BLUE}              ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect the operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "${GREEN}Starting services on macOS...${NC}"
    
    # Open two new Terminal windows, one for backend and one for frontend
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/backend\" && npm run reliable-start"'
    sleep 2
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run reliable-start"'
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux with GNOME Terminal
    echo -e "${GREEN}Starting services on Linux...${NC}"
    
    # Check if gnome-terminal is available
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd \"$(pwd)/backend\" && npm run reliable-start; exec bash"
        gnome-terminal -- bash -c "cd \"$(pwd)/frontend\" && npm run reliable-start; exec bash"
    else
        echo -e "${YELLOW}Could not detect terminal type. Please start services manually:${NC}"
        echo "1. Backend: cd backend && npm run reliable-start"
        echo "2. Frontend: cd frontend && npm run reliable-start"
    fi
    
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows with Git Bash or similar
    echo -e "${GREEN}Starting services on Windows...${NC}"
    
    start cmd /k "cd \"$(pwd)/backend\" && npm run reliable-start"
    start cmd /k "cd \"$(pwd)/frontend\" && npm run reliable-start"
    
else
    # Unknown OS
    echo -e "${YELLOW}Your operating system is not directly supported by this script.${NC}"
    echo -e "${YELLOW}Please start the services manually:${NC}"
    echo "1. Backend: cd backend && npm run reliable-start"
    echo "2. Frontend: cd frontend && npm run reliable-start"
fi

echo ""
echo -e "${GREEN}=== Service Information ===${NC}"
echo -e "${BLUE}🌐 Frontend will be available at: ${YELLOW}http://localhost:5173${NC}"
echo -e "${BLUE}⚙️ Backend API will be available at: ${YELLOW}http://localhost:5001${NC}"
echo ""
echo -e "${GREEN}=== WebSerial Support Information ===${NC}"
echo -e "${YELLOW}For USB device connectivity, please use Chrome or Edge browsers.${NC}"
echo -e "${YELLOW}Firefox and Safari do not currently support the WebSerial API.${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to exit this script (services will continue running in their terminals)${NC}"

# Keep the main script running
while true; do
  sleep 1
done 