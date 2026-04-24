# SIMPLE DEPLOYMENT GUIDE

## Overview
This guide walks you through deploying the Nexus360 application using cPanel File Manager (GUI) - no SSH or terminal knowledge required!

**Time Required:** 5-10 minutes  
**Files Needed:** `deploy-v2.zip` on your local computer

---

## STEP 1: Login to cPanel

1. Open your web browser
2. Go to: `https://melitechsolutions.co.ke:2083`
3. **Username:** melitec1
4. **Password:** *(your cPanel password)*
5. Click **Login**

**Expected Result:** You should see the cPanel Dashboard with various tools

---

## STEP 2: Open File Manager

1. In the cPanel Dashboard, find and click **File Manager**
   - Look for the folder icon with text "File Manager"

**Expected Result:** A new window opens showing folder structure

---

## STEP 3: Navigate to Upload Directory

1. In File Manager, you should see a folder tree on the left
2. Click on **public_html**
3. Then click on **Nexus360** folder
4. You should now see the current application files (index.js, package.json, etc.)

**Expected Result:** You are now in `/home/melitec1/public_html/Nexus360/`

---

## STEP 4: Upload the Deployment File

1. Click the **Upload** button (usually at the top of File Manager)
2. A dialog will appear asking you to select files
3. Click **Select File** or **Choose File**
4. Find and select **deploy-v2.zip** from your computer
5. The upload will start automatically
6. Wait until you see **Upload Complete** or **100%**

**Expected Result:** The file `deploy-v2.zip` appears in the Nexus360 folder

---

## STEP 5: Extract the ZIP File

1. In File Manager, **Right-click** on `deploy-v2.zip`
2. Click **Extract** from the context menu
   - Alternative: Select the file and look for an **Extract** button at the top
3. A dialog may ask where to extract - select the current directory (Nexus360)
4. Click **Extract** to confirm

**Expected Result:** 
- The ZIP file extracts
- You should see new/updated files in the Nexus360 folder
- The `deploy-v2.zip` file remains there (you can delete it later if desired)

---

## STEP 6: Restart the Application

Now you need to restart the Node.js application. There are two options:

### Option A: Use cPanel Terminal (Easiest)

1. In cPanel Dashboard, click **Terminal** (or **Web Shell**)
2. A terminal window opens
3. Paste this command and press Enter:

```bash
cd /home/melitec1/public_html/Nexus360 && npm start
```

**Wait 5-10 seconds** for the application to start. You should see output like:
```
> nexus360@1.0.0 start
> node index.js
Server running on port 3000
```

### Option B: Use SSH (If you have SSH client)

1. Open your SSH client (PuTTY, Terminal, etc.)
2. Connect to: `melitechsolutions.co.ke`
3. Username: `melitec1`
4. Paste and execute:

```bash
cd /home/melitec1/public_html/Nexus360 && npm start
```

**Expected Result:** Application starts with a message like "Server running on port 3000"

---

## STEP 7: Verify the Application is Running

### Quick Check - HTTP Response

In your web browser, visit:
```
http://melitechsolutions.co.ke/Nexus360/
```

**Expected Results:**
- **HTTP 200:** Browser shows the application interface (✓ Success!)
- **Connection Error:** Application didn't start - go back to Step 6
- **Blank Page:** Files uploaded but not running - restart in Step 6

### Advanced Check - Terminal Command

If you have SSH/Terminal access, paste this command to verify:

```bash
curl -I http://localhost:3000
```

**Expected Result:**
```
HTTP/1.1 200 OK
Content-Type: text/html
```

---

## TROUBLESHOOTING

### Issue: "File upload failed"
- **Solution:** File is too large or connection dropped. Try again or contact hosting support.

### Issue: "npm command not found" or "node command not found"
- **Solution:** Node.js may not be installed. Contact hosting support.

### Issue: Application shows HTTP 500 error
- **Solution:** 
  1. Check if all files extracted properly (go back to Step 5)
  2. Verify no files are missing from the Nexus360 folder
  3. Restart the application (Step 6)

### Issue: Application won't start (still getting connection error after 10 seconds)
- **Solution:**
  1. Check if port 3000 is open on the server
  2. Verify environment variables are set (.env file)
  3. Contact hosting support with the terminal error message

---

## Rollback (If something goes wrong)

If the new version has issues, you can revert:

1. Go back to Step 2-3 (File Manager → Nexus360)
2. Look for a **backups** folder
3. Find the file `index.js.TIMESTAMP` (newest one)
4. Right-click → **Copy**
5. Navigate to parent folder, **Paste**
6. Rename from `index.js.TIMESTAMP` to `index.js`
7. Replace the broken version when prompted
8. Restart the application

---

## Summary Checklist

- [ ] Logged into cPanel
- [ ] Opened File Manager and navigated to Nexus360
- [ ] Uploaded deploy-v2.zip
- [ ] Extracted the ZIP file
- [ ] Restarted the application
- [ ] Verified HTTP 200 response
- [ ] Application is live!

---

**Questions?** Contact your hosting provider or development team.

