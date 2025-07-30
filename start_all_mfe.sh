#!/bin/bash

# Install dependencies and start all MFEs and container in background, redirecting output to log files
echo "Cleaning npm cache and installing dependencies..."
echo "Clearing npm cache..."
npm cache clean --force

echo "Installing mfe_1 dependencies..."
( cd mfe_1 && rm -rf node_modules package-lock.json && npm install && npm start > ../mfe_1.log 2>&1 & )

echo "Installing mfe_2 dependencies..."
( cd mfe_2 && rm -rf node_modules package-lock.json && npm install && npm start > ../mfe_2.log 2>&1 & )

echo "Installing store_mfe dependencies..."
( cd store_mfe && rm -rf node_modules package-lock.json && npm install && npm start > ../store_mfe.log 2>&1 & )

echo "Installing service_mfe dependencies..."
( cd service_mfe && rm -rf node_modules package-lock.json && npm install && npm start > ../service_mfe.log 2>&1 & )

echo "Installing users_mfe dependencies..."
( cd users_mfe && rm -rf node_modules package-lock.json && npm install && npm start > ../users_mfe.log 2>&1 & )

echo "Installing container dependencies..."
( cd container && rm -rf node_modules package-lock.json && npm install && npm start > ../container.log 2>&1 & )

echo "Installing mock_json_server dependencies..."
( cd mock_json_server && rm -rf node_modules package-lock.json && npm install && npm start > ../mock_json_server.log 2>&1 & )

echo "All MFEs, container, and mock server are starting in the background."
echo "Cache cleaned and dependencies have been freshly installed for all services."
echo "Use 'ps aux | grep npm' to see running processes."
echo "Check log files (*.log) for individual service outputs."
