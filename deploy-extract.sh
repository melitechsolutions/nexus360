#!/bin/bash
# Deployment extraction and restart script for Nexus360
set -e

DEPLOY_DIR="/home/melitec1/public_html/Nexus360"
BACKUP_DIR="$DEPLOY_DIR/backup-$(date +%Y%m%d_%H%M%S)"

echo "=========================================="
echo "Nexus360 Deployment Script"
echo "Started: $(date)"
echo "=========================================="

# Create backup
echo "Creating backup of current deployment..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/" || true
    cp "$DEPLOY_DIR/package.json" "$BACKUP_DIR/" 2>/dev/null || true
    echo "✓ Backup created at: $BACKUP_DIR"
fi

# Kill existing Node.js processes
echo "Stopping existing application processes..."
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
sleep 2

# Extract deployment package if it exists
if [ -f "$DEPLOY_DIR/deploy.zip" ]; then
    echo "Extracting deployment package..."
    cd "$DEPLOY_DIR"
    unzip -o deploy.zip -d . > /dev/null 2>&1
    echo "✓ Deployment package extracted"
    rm -f deploy.zip
fi

# Verify critical files
echo "Verifying deployment files..."
if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    echo "✗ ERROR: dist/index.js not found!"
    exit 1
fi
if [ ! -f "$DEPLOY_DIR/package.json" ]; then
    echo "✗ ERROR: package.json not found!"
    exit 1
fi
echo "✓ All critical files present"

# Install dependencies
echo "Installing dependencies..."
cd "$DEPLOY_DIR"
npm install --production 2>&1 | tail -10

# Start application
echo "Starting Node.js application..."
export NODE_ENV=production
nohup node "$DEPLOY_DIR/dist/index.js" > "$DEPLOY_DIR/app.log" 2>&1 &
APP_PID=$!
echo $APP_PID > "$DEPLOY_DIR/app.pid"

sleep 3

# Verify application started
if ps -p $APP_PID > /dev/null; then
    echo "✓ Application started successfully (PID: $APP_PID)"
else
    echo "✗ Application failed to start"
    echo "Last 50 lines of app.log:"
    tail -50 "$DEPLOY_DIR/app.log"
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "Application is running at: https://nexus360.melitechsolutions.co.ke"
echo "Check logs: $DEPLOY_DIR/app.log"
echo "Started: $(date)"
echo "=========================================="
