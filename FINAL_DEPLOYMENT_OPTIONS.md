# Nexus360 Production Deployment - Final Options

## Issue
The production server's `dist/index.js` file was built with incorrect esbuild configuration (mysql2 not marked as external).  This causes "Cannot find package 'mysql2'" error on startup.

## Solution Files Ready
- **Local build**: `e:\melitech_crm\dist\index.js` (11.1 MB) - CORRECT VERSION
- **Deployment package**: `e:\melitech_crm\deploy-v2.zip` (7.84 MB) - Contains corrected dist/ directory
- **Server location**: `/home/melitec1/public_html/Nexus360/dist/index.js` - Needs to be replaced

## Option 1: Manual Upload via cPanel File Manager (RECOMMENDED - EASIEST)
1. Download `deploy-v2.zip` from local machine
2. Log in to cPanel: https://melitechsolutions.co.ke:2083
3. Go to File Manager → Navigate to /home/melitec1/public_html/Nexus360
4. Upload `deploy-v2.zip` to this directory
5. Extract the zip file (overwrite existing files)
6. Server will automatically recognize the new files

## Option 2: Manual File Upload via FTP
If FTP access is available:
1. Connect via FTP client to: melitechsolutions.co.ke
2. Navigate to: /home/melitec1/public_html/Nexus360/dist/
3. Replace the following files from `e:\melitech_crm\dist\`:
   - **index.js** (critical - the bundled server)
   - **index.html** (frontend entry)
   - All contents of **assets/** directory

## Option 3: Automated Terminal Deployment (If SCP/SSH available)
If SSH access on port 22 (or alternative port) is available:
```bash
scp -r e:\melitech_crm\dist/* melitec1@melitechsolutions.co.ke:/home/melitec1/public_html/Nexus360/dist/
```

## Option 4: Base64 Chunk Transfer (Last Resort)
If other options unavailable:
- Chunks created: `chunk-001.txt` through `chunk-028.txt` (28 files × 100KB each)
- Use `deploy-dist-index.sh` script for reconstruction instructions
- Contact support if you need detailed step-by-step instructions

## Verification After Deployment

Once the new `dist/index.js` is in place:

### Terminal Command to Verify
```bash
# Kill old process
killall node 2>/dev/null

# Wait and start
sleep 2

# Source environment and start server
source /home/melitec1/nodevenv/Nexus360/22/bin/activate
cd /home/melitec1/public_html/Nexus360
nohup node dist/index.js > app.log 2>&1 &

# Check status
sleep 3
tail -20 app.log
ps aux | grep "node.*dist/index" | grep -v grep
```

### Expected Success Output
- No "Cannot find package" errors
- Process should stay running
- Log should show database connection messages
- Port 3000 should be listening (or whatever port configured)

### Test Application
```bash
# From server terminal
curl -I http://localhost:3000
# Expected: HTTP 200 OK (or similar success response)

# From browser
https://nexus360.melitechsolutions.co.ke
# Expected: CRM application loads (not HTTP 503)
```

## Critical Files Changed
- **esbuild.config.mjs**: Added external modules declaration
- **dist/index.js**: Rebuilt with correct configuration
- **All dist/assets/*.js**: Updated JavaScript chunks
- **dist/index.html**: Updated entry point

## Next Steps
1. **Choose Option 1 or 2 above** (easiest methods)
2. Upload the files to production
3. Execute verification commands from terminal
4. Test application endpoint
5. Monitor app.log for any issues

## Support
If deployment fails:
- Check app.log for specific error messages
- Verify node_modules are installed: `npm list --production | head -20`
- Check MySQL connectivity: `echo "SHOW DATABASES;" | mysql -u user -p`
- Verify file ownership: `ls -la /home/melitec1/public_html/Nexus360/dist/index.js`

## Timeline
- Build completed: April 19, 2026, 10:31 UTC
- Deployment package created: April 19, 2026
- Ready for immediate production deployment
