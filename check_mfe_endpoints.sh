#!/bin/bash

# 🔍 Comprehensive health check for all MFE services
# Usage: ./check_mfe_endpoints.sh [--detailed|--json]

DETAILED=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --detailed)
      DETAILED=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    -h|--help)
      echo "🔍 MFE Health Check Script"
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --detailed  Show detailed response information"
      echo "  --json      Output results in JSON format"
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

# Service definitions
declare -A SERVICES=(
  ["Container"]="http://localhost:3000"
  ["MFE_1"]="http://localhost:3001/remoteEntry.js"
  ["MFE_2"]="http://localhost:3002/remoteEntry.js" 
  ["Service_MFE"]="http://localhost:3003/remoteEntry.js"
  ["Store_MFE"]="http://localhost:3004/remoteEntry.js"
  ["Users_MFE"]="http://localhost:3005/remoteEntry.js"
  ["JSON_Server_Items"]="http://localhost:4000/items"
  ["JSON_Server_Users"]="http://localhost:4000/users"
)

# Function to check endpoint
check_endpoint() {
  local name=$1
  local url=$2
  local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total};SIZE:%{size_download}" "$url" || echo "HTTPSTATUS:000;TIME:0;SIZE:0")
  
  local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]+;TIME:[0-9.]+;SIZE:[0-9]+$//')
  local status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
  local time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
  local size=$(echo "$response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
  
  # Status determination
  local status_icon=""
  local status_color=""
  local status_text=""
  
  if [[ "$status" == "200" ]]; then
    status_icon="✅"
    status_color="$GREEN"
    status_text="HEALTHY"
  elif [[ "$status" == "000" ]]; then
    status_icon="❌"
    status_color="$RED"
    status_text="UNREACHABLE"
  else
    status_icon="⚠️"
    status_color="$YELLOW" 
    status_text="WARNING"
  fi
  
  if [[ "$JSON_OUTPUT" == true ]]; then
    echo "{\"service\":\"$name\",\"url\":\"$url\",\"status\":$status,\"response_time\":$time,\"size\":$size,\"healthy\":$([ "$status" == "200" ] && echo "true" || echo "false")}"
  else
    printf "${status_color}%-20s %s %3s %s${NC}" "$name" "$status_icon" "$status" "$status_text"
    if [[ "$DETAILED" == true ]]; then
      printf " (${time}s, ${size}B)"
    fi
    echo
    
    if [[ "$DETAILED" == true && "$status" != "200" && "$status" != "000" ]]; then
      echo -e "${YELLOW}   URL: $url${NC}"
      if [[ ${#body} -gt 0 && ${#body} -lt 200 ]]; then
        echo -e "${YELLOW}   Response: ${body:0:100}${NC}"
      fi
    fi
  fi
}

if [[ "$JSON_OUTPUT" == true ]]; then
  echo "["
  first=true
else
  echo -e "${BLUE}🔍 MFE Health Check Report${NC}"
  echo -e "${BLUE}$(date)${NC}"
  echo ""
  printf "%-20s %s %s %s\n" "Service" "Status" "Code" "Health"
  echo "$(printf '%.0s-' {1..50})"
fi

# Check all services
for service in "${!SERVICES[@]}"; do
  if [[ "$JSON_OUTPUT" == true ]]; then
    [[ "$first" == false ]] && echo ","
    first=false
    check_endpoint "$service" "${SERVICES[$service]}"
  else
    check_endpoint "$service" "${SERVICES[$service]}"
  fi
done

if [[ "$JSON_OUTPUT" == true ]]; then
  echo ""
  echo "]"
else
  echo ""
  
  # Summary
  healthy_count=0
  total_count=${#SERVICES[@]}
  
  for service in "${!SERVICES[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICES[$service]}" 2>/dev/null || echo "000")
    [[ "$status" == "200" ]] && ((healthy_count++))
  done
  
  if [[ $healthy_count -eq $total_count ]]; then
    echo -e "${GREEN}🎉 All services are healthy! ($healthy_count/$total_count)${NC}"
  elif [[ $healthy_count -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Some services need attention ($healthy_count/$total_count healthy)${NC}"
  else
    echo -e "${RED}💥 All services are down! Please run './start_all_mfe.sh'${NC}"
  fi
  
  echo -e "${BLUE}📝 Tip: Use '--detailed' for more information${NC}"
fi
