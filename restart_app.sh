#!/bin/bash
# Comprehensive restart script for Nexus360 Node.js application
echo "=== Nexus360 Application Restart Script ==="
echo "Started at: $(date)"

# Change to application directory
cd /home/melitec1/public_html/Nexus360
echo "Working directory: $(pwd)"

# Kill any existing Node.js processes for this application
echo "Checking for existing Node.js processes..."
NODE_PROCESSES=$(ps aux | grep -E "node.*server|node.*app" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PROCESSES" ]; then
    echo "Found Node.js processes: $NODE_PROCESSES"
    echo "Terminating existing processes..."
    kill -9 $NODE_PROCESSES 2>/dev/null
    sleep 3
    echo "Processes terminated."
else
    echo "No existing Node.js processes found."
fi

# Check if PM2 is available and try to restart via PM2
if command -v pm2 &> /dev/null; then
    echo "PM2 found. Checking for PM2 processes..."
    PM2_PROCESSES=$(pm2 list | grep -E "nexus|app" | wc -l)
    if [ "$PM2_PROCESSES" -gt 0 ]; then
        echo "Restarting via PM2..."
        pm2 restart all
        pm2 save
        echo "PM2 restart completed."
        exit 0
    fi
fi

# Check if the application has a start script
if [ -f "package.json" ]; then
    echo "Found package.json. Checking for start script..."
    START_SCRIPT=$(grep -o '"start": "[^"]*"' package.json | cut -d'"' -f4)
    if [ -n "$START_SCRIPT" ]; then
        echo "Starting application with: npm start"
        nohup npm start > app_restart.log 2>&1 &
        echo $! > app.pid
        sleep 3
        if ps -p $(cat app.pid) > /dev/null; then
            echo "Application started successfully. PID: $(cat app.pid)"
        else
            echo "Failed to start application. Check app_restart.log for details."
        fi
    else
        echo "No start script found in package.json"
    fi
else
    echo "No package.json found"
fi

# Alternative: Try to start with node directly
if [ -f "server/index.js" ] || [ -f "server/index.ts" ]; then
    echo "Attempting to start server directly..."
    if [ -f "server/index.js" ]; then
        nohup node server/index.js > server_restart.log 2>&1 &
    elif [ -f "server/index.ts" ]; then
        # Check if ts-node is available
        if command -v ts-node &> /dev/null; then
            nohup ts-node server/index.ts > server_restart.log 2>&1 &
        else
            echo "ts-node not available for TypeScript files"
        fi
    fi
    echo $! > server.pid
    sleep 3
    if ps -p $(cat server.pid) > /dev/null; then
        echo "Server started successfully. PID: $(cat server.pid)"
    else
        echo "Failed to start server. Check server_restart.log for details."
    fi
fi

echo "Restart script completed at: $(date)"
echo "=== End of Restart Script ==="