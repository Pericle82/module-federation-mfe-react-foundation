#!/bin/bash

# Release ports 3000-3004 by killing any process using them

for PORT in 3000 3001 3002 3003 3004
 do
  PID=$(lsof -ti tcp:$PORT)
  if [ -n "$PID" ]; then
    echo "Killing process $PID on port $PORT"
    kill $PID
  else
    echo "No process found on port $PORT"
  fi
done

echo "All specified ports are now free."
