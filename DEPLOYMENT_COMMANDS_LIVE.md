# Complete Deployment Guide: Localhost to Live Server
**Production URL:** https://nexus360.melitechsolutions.co.ke  
**Date:** April 22, 2026

---

## 📋 Deployment Overview

This guide provides all commands to deploy from localhost to the live server, including:
- Building frontend and backend
- Creating deployment package
- Uploading to server
- Running migrations
- Testing on live server

---

## 🚀 Step-by-Step Deployment Commands

### **PHASE 1: LOCAL BUILD** (Run on your machine)

#### Step 1.1: Navigate to project directory
```bash
cd E:\Nexus360
```

#### Step 1.2: Install/update dependencies (if needed)
```bash
npm install
```

#### Step 1.3: Build frontend with Vite
```bash
npx vite build 2>&1
```
**Expected output:** Build successful, ~1m 20s, exit code 0

#### Step 1.4: Build backend with esbuild
```bash
node esbuild.config.mjs 2>&1
```
**Expected output:** Backend compiled, exit code 0

#### Step 1.5: Verify build outputs
```bash
dir dist\index.html
dir server\dist\db.js
```

---

### **PHASE 2: CREATE DEPLOYMENT PACKAGE**

#### Step 2.1: Create deployment zip file
```bash
Remove-Item deploy.zip -ErrorAction SilentlyContinue
Compress-Archive -Path dist\* -DestinationPath deploy.zip -Force
```

#### Step 2.2: Verify zip file
```bash
Get-ChildItem deploy.zip | Select-Object FullName, @{Name="Size(MB)"; Expression={$_.Length/1MB}}
```
**Expected:** File size ~9-10 MB

---

### **PHASE 3: UPLOAD TO LIVE SERVER**

#### Step 3.1: Set deployment credentials
```bash
$env:DEPLOY_DOMAIN = "nexus360.melitechsolutions.co.ke"
$env:DEPLOY_USER = "melitec1"
$env:DEPLOY_PASS = "G=P%C7Xem~LP"
$zipPath = "E:\Nexus360\deploy.zip"
```

#### Step 3.2: Upload deployment package
```bash
curl -k --max-time 600 -u $env:DEPLOY_USER:$env:DEPLOY_PASS `
  -F "file=@$zipPath" `
  "https://$env:DEPLOY_DOMAIN/do_deploy.php"
```
**Expected:** 
- Upload progress shows 100%
- Server response shows "Unzip exit: 0"
- Server response shows "Restart exit: 0"
- curl exit code: 0

#### Step 3.3: Verify upload (Optional - check on server)
```bash
# On production server via SSH/cPanel Terminal:
ls -lah ~/Nexus360/dist/index.js
ls -lah ~/Nexus360/dist/index.html
```

---

### **PHASE 4: RUN DATABASE MIGRATIONS** (Run on production server)

#### Step 4.1: Connect to cPanel Terminal
1. Go to: https://melitechsolutions.co.ke:2083 (cPanel)
2. Open Terminal

#### Step 4.2: Navigate to project
```bash
cd ~/Nexus360
```

#### Step 4.3: Check for pending migrations
```bash
ls -lah drizzle/*.sql | head -20
```

#### Step 4.4: Run migrations
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 < drizzle/0017_add_document_template_isdefault.sql
```

#### Step 4.5: Verify migration was applied
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "DESC documentTemplates;" | grep isDefault
```
**Expected output:** Shows `isDefault | tinyint(1)`

#### Step 4.6: Record migration in tracking table
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e \
  "INSERT INTO _migrations (name) VALUES ('0017_add_document_template_isdefault.sql');"
```

#### Step 4.7: Verify migration was recorded
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e \
  "SELECT * FROM _migrations WHERE name='0017_add_document_template_isdefault.sql';"
```

---

### **PHASE 5: VERIFY LIVE SERVER DEPLOYMENT**

#### Step 5.1: Check if application is running
```bash
# On production server:
ps aux | grep node | grep -v grep
```

#### Step 5.2: Check application logs (if available)
```bash
# On production server:
tail -50 ~/Nexus360/logs/application.log
# or
journalctl -u nexus360 -n 50
```

#### Step 5.3: Test via curl (from localhost)
```bash
curl -s -I https://nexus360.melitechsolutions.co.ke | head -5
```
**Expected:** HTTP/2 200 or similar success code

---

### **PHASE 6: BROWSER TESTING** (Final Validation)

#### Step 6.1: Open live site
```
https://nexus360.melitechsolutions.co.ke
```

#### Step 6.2: Test notification popup behavior
1. Log in to the application
2. Navigate between different pages (Dashboard, Invoices, Clients, etc.)
3. Verify notification popups:
   - ✅ Popups appear only once per notification
   - ✅ Popups do NOT re-appear on page navigation
   - ✅ Notifications persist in counter badge
   - ✅ Counter badge disappears when marked as read

#### Step 6.3: Test core functionality
- Create a new invoice → verify print with template works
- Create an estimate → verify PDF export works
- View notifications → verify dropdown displays correctly
- Switch pages → verify no duplicate popups appear

