#!/bin/bash

# Check MFE service availability

SERVICES=(
  "Container:http://localhost:3000"
  "MFE_1:http://localhost:3001/remoteEntry.js"
  "MFE_2:http://localhost:3002/remoteEntry.js" 
  "Service_MFE:http://localhost:3003/remoteEntry.js"
  "Users_MFE:http://localhost:3005/remoteEntry.js"
  "JSON_Server:http://localhost:4000/items"
)

echo "MFE Service Health Check"
echo "========================"

healthy_count=0
total_count=${#SERVICES[@]}

for service_entry in "${SERVICES[@]}"; do
  IFS=':' read -r name url <<< "$service_entry"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [[ "$status" == "200" ]]; then
    echo "$name: OK"
    ((healthy_count++))
  else
    echo "$name: FAILED ($status)"
  fi
done

echo ""
if [[ $healthy_count -eq $total_count ]]; then
  echo "All services healthy ($healthy_count/$total_count)"
elif [[ $healthy_count -gt 0 ]]; then
  echo "Some services down ($healthy_count/$total_count healthy)"
else
  echo "All services down! Run './start_all_mfe.sh'"
fi
