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

// Optionally, you can also use pgrep to find and kill processes
# pgrep -f "npm start" will find all processes that match "npm start"
# Uncomment the line below to use pgrep instead of ps aux
# pgrep -f "npm start" | xargs kill