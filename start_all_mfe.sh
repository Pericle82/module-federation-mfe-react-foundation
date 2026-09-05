#!/bin/bash

# Start all MFEs and container
# Usage: ./start_all_mfe.sh [--clean]
#
# See COMPREHENSIVE_GUIDE.md § 9. Logs go to logs/<service>.log and the PID of
# each service to logs/<service>.pid, which is what stop_all_mfe.sh reads.

set -e

CLEAN_INSTALL=false

if [[ "$1" == "--clean" ]]; then
  CLEAN_INSTALL=true
fi

echo "Starting Microfrontend services..."

# Create logs directory
mkdir -p logs

# Startup order: backend first, then service_mfe (the others are useless
# without it), then the UI remotes, container last. The order is a convenience,
# not a requirement: useMicrofrontend retries a failed remote 5 times every 2s,
# so a remote whose dev server is still booting is picked up later (§ 3.3).
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
  # NB: il & deve stare nello stesso shell in cui leggiamo $!, altrimenti
  # $! resta vuoto e i file .pid risultano inutilizzabili per stop_all_mfe.sh
  ( cd "$service" && exec npm start ) > "logs/${service}.log" 2>&1 &
  echo $! > "logs/${service}.pid"
  # Give webpack-dev-server a moment before starting the next one; without it
  # seven parallel builds thrash the machine on the first (uncached) run.
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
