#!/bin/bash

echo "Stopping all node and npm processes for MFEs and container..."

# Find all node processes running in the poc_mfe_store project directory
PIDS=$(ps aux | grep node | grep -v grep | grep poc_mfe_store | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "No running node processes found in poc_mfe_store."
else
  echo "Killing the following PIDs: $PIDS"
  kill $PIDS
  echo "All MFEs and container stopped."
fi
