# ⚡ QUICK DEPLOYMENT REFERENCE
**Production URL:** https://nexus360.melitechsolutions.co.ke

---

## 🚀 Fast Track: 5-Minute Deployment

### **STEP 1: Build** (Local Machine)
```bash
cd E:\Nexus360
npx vite build && node esbuild.config.mjs
```

### **STEP 2: Package** (Local Machine)
```bash
Remove-Item deploy.zip -ErrorAction SilentlyContinue
Compress-Archive -Path dist\* -DestinationPath deploy.zip -Force
```

### **STEP 3: Upload & Deploy** (Local Machine)
```bash
$env:DEPLOY_DOMAIN = "nexus360.melitechsolutions.co.ke"
$env:DEPLOY_USER = "melitec1"
$env:DEPLOY_PASS = "G=P%C7Xem~LP"
$zipPath = "E:\Nexus360\deploy.zip"

curl -k --max-time 600 -u $env:DEPLOY_USER:$env:DEPLOY_PASS `
  -F "file=@$zipPath" `
  "https://$env:DEPLOY_DOMAIN/do_deploy.php"
```

### **STEP 4: Run Migrations** (On Production Server via cPanel Terminal)
```bash
cd ~/Nexus360

# Apply new migrations
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 < drizzle/0017_add_document_template_isdefault.sql

# Record migration
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e \
  "INSERT INTO _migrations (name) VALUES ('0017_add_document_template_isdefault.sql');"

# Verify
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "DESC documentTemplates;" | grep isDefault
```

### **STEP 5: Test** (Browser)
1. Open: https://nexus360.melitechsolutions.co.ke
2. Navigate pages → Verify notification popups show only once
3. Open DevTools (F12) → Check for JavaScript errors
4. Check localStorage for `notification_popup_shown_ids`

---

## 🔍 Verification Commands

| Task | Command |
|------|---------|
| **Vite build OK?** | `npx vite build 2>&1 \| Select-Object -Last 3` |
| **Esbuild OK?** | `node esbuild.config.mjs 2>&1 \| Select-Object -Last 3` |
| **Zip exists?** | `Get-Item deploy.zip` |
| **App running?** | `curl -I https://nexus360.melitechsolutions.co.ke` |
| **DB migrated?** | `mysql -u melitec1_nexus360 -p'...' melitec1_nexus360 -e "SHOW COLUMNS FROM documentTemplates LIKE 'isDefault';"` |

---

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check credentials: `Get-Content .env.deploy` |
| Curl timeout | Increase timeout: `--max-time 900` (15 min) |
| Build fails | Run `npm install` first, then rebuild |
| App doesn't load | Check cPanel Terminal: `ps aux \| grep node` |
| Migrations fail | Verify DB: `mysql -u melitec1_nexus360 -p'...' melitec1_nexus360 -e "SELECT 1;"` |

---

## 📋 Checklist

```
Pre-Deploy:
☐ All changes committed
☐ npm install run
☐ No linting errors
☐ Test locally

Deploy:
☐ Vite build passes (exit 0)
☐ Esbuild passes (exit 0)
☐ deploy.zip created
☐ Upload succeeds (curl exit 0)

Post-Deploy:
☐ Site loads at nexus360.melitechsolutions.co.ke
☐ Migrations applied
☐ No console errors (F12)
☐ Notification behavior fixed
☐ Core features work
```

---

**Time to deploy:** ~5-10 minutes  
**Rollback time:** ~2-3 minutes (redeploy from previous zip)
