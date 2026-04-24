#!/bin/bash

# Deployment Command Generator
# Usage: ./deploy.sh [dist_file] [prod_target_dir]

DIST_FILE="${1:-.\\dist\\index.js}"
TARGET_DIR="${2:-/home/melitec1/public_html/Nexus360}"

# Convert Windows path to Unix
DIST_FILE=$(echo "$DIST_FILE" | sed 's|\\|/|g')

# Verify file exists
if [ ! -f "$DIST_FILE" ]; then
  echo "Error: dist file not found: $DIST_FILE"
  exit 1
fi

echo "==================================================================="
echo "DEPLOYMENT PACKAGE GENERATOR"
echo "==================================================================="
echo "Source file: $DIST_FILE"
echo "Target directory: $TARGET_DIR"
echo ""

# Get file stats
SIZE=$(stat -c%s "$DIST_FILE" 2>/dev/null || stat -f%z "$DIST_FILE" 2>/dev/null || wc -c < "$DIST_FILE")
HASH=$(md5sum "$DIST_FILE" 2>/dev/null | cut -d' ' -f1 || md5 -q "$DIST_FILE" 2>/dev/null)

echo "Source file size: $SIZE bytes"
echo "Source file MD5: $HASH"
echo ""

# Create compressed + base64 encoded version
echo "Encoding file (gzip + base64)..."
ENCODED=$(gzip -c "$DIST_FILE" | base64 -w 0)
ENCODED_SIZE=${#ENCODED}

echo "Encoded size: $ENCODED_SIZE characters"
echo ""
echo "==================================================================="
echo "COPY THE ENTIRE COMMAND BELOW AND PASTE INTO PRODUCTION TERMINAL"
echo "==================================================================="
echo ""

# Generate the deployment command
echo "bash << 'DEPLOY_SCRIPT'"
echo "#!/bin/bash"
echo "set -e"
echo "TARGET_DIR=\"$TARGET_DIR\""
echo "INDEX_FILE=\"\${TARGET_DIR}/index.js\""
echo "BACKUP_DIR=\"\${TARGET_DIR}/backups\""
echo "TIMESTAMP=\$(date +%Y%m%d_%H%M%S)"
echo ""
echo "echo '[DEPLOY] Creating backup directory...'"
echo "mkdir -p \"\${BACKUP_DIR}\""
echo ""
echo "echo '[DEPLOY] Backing up old index.js...'"
echo "if [ -f \"\${INDEX_FILE}\" ]; then"
echo "  cp \"\${INDEX_FILE}\" \"\${BACKUP_DIR}/index.js.\${TIMESTAMP}\""
echo "  BACKUP_SIZE=\$(stat -c%s \"\${BACKUP_DIR}/index.js.\${TIMESTAMP}\" 2>/dev/null || stat -f%z \"\${BACKUP_DIR}/index.js.\${TIMESTAMP}\" 2>/dev/null)"
echo "  echo \"  Backup saved: index.js.\${TIMESTAMP} (\${BACKUP_SIZE} bytes)\""
echo "fi"
echo ""
echo "echo '[DEPLOY] Decoding and decompressing new index.js...'"
echo "echo \"$ENCODED\" | base64 -d | gunzip -c > \"\${INDEX_FILE}.tmp\""
echo ""
echo "echo '[DEPLOY] Verifying integrity...'"
echo "NEW_SIZE=\$(stat -c%s \"\${INDEX_FILE}.tmp\" 2>/dev/null || stat -f%z \"\${INDEX_FILE}.tmp\" 2>/dev/null)"
echo ""
echo "if [ \"\$NEW_SIZE\" -ne \"$SIZE\" ]; then"
echo "  echo '[ERROR] File size mismatch! Expected $SIZE, got '\$NEW_SIZE"
echo "  rm \"\${INDEX_FILE}.tmp\""
echo "  exit 1"
echo "fi"
echo ""
echo "echo '[DEPLOY] Moving new file into place...'"
echo "mv \"\${INDEX_FILE}.tmp\" \"\${INDEX_FILE}\""
echo ""
echo "echo '[DEPLOY] Verification:'"
echo "echo \"  File: \${INDEX_FILE}\""
echo \"  Size: \$(stat -c%s \"\${INDEX_FILE}\" 2>/dev/null || stat -f%z \"\${INDEX_FILE}\" 2>/dev/null) bytes\""
echo \"  Modified: \$(stat -c%y \"\${INDEX_FILE}\" 2>/dev/null || stat -f '%Sm' \"\${INDEX_FILE}\" 2>/dev/null)\""
echo \"  Backup: \${BACKUP_DIR}/index.js.\${TIMESTAMP}\"\"
echo ""
echo "echo '[DEPLOY] ✓ Deployment successful!'"
echo "DEPLOY_SCRIPT"
echo ""
echo "==================================================================="
