#!/bin/bash

# Check all MFE remoteEntry.js endpoints and json-server

echo "Checking mfe_1 (http://localhost:3001/remoteEntry.js)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/remoteEntry.js

echo "Checking mfe_2 (http://localhost:3002/remoteEntry.js)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/remoteEntry.js

echo "Checking store_mfe (http://localhost:3003/remoteEntry.js)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/remoteEntry.js

echo "Checking service_mfe (http://localhost:3004/remoteEntry.js)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3004/remoteEntry.js

echo "Checking json-server (http://localhost:4000/items)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/items
