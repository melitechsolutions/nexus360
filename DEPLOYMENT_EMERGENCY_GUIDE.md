# Nexus360 Application - Emergency Deployment Guide

## Problem Diagnosis
**Status**: HTTP 503 Service Unavailable  
**Root Cause**: Missing `dist/index.js` (server bundle) in deployment  
**Solution**: Complete rebuild with proper server bundling

---

## Quick Status Check
```bash
# Check if Node.js process is running
ps aux | grep "node.*index.js"

# Check application logs
tail -100 /home/melitec1/public_html/Nexus360/app.log
```

---

## Deployment Steps

### Step 1: Upload Deployment Package
The deployment package is ready at: `e:\melitech_crm\deploy.zip` (8.30 MB)

**File Contents:**
- `dist/` - Complete frontend + backend compiled code
  - `dist/index.js` - Node.js server bundle (12.96 MB)
  - `dist/assets/` - React frontend JavaScript files
  - `dist/index.html` - HTML entry point
  - `dist/logo.png` - Logo file
- `package.json` - NPM dependencies configuration
- `.env.production` - Production environment variables

**Upload Methods:**
1. **Via cPanel File Manager** (Recommended)
   - Navigate to `/home/melitec1/public_html/Nexus360/`
   - Click "Upload"
   - Select `deploy.zip`
   - Check "Overwrite existing files"
   - Click upload

2. **Via FTP:**
   ```bash
   ftp ftp.melitechsolutions.co.ke
   # Login: melitec1
   # Password: [Your hosting password]
   cd public_html/Nexus360
   put deploy.zip
   quit
   ```

3. **Via cPanel Terminal:**
   ```bash
   cd /home/melitec1/public_html/Nexus360
   # If using scp/rsync from local machine
   # (Requires SSH or file transfer)
   ```

### Step 2: Extract Deployment Package
```bash
cd /home/melitec1/public_html/Nexus360
unzip -o deploy.zip
rm deploy.zip  # Clean up
```

### Step 3: Install Dependencies
```bash
cd /home/melitec1/public_html/Nexus360
npm install --production
```

### Step 4: Stop Existing Processes
```bash
# Kill any existing Node.js processes
pkill -f "node.*index.js"
pkill -f "npm.*start"
sleep 2
```

### Step 5: Start Application
```bash
cd /home/melitec1/public_html/Nexus360
export NODE_ENV=production
nohup node dist/index.js > app.log 2>&1 &
```

Or use PM2 if available:
```bash
pm2 start dist/index.js --name nexus360 --env production
pm2 save
```

### Step 6: Verify Application Started
```bash
# Check if process is running
ps aux | grep "node.*index.js"

# Check logs for errors
tail -50 app.log

# Check port is listening
netstat -tuln | grep 3000  # or your configured port
```

### Step 7: Test Application
```bash
# Local test
curl -I http://localhost:3000

# Remote test
curl -I https://nexus360.melitechsolutions.co.ke
```

---

## Complete Automated Deployment Script

Save as `/home/melitec1/public_html/Nexus360/deploy.sh`:

```bash
#!/bin/bash
set -e

DEPLOY_DIR="/home/melitec1/public_html/Nexus360"
BACKUP_DIR="$DEPLOY_DIR/backup-$(date +%Y%m%d_%H%M%S)"

echo "=========================================="
echo "Nexus360 Deployment Script"
echo "Started: $(date)"
echo "=========================================="

# Create backup
echo "Creating backup..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/" 2>/dev/null || true
    echo "✓ Backup created: $BACKUP_DIR"
fi

# Kill existing processes
echo "Stopping existing processes..."
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
sleep 2

# Extract deployment if present
if [ -f "$DEPLOY_DIR/deploy.zip" ]; then
    echo "Extracting deployment package..."
    cd "$DEPLOY_DIR"
    unzip -o deploy.zip > /dev/null
    rm -f deploy.zip
    echo "✓ Deployment extracted"
fi

# Verify files
if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    echo "✗ ERROR: dist/index.js not found!"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
cd "$DEPLOY_DIR"
npm install --production 2>&1 | grep -E "added|up to date|warn"

# Start application
echo "Starting application..."
export NODE_ENV=production
nohup node dist/index.js > app.log 2>&1 &
PID=$!
echo $PID > app.pid

sleep 3

if ps -p $PID > /dev/null; then
    echo "✓ Application started (PID: $PID)"
    echo "✓ Available at: https://nexus360.melitechsolutions.co.ke"
else
    echo "✗ Failed to start application"
    echo "Logs:"
    tail -30 app.log
    exit 1
fi

echo "=========================================="
echo "Deployment Complete: $(date)"
echo "=========================================="
```

Run it:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Troubleshooting

### Application Still Returns 503
1. Check if process is running: `ps aux | grep node`
2. Check logs: `tail -100 app.log`
3. Verify port is listening: `netstat -tuln | grep :3000`
4. Check database connectivity in logs

### "Module not found" errors
```bash
# Reinstall dependencies
cd /home/melitec1/public_html/Nexus360
rm -rf node_modules package-lock.json
npm install --production
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Memory issues during build
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=2048"
npm install
```

---

## Key Files and Locations

| File | Location | Purpose |
|------|----------|---------|
| Server bundle | `dist/index.js` | Node.js application entry point |
| Frontend | `dist/index.html` | React SPA HTML file |
| Frontend assets | `dist/assets/` | JavaScript bundles and CSS |
| Dependencies | `node_modules/` | NPM packages (generated by npm install) |
| Logs | `app.log` | Application runtime logs |
| PID file | `app.pid` | Process ID for monitoring |
| Configuration | `.env.production` | Environment variables |

---

## Next Steps After Recovery

1. **Monitor application**: Set up process monitoring (PM2, systemd)
2. **Setup SSL**: Ensure HTTPS is configured
3. **Database health**: Verify MySQL connectivity and performance
4. **Logs monitoring**: Set up log aggregation or alerts
5. **Performance**: Monitor response times and implement caching

---

## Build Information

- **Build Tool**: Vite + esbuild
- **Frontend**: React 18, TypeScript, 3574 modules
- **Backend**: Node.js (ESM), Express, tRPC
- **Database**: MySQL/MariaDB + Drizzle ORM
- **Total Size**: 8.30 MB (compressed for deployment)
- **Build Time**: ~57 seconds

---

## Support Contact
If issues persist, contact your hosting provider with:
- This deployment guide
- The `app.log` file contents
- Output of `ps aux | grep node`
- Output of `npm list --production` (top 20 packages)

---

**Last Updated**: 2026-04-19  
**Deployment Package**: `deploy.zip` (8.30 MB)  
**Status**: Ready for deployment
