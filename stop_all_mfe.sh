#!/bin/bash

# Stop all running npm processes for MFEs and container

echo "Stopping all npm processes for MFEs and container..."

# Find and kill all npm processes (child processes of bash)
PIDS=$(ps aux | grep 'npm start' | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "No running npm start processes found."
else
  echo "Killing the following PIDs: $PIDS"
  kill $PIDS
  echo "All MFEs and container stopped."
fi
