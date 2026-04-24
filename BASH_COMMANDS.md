# EXACT BASH COMMANDS FOR DEPLOYMENT

## Step 1: On Local Machine (e:\melitech_crm)
## Run the deploy.sh script to generate the deployment command:
bash ./deploy.sh "./dist/index.js" "/home/melitec1/public_html/Nexus360"

## Step 2: Copy the entire output from "bash << 'DEPLOY_SCRIPT'" to "DEPLOY_SCRIPT"

## Step 3: On Production Server (SSH connection)
## Paste the copied command directly into the production terminal

---

## DETAILED BASH COMMANDS FOR PRODUCTION DEPLOYMENT:

# After running bash deploy.sh, you will receive a command like this:
# (The $ENCODED variable will contain your gzipped + base64 encoded index.js)

bash << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e
TARGET_DIR="/home/melitec1/public_html/Nexus360"
INDEX_FILE="${TARGET_DIR}/index.js"
BACKUP_DIR="${TARGET_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo '[DEPLOY] Creating backup directory...'
mkdir -p "${BACKUP_DIR}"

echo '[DEPLOY] Backing up old index.js...'
if [ -f "${INDEX_FILE}" ]; then
  cp "${INDEX_FILE}" "${BACKUP_DIR}/index.js.${TIMESTAMP}"
  BACKUP_SIZE=$(stat -c%s "${BACKUP_DIR}/index.js.${TIMESTAMP}" 2>/dev/null || stat -f%z "${BACKUP_DIR}/index.js.${TIMESTAMP}" 2>/dev/null)
  echo "  Backup saved: index.js.${TIMESTAMP} (${BACKUP_SIZE} bytes)"
fi

echo '[DEPLOY] Decoding and decompressing new index.js...'
# The encoded variable will contain the base64+gzipped content
echo "[BASE64_ENCODED_CONTENT_HERE]" | base64 -d | gunzip -c > "${INDEX_FILE}.tmp"

echo '[DEPLOY] Verifying integrity...'
NEW_SIZE=$(stat -c%s "${INDEX_FILE}.tmp" 2>/dev/null || stat -f%z "${INDEX_FILE}.tmp" 2>/dev/null)

if [ "$NEW_SIZE" -ne "11139434" ]; then
  echo '[ERROR] File size mismatch! Expected 11139434, got '$NEW_SIZE
  rm "${INDEX_FILE}.tmp"
  exit 1
fi

echo '[DEPLOY] Moving new file into place...'
mv "${INDEX_FILE}.tmp" "${INDEX_FILE}"

echo '[DEPLOY] Verification:'
echo "  File: ${INDEX_FILE}"
echo "  Size: $(stat -c%s "${INDEX_FILE}" 2>/dev/null || stat -f%z "${INDEX_FILE}" 2>/dev/null) bytes"
echo "  Modified: $(stat -c%y "${INDEX_FILE}" 2>/dev/null || stat -f '%Sm' "${INDEX_FILE}" 2>/dev/null)"
echo "  Backup: ${BACKUP_DIR}/index.js.${TIMESTAMP}"

echo '[DEPLOY] ✓ Deployment successful!'
DEPLOY_SCRIPT

---

## KEY BASH COMMANDS BREAKDOWN:

# 1. Compress and encode on local machine:
gzip -c "./dist/index.js" | base64 -w 0

# 2. Decode and decompress on production:
echo "[BASE64_CONTENT]" | base64 -d | gunzip -c > /home/melitec1/public_html/Nexus360/index.js

# 3. Backup old version:
cp /home/melitec1/public_html/Nexus360/index.js /home/melitec1/public_html/Nexus360/backups/index.js.$(date +%Y%m%d_%H%M%S)

# 4. Verify file size:
stat -c%s /home/melitec1/public_html/Nexus360/index.js   # Linux
stat -f%z /home/melitec1/public_html/Nexus360/index.js   # macOS

# 5. Verify timestamp:
stat -c%y /home/melitec1/public_html/Nexus360/index.js    # Linux
stat -f '%Sm' /home/melitec1/public_html/Nexus360/index.js  # macOS

