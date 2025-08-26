#!/bin/bash

# 🛑 Stop all MFE services with improved cleanup and verification
# Usage: ./stop_all_mfe.sh [--force]

FORCE_KILL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_KILL=true
      shift
      ;;
    -h|--help)
      echo "🛑 MFE Stop Script"
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --force     Force kill all processes (SIGKILL)"
      echo "  -h, --help  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🛑 Stopping Microfrontend Ecosystem${NC}"

# Function to stop service by PID file
stop_service_by_pid() {
  local service=$1
  local pid_file="logs/${service}.pid"
  
  if [[ -f "$pid_file" ]]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}🔄 Stopping $service (PID: $pid)...${NC}"
      if [[ "$FORCE_KILL" == true ]]; then
        kill -9 "$pid" 2>/dev/null
      else
        kill "$pid" 2>/dev/null
      fi
      
      # Wait for graceful shutdown
      local count=0
      while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
        sleep 1
        ((count++))
      done
      
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}   ⚠️  Force killing $service...${NC}"
        kill -9 "$pid" 2>/dev/null
      fi
      
      echo -e "${GREEN}   ✅ $service stopped${NC}"
    else
      echo -e "${YELLOW}   ℹ️  $service was not running${NC}"
    fi
    rm -f "$pid_file"
  fi
}

# Stop services by PID files (more reliable)
if [[ -d "logs" ]]; then
  echo -e "${BLUE}🔍 Stopping services by PID files...${NC}"
  for pid_file in logs/*.pid; do
    if [[ -f "$pid_file" ]]; then
      service=$(basename "$pid_file" .pid)
      stop_service_by_pid "$service"
    fi
  done
fi

# Fallback: Find and kill remaining npm processes
echo -e "${BLUE}🔍 Checking for remaining npm processes...${NC}"
PIDS=$(ps aux | grep -E 'npm start|webpack.*serve' | grep -v grep | awk '{print $2}')

if [[ -n "$PIDS" ]]; then
  echo -e "${YELLOW}🔄 Found remaining processes: $PIDS${NC}"
  
  if [[ "$FORCE_KILL" == true ]]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null
  else
    echo "$PIDS" | xargs kill 2>/dev/null
    sleep 2
    # Force kill if still running
    REMAINING=$(ps aux | grep -E 'npm start|webpack.*serve' | grep -v grep | awk '{print $2}')
    if [[ -n "$REMAINING" ]]; then
      echo -e "${RED}🔨 Force killing remaining processes...${NC}"
      echo "$REMAINING" | xargs kill -9 2>/dev/null
    fi
  fi
else
  echo -e "${GREEN}ℹ️  No npm processes found running${NC}"
fi

# Clean up ports (kill any process using our ports)
PORTS=(3000 3001 3002 3003 3005 4000)
for port in "${PORTS[@]}"; do
  PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    echo -e "${YELLOW}🔄 Killing process on port $port (PID: $PID)...${NC}"
    kill -9 "$PID" 2>/dev/null || true
  fi
done

# Clean up log files and PIDs
echo -e "${BLUE}🧹 Cleaning up logs and PID files...${NC}"
rm -f logs/*.pid
# Optionally keep logs for debugging
# rm -f logs/*.log

echo -e "${GREEN}🎉 All MFE services stopped successfully!${NC}"
echo -e "${BLUE}📝 Tip: Use './start_all_mfe.sh --fast' for quick restart${NC}"