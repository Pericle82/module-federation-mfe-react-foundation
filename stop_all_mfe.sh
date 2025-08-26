#!/bin/bash

# Stop all MFE services
# Usage: ./stop_all_mfe.sh [--force]

FORCE_KILL=false
if [[ "$1" == "--force" ]]; then
  FORCE_KILL=true
fi

echo "Stopping Microfrontend services..."

# Stop services by PID files
if [[ -d "logs" ]]; then
  for pid_file in logs/*.pid; do
    if [[ -f "$pid_file" ]]; then
      service=$(basename "$pid_file" .pid)
      pid=$(cat "$pid_file")
      
      if kill -0 "$pid" 2>/dev/null; then
        echo "Stopping $service (PID: $pid)..."
        if [[ "$FORCE_KILL" == true ]]; then
          kill -9 "$pid" 2>/dev/null
        else
          kill "$pid" 2>/dev/null
        fi
      fi
      rm -f "$pid_file"
    fi
  done
fi

# Kill remaining npm processes
PIDS=$(ps aux | grep -E 'npm start|webpack.*serve' | grep -v grep | awk '{print $2}')
if [[ -n "$PIDS" ]]; then
  echo "Killing remaining npm processes..."
  echo "$PIDS" | xargs kill -9 2>/dev/null || true
fi

# Clean up ports
PORTS=(3000 3001 3002 3003 3005 4000)
for port in "${PORTS[@]}"; do
  PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    kill -9 "$PID" 2>/dev/null || true
  fi
done

echo "All MFE services stopped."