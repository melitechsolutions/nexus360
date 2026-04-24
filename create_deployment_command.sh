#!/bin/bash

# Create deployment command from local dist/index.js
# This script generates a bash command that can be copy-pasted into production terminal

LOCAL_FILE="${1:-.\\dist\\index.js}"
TARGET_DIR="${2:-/home/melitec1/public_html/Nexus360}"
PROD_HOST="${3:-melitechsolutions.co.ke}"
PROD_USER="${4:-melitec1}"

# Convert Windows path to Unix path if needed
LOCAL_FILE=$(echo "$LOCAL_FILE" | sed 's|\\|/|g')

if [ ! -f "$LOCAL_FILE" ]; then
    echo "Error: File not found: $LOCAL_FILE"
    exit 1
fi

echo "Creating deployment package..."
echo "Source: $LOCAL_FILE"
echo "Target: $PROD_USER@$PROD_HOST:$TARGET_DIR"
echo ""

# Compress and encode
COMPRESSED=$(gzip -c "$LOCAL_FILE" | base64 -w 0)
FILE_SIZE=$(stat -c%s "$LOCAL_FILE" 2>/dev/null || stat -f%z "$LOCAL_FILE" 2>/dev/null)
FILE_HASH=$(md5sum "$LOCAL_FILE" 2>/dev/null || md5 -q "$LOCAL_FILE" 2>/dev/null)

echo "File size: $FILE_SIZE bytes"
echo "MD5 hash: $FILE_HASH"
echo ""
echo "=== DEPLOYMENT COMMAND - COPY THE FOLLOWING TO PRODUCTION TERMINAL ==="
echo ""
echo "# Deployment command (paste this in production terminal):"
echo "cat << 'DEPLOY_EOF' | bash"
echo "#!/bin/bash"
echo "set -e"
echo ""
echo "TARGET_DIR=\"$TARGET_DIR\""
echo "INDEX_FILE=\"\$TARGET_DIR/index.js\""
echo "BACKUP_DIR=\"\$TARGET_DIR/backups\""
echo "TIMESTAMP=\$(date +%Y%m%d_%H%M%S)"
echo ""
echo "echo 'Starting deployment...'"
echo ""
echo "# Create backup directory if not exists"
echo "mkdir -p \"\$BACKUP_DIR\""
echo ""
echo "# Backup old version"
echo "if [ -f \"\$INDEX_FILE\" ]; then"
echo "  echo \"Backing up old index.js to backups/index.js.\$TIMESTAMP\""
echo "  cp \"\$INDEX_FILE\" \"\$BACKUP_DIR/index.js.\$TIMESTAMP\""
echo "fi"
echo ""
echo "# Decode and decompress"
echo "echo \"Decoding and decompressing new index.js...\""
echo "echo \"$COMPRESSED\" | base64 -d | gunzip -c > \"\$INDEX_FILE\""
echo ""
echo "# Verify deployment"
echo "echo \"Verifying deployment...\""
echo "NEW_SIZE=\$(stat -c%s \"\$INDEX_FILE\" 2>/dev/null || stat -f%z \"\$INDEX_FILE\" 2>/dev/null)"
echo "NEW_MTIME=\$(stat -c%y \"\$INDEX_FILE\" 2>/dev/null || stat -f \\\"%Sm -t %Y%m%d_%H%M%S\\\" \"\$INDEX_FILE\" 2>/dev/null)"
echo ""
echo "echo \"Deployment complete!\""
echo \"echo \\\"Old backup: \$BACKUP_DIR/index.js.\$TIMESTAMP\\\"\"
echo \"echo \\\"New file size: \$NEW_SIZE bytes\\\"\"
echo \"echo \\\"New file timestamp: \$NEW_MTIME\\\"\"
echo ""
echo "# Optional: Restart application (uncomment if needed)"
echo "# echo 'Restarting application...'"
echo "# systemctl restart your-app"
echo ""
echo "DEPLOY_EOF"
echo ""
echo "=== END DEPLOYMENT COMMAND ==="
