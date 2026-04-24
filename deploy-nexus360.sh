#!/bin/bash
# Nexus360 Deployment Script
# This script deploys the correct dist/index.js to production

set -e

TARGET_FILE="/home/melitec1/public_html/Nexus360/dist/index.js"
BACKUP_FILE="/home/melitec1/public_html/Nexus360/dist/index.js.backup"

echo "[*] Nexus360 Deployment Script"
echo "[*] Target: $TARGET_FILE"

# Check if target directory exists
if [ ! -d "$(dirname "$TARGET_FILE")" ]; then
    echo "[ERROR] Directory $(dirname "$TARGET_FILE") does not exist!"
    exit 1
fi

# Create backup
if [ -f "$TARGET_FILE" ]; then
    echo "[*] Creating backup: $BACKUP_FILE"
    cp "$TARGET_FILE" "$BACKUP_FILE"
    ORIG_SIZE=$(stat -c%s "$TARGET_FILE" 2>/dev/null || stat -f%z "$TARGET_FILE" 2>/dev/null)
    echo "  Original file size: $ORIG_SIZE bytes"
fi

# Deploy the file using base64 decode + gzip decompress
echo "[*] Deploying new index.js..."

