import sys

# Read the base64 encoded file
print("[*] Reading base64 encoded file...", file=sys.stderr)
with open('index-js-encoded.b64', 'r') as f:
    encoded_data = f.read().strip()

print(f"[*] Encoded data size: {len(encoded_data)} characters", file=sys.stderr)
print(f"[*] Creating deployment script...", file=sys.stderr)

# Create the complete bash deployment script
bash_script = f"""#!/bin/bash
set -e

echo "[DEPLOY] Starting Node.js index.js deployment..."
echo "[DEPLOY] Target: /home/melitec1/public_html/Nexus360/dist/index.js"
echo "[DEPLOY] Expected size: 11139434 bytes"
echo ""

# Create target directory if it doesn't exist
mkdir -p /home/melitec1/public_html/Nexus360/dist/

# Backup existing file
if [ -f /home/melitec1/public_html/Nexus360/dist/index.js ]; then
  echo "[DEPLOY] Backing up old index.js..."
  cp /home/melitec1/public_html/Nexus360/dist/index.js /home/melitec1/public_html/Nexus360/dist/index.js.backup
  OLD_SIZE=\$(stat -c%s /home/melitec1/public_html/Nexus360/dist/index.js.backup 2>/dev/null || stat -f%z /home/melitec1/public_html/Nexus360/dist/index.js.backup 2>/dev/null)
  echo "[DEPLOY] Backup saved (size: \$OLD_SIZE bytes)"
fi

echo ""
echo "[DEPLOY] Decoding and decompressing..."
echo "{encoded_data}" | base64 -d | gzip -d > /home/melitec1/public_html/Nexus360/dist/index.js

echo "[DEPLOY] Verifying deployment..."
NEW_SIZE=\$(stat -c%s /home/melitec1/public_html/Nexus360/dist/index.js 2>/dev/null || stat -f%z /home/melitec1/public_html/Nexus360/dist/index.js 2>/dev/null)

echo ""
echo "========================================="
echo "[DEPLOY] Verification Results:"
echo "========================================="
echo "File: /home/melitec1/public_html/Nexus360/dist/index.js"
echo "New size: \$NEW_SIZE bytes"
echo "Expected: 11139434 bytes"
echo ""

if [ "\$NEW_SIZE" -eq "11139434" ]; then
  echo "[SUCCESS] ✓ File deployed successfully!"
  echo "[SUCCESS] ✓ File size is correct!"
  ls -lh /home/melitec1/public_html/Nexus360/dist/index.js
else
  echo "[ERROR] ✗ File size mismatch!"
  echo "[ERROR] ✗ Expected: 11139434, Got: \$NEW_SIZE"
  if [ -f /home/melitec1/public_html/Nexus360/dist/index.js.backup ]; then
    echo "[RESTORE] Restoring backup..."
    cp /home/melitec1/public_html/Nexus360/dist/index.js.backup /home/melitec1/public_html/Nexus360/dist/index.js
    echo "[RESTORE] Backup restored"
  fi
  exit 1
fi

echo ""
echo "[DEPLOY] Ready for application restart."
"""

# Save the bash script
with open('deploy_final.sh', 'w') as f:
    f.write(bash_script)

print("[*] Deployment script created: deploy_final.sh", file=sys.stderr)
print("[*] Script size: {len(bash_script)} bytes", file=sys.stderr)
print("[OK] Script ready for cPanel terminal", file=sys.stderr)