#### Step 6.4: Check browser console
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Verify no JavaScript errors (red X icons)
4. Verify localStorage contains `notification_popup_shown_ids`

---

## 🔧 Troubleshooting Commands

### If upload fails:

**Check curl connectivity:**
```bash
curl -k -I https://nexus360.melitechsolutions.co.ke
```

**Check credentials:**
```bash
# Verify in .env.deploy file:
Get-Content .env.deploy
```

**Upload with verbose output:**
```bash
$env:DEPLOY_DOMAIN = "nexus360.melitechsolutions.co.ke"
$env:DEPLOY_USER = "melitec1"
$env:DEPLOY_PASS = "G=P%C7Xem~LP"
$zipPath = "E:\Nexus360\deploy.zip"

curl -v -k --max-time 600 -u $env:DEPLOY_USER:$env:DEPLOY_PASS `
  -F "file=@$zipPath" `
  "https://$env:DEPLOY_DOMAIN/do_deploy.php" 2>&1 | Select-Object -Last 50
```

### If migrations fail:

**Check database connection:**
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "SELECT 1;"
```

**Check if migration already exists:**
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e \
  "SELECT * FROM _migrations WHERE name='0017_add_document_template_isdefault.sql';"
```

**Check documentTemplates table structure:**
```bash
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "DESC documentTemplates;"
```

### If application doesn't start:

**Check if process is running:**
```bash
# On production server:
ps aux | grep node
```

**Restart application manually:**
```bash
# On production server:
bash ~/Nexus360/do_restart.sh
```

**Check application port:**
```bash
# On production server (if accessible):
netstat -tlnp | grep node
lsof -i :3000
```

---

## 📊 Deployment Checklist

Before deploying:
- [ ] All code changes committed
- [ ] Frontend builds successfully (exit 0)
- [ ] Backend builds successfully (exit 0)
- [ ] No TypeScript/linting errors
- [ ] New migrations created (if database changes made)
- [ ] .env.deploy file has correct credentials
- [ ] Production domain is nexus360.melitechsolutions.co.ke

After deploying:
- [ ] Deployment upload completes with exit 0
- [ ] Migrations applied successfully
- [ ] Live site loads (https://nexus360.melitechsolutions.co.ke)
- [ ] No console errors in browser (F12)
- [ ] Core features work (notifications, invoices, templates)
- [ ] Notification popups only show once per notification
- [ ] Notifications persist in counter until marked as read

---

## 🎯 Quick Deploy Script (One Command)

If all steps above have been done before, use this complete deployment script:

```powershell
# Set working directory
cd E:\Nexus360

# Build
Write-Host "=== BUILDING FRONTEND ===" -ForegroundColor Green
npx vite build 2>&1 | Select-Object -Last 5
$viteExit = $LASTEXITCODE

Write-Host "=== BUILDING BACKEND ===" -ForegroundColor Green
node esbuild.config.mjs 2>&1 | Select-Object -Last 3
$esbuildExit = $LASTEXITCODE

if ($viteExit -ne 0 -or $esbuildExit -ne 0) {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    exit 1
}

# Package
Write-Host "=== CREATING DEPLOYMENT PACKAGE ===" -ForegroundColor Green
Remove-Item deploy.zip -ErrorAction SilentlyContinue
Compress-Archive -Path dist\* -DestinationPath deploy.zip -Force
$zipSize = (Get-Item deploy.zip).Length / 1MB
Write-Host "Zip created: $([Math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan

# Deploy
Write-Host "=== DEPLOYING TO PRODUCTION ===" -ForegroundColor Green
$env:DEPLOY_DOMAIN = "nexus360.melitechsolutions.co.ke"
$env:DEPLOY_USER = "melitec1"
$env:DEPLOY_PASS = "G=P%C7Xem~LP"
$zipPath = "E:\Nexus360\deploy.zip"

Write-Host "Uploading to $env:DEPLOY_DOMAIN..." -ForegroundColor Cyan
$output = curl -k --max-time 600 -u $env:DEPLOY_USER:$env:DEPLOY_PASS `
  -F "file=@$zipPath" `
  "https://$env:DEPLOY_DOMAIN/do_deploy.php" 2>&1

Write-Host $output
$curlExit = $LASTEXITCODE

if ($curlExit -eq 0) {
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Live site: https://nexus360.melitechsolutions.co.ke" -ForegroundColor Cyan
} else {
    Write-Host "❌ DEPLOYMENT FAILED!" -ForegroundColor Red
    exit 1
}
```

---

## 📞 Support Information

**Production Server Details:**
- Domain: nexus360.melitechsolutions.co.ke
- cPanel: https://melitechsolutions.co.ke:2083
- Database: melitec1_nexus360
- User: melitec1
- SSH/Terminal: Available via cPanel

**Emergency Rollback:**
If deployment causes issues, previous version can be restored from backup or redeployed from previous zip file.

---

**Last Updated:** April 22, 2026  
**Status:** ✅ Ready for production deployment
