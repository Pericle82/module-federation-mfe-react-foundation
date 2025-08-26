#!/bin/bash

# Start all MFEs and container
# Usage: ./start_all_mfe.sh [--clean]

set -e

CLEAN_INSTALL=false

if [[ "$1" == "--clean" ]]; then
  CLEAN_INSTALL=true
fi

echo "Starting Microfrontend services..."

# Create logs directory
mkdir -p logs

# Services in startup order
SERVICES=("mock_json_server" "service_mfe" "mfe_1" "mfe_2" "users_mfe" "notifications_mfe" "container")

# Clean previous logs and PIDs
rm -f logs/*.log logs/*.pid

for service in "${SERVICES[@]}"; do
  echo "Starting $service..."
  
  if [[ "$CLEAN_INSTALL" == true ]]; then
    ( cd "$service" && rm -rf node_modules package-lock.json )
  fi
  
  ( cd "$service" && npm install --silent )
  ( cd "$service" && npm start > "../logs/${service}.log" 2>&1 & )
  echo $! > "logs/${service}.pid"
  sleep 2
done

echo "All services started successfully!"
echo ""
echo "Service URLs:"
echo "  Container:        http://localhost:3000"
echo "  MFE_1:            http://localhost:3001"
echo "  MFE_2:            http://localhost:3002"
echo "  Service_MFE:      http://localhost:3003"
echo "  Users_MFE:        http://localhost:3004"
echo "  Notifications:    http://localhost:3005"
echo "  JSON Server:      http://localhost:4000"
