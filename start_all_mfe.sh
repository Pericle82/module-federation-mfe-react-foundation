#!/bin/bash

# 🚀 Start all MFEs and container with improved logging and error handling
# Usage: ./start_all_mfe.sh [--clean|--fast|--check]

set -e  # Exit on any error

CLEAN_INSTALL=false
FAST_START=false
CHECK_HEALTH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --clean)
      CLEAN_INSTALL=true
      shift
      ;;
    --fast)
      FAST_START=true
      shift
      ;;
    --check)
      CHECK_HEALTH=true
      shift
      ;;
    -h|--help)
      echo "🚀 MFE Startup Script"
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --clean     Clean install (remove node_modules)"
      echo "  --fast      Skip dependency installation"
      echo "  --check     Check service health after startup"
      echo "  -h, --help  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Starting Microfrontend Ecosystem${NC}"
echo -e "${YELLOW}Configuration: Clean=$CLEAN_INSTALL, Fast=$FAST_START, Check=$CHECK_HEALTH${NC}"

# Create logs directory
mkdir -p logs

# Services configuration
declare -a SERVICES=(
  "mock_json_server:4000"
  "service_mfe:3003" 
  "mfe_1:3001"
  "mfe_2:3002"
  "users_mfe:3005"
  "container:3000"
)

# Function to start a service
start_service() {
  local service=$1
  local port=$2
  local dir=${service%:*}
  
  echo -e "${BLUE}🔧 Starting $dir...${NC}"
  
  if [[ "$CLEAN_INSTALL" == true ]]; then
    echo -e "${YELLOW}   Cleaning $dir...${NC}"
    ( cd "$dir" && rm -rf node_modules package-lock.json )
  fi
  
  if [[ "$FAST_START" == false ]]; then
    echo -e "${YELLOW}   Installing dependencies for $dir...${NC}"
    ( cd "$dir" && npm install --silent )
  fi
  
  # Start service in background with logging
  ( cd "$dir" && npm start > "../logs/${dir}.log" 2>&1 & )
  
  # Store PID
  echo $! > "logs/${dir}.pid"
  echo -e "${GREEN}   ✅ $dir started (PID: $(cat logs/${dir}.pid))${NC}"
  
  # Brief wait for service to start
  sleep 2
}

# Clean previous logs and PIDs
rm -f logs/*.log logs/*.pid

if [[ "$CLEAN_INSTALL" == true ]]; then
  echo -e "${YELLOW}🧹 Cleaning npm cache...${NC}"
  npm cache clean --force
fi

# Start all services in optimal order
for service in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$service"
  start_service "$name" "$port"
done

echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "   🌐 Container:     http://localhost:3000"
echo -e "   📦 MFE_1:         http://localhost:3001"  
echo -e "   🔍 MFE_2:         http://localhost:3002"
echo -e "   🔧 Service_MFE:   http://localhost:3003"
echo -e "   👥 Users_MFE:     http://localhost:3005"
echo -e "   🗄️  JSON Server:   http://localhost:4000"

echo -e "${YELLOW}📝 Management Commands:${NC}"
echo -e "   Check status:  ./check_mfe_endpoints.sh"
echo -e "   Stop all:      ./stop_all_mfe.sh"
echo -e "   View logs:     tail -f logs/[service].log"

if [[ "$CHECK_HEALTH" == true ]]; then
  echo -e "${BLUE}🔍 Running health check...${NC}"
  sleep 5  # Wait for services to fully start
  ./check_mfe_endpoints.sh
fi
