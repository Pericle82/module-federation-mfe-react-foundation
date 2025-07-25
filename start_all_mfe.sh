#!/bin/bash

# Start all MFEs in separate terminals (Linux/WSL/Unix)


# Start all MFEs and container in background, redirecting output to log files
( cd mfe_1 && npm start > ../mfe_1.log 2>&1 & )
( cd mfe_2 && npm start > ../mfe_2.log 2>&1 & )
( cd store_mfe && npm start > ../store_mfe.log 2>&1 & )
( cd service_mfe && npm start > ../service_mfe.log 2>&1 & )
( cd container && npm start > ../container.log 2>&1 & )

echo "All MFEs and container are starting in the background."
echo "Use 'ps aux | grep npm' to see running processes."
