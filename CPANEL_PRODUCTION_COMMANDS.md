# Production Deployment Commands - cPanel Terminal

**Access:** https://melitechsolutions.co.ke:2083  
**User:** melitec1  
**Password:** G=P%C7Xem~LP

## Step 1: Navigate to Project Directory
```bash
cd ~/Nexus360
pwd  # Verify location
```

## Step 2: Reinstall Node Modules (Install New Dependencies)
```bash
npm install --production
```

## Step 3: Run Database Migration
```bash
# Run the migration SQL file
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 < drizzle/0017_add_document_template_isdefault.sql
```

## Step 4: Record Migration Completion
```bash
# Insert migration record into _migrations table
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "INSERT INTO _migrations (name) VALUES ('0017_add_document_template_isdefault.sql');"
```

## Step 5: Verify Migration Success
```bash
# Check if documentTemplates table has isDefault column
mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026$mT' melitec1_nexus360 -e "DESC documentTemplates;" | grep -i isDefault
```

## Expected Results:
- ✓ npm install completes successfully
- ✓ Migration runs without errors
- ✓ _migrations table records entry
- ✓ DESC documentTemplates shows: `isDefault | tinyint(1)`

## Troubleshooting:
- If migration fails: Check `drizzle/0017_add_document_template_isdefault.sql` exists
- If npm install fails: Check node version (should be 18+)
- If SQL fails: Verify database credentials and connection

---

## After Running These Commands:

1. Test the application at https://nexus360.melitechsolutions.co.ke
2. Check browser console (F12) for errors
3. Test notification popup behavior (navigate pages, verify popup shows only once)
4. Test document template rendering (Invoice/Estimate pages)

---

**Summary of Deployment:**
✅ Frontend built (dist/ 12.82 MB, 417 files)
✅ Deploy.zip created (5.88 MB)
✅ Files extracted to production /home/melitec1/Nexus360
⏳ Database migrations (pending - run above commands)
⏳ Node modules reinstall (pending - run above commands)
