#!/usr/bin/env python3
"""
Create a complete deployment script with embedded base64 data
"""

# Read the base64 encoded data
with open(r'e:\melitech_crm\index-js-encoded.b64', 'r') as f:
    encoded_data = f.read().strip()

# Create the deployment script
deploy_script = f"""#!/bin/bash
# Nexus360 Deployment - index.js
# This script deploys the correct Node.js server bundle

TARGET="/home/melitec1/public_html/Nexus360/dist/index.js"
BACKUP="/home/melitec1/public_html/Nexus360/dist/index.js.backup"

echo "[*] Deploying index.js to $TARGET"

# Create backup if file exists
if [ -f "$TARGET" ]; then
    cp "$TARGET" "$BACKUP"
    OLD_SIZE=$(stat -c%s "$TARGET" 2>/dev/null || stat -f%z "$TARGET")
    echo "[*] Backup created: $BACKUP (size: $OLD_SIZE bytes)"
fi

# Deploy the file
cat << 'ENCODE_EOF' | base64 -d | gzip -d > "$TARGET"
{encoded_data}
ENCODE_EOF

# Verify deployment
if [ -f "$TARGET" ]; then
    NEW_SIZE=$(stat -c%s "$TARGET" 2>/dev/null || stat -f%z "$TARGET")
    echo "[OK] File deployed successfully!"
    echo "[*] New file size: $NEW_SIZE bytes"
    if [ -f "$BACKUP" ]; then
        echo "[*] Backup size: $OLD_SIZE bytes"
        if [ "$NEW_SIZE" -eq "11139434" ]; then
            echo "[OK] File size is correct (11,139,434 bytes)"
        else
            echo "[ERROR] File size mismatch! Expected 11,139,434 bytes, got $NEW_SIZE bytes"
        fi
    fi
else
    echo "[ERROR] Deployment failed - file not found!"
    exit 1
fi
"""

# Save the script
output_file = r'e:\melitech_crm\deploy-with-embedded-data.sh'
with open(output_file, 'w') as f:
    f.write(deploy_script)

# Also create a text version of the command to paste
cmd_text = f"""
# Run this bash command in the cPanel terminal:
cat << 'ENCODE_EOF' | base64 -d | gzip -d > /home/melitec1/public_html/Nexus360/dist/index.js
{encoded_data}
ENCODE_EOF
echo "[OK] Deployment complete"; ls -lh /home/melitec1/public_html/Nexus360/dist/index.js
"""

cmd_file = r'e:\melitech_crm\paste-this-in-terminal.txt'
with open(cmd_file, 'w') as f:
    f.write(cmd_text)

print(f"[OK] Deployment script created: {output_file}")
print(f"[OK] Terminal command created: {cmd_file}")
print(f"\nTo deploy on the server:")
print(f"  1. Copy the contents of: {cmd_file}")
print(f"  2. Paste into the cPanel terminal")
print(f"  3. Press Enter")
print(f"\nOR upload and run: {output_file}")
