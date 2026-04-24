#!/usr/bin/env python3
"""
Deploy the correct dist/index.js to production server.
This script base64-encodes the correct index.js and creates a deployment command.
"""

import base64
import gzip
import os
import sys

# File paths
local_file = r'e:\melitech_crm\dist\index.js'
remote_path = '/home/melitec1/public_html/Nexus360/dist/index.js'

# Check if file exists
if not os.path.exists(local_file):
    print(f"ERROR: File not found: {local_file}")
    sys.exit(1)

# Get file size
file_size = os.path.getsize(local_file)
print(f"[*] File size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")

# Verify it's the correct size (11.1 MB)
expected_size = 11139434
if file_size != expected_size:
    print(f"ERROR: File size mismatch!")
    print(f"  Expected: {expected_size:,} bytes")
    print(f"  Got:      {file_size:,} bytes")
    sys.exit(1)

print(f"[✓] File size is correct")

# Read and compress the file
print(f"[*] Reading file...")
with open(local_file, 'rb') as f:
    file_data = f.read()

print(f"[*] Compressing...")
compressed_data = gzip.compress(file_data, compresslevel=9)
compression_ratio = (1 - len(compressed_data) / len(file_data)) * 100
print(f"[✓] Compression: {compression_ratio:.1f}% (from {len(file_data):,} to {len(compressed_data):,} bytes)")

# Base64 encode
print(f"[*] Base64 encoding...")
encoded_data = base64.b64encode(compressed_data).decode('ascii')
print(f"[✓] Encoded size: {len(encoded_data):,} characters")

# Create deployment command
deployment_cmd = f"""
# Deployment command for correct dist/index.js
# Run this on the server to deploy the file

cat << 'EOF' | base64 -d | gzip -d > {remote_path}
{encoded_data}
EOF

# Verify the deployment
ls -lh {remote_path}
echo "File deployed successfully!"
""".strip()

# Save to file for easy execution
output_file = r'e:\melitech_crm\deploy-command.sh'
with open(output_file, 'w') as f:
    f.write(deployment_cmd)

print(f"\n[✓] Deployment command saved to: {output_file}")
print(f"\nTo deploy, run this command on the server:")
print(f"  bash {output_file}")

# Also save just the encoded data
encoded_file = r'e:\melitech_crm\index-js-encoded.b64'
with open(encoded_file, 'w') as f:
    f.write(encoded_data)

print(f"\n[✓] Encoded data saved to: {encoded_file}")
print(f"\nAlternative deployment via Python:")
print(f"  cat << 'EOF' | python3")
print(f"  import base64, gzip")
print(f"  data = base64.b64decode('{encoded_data[:100]}...')")
print(f"  with open('{remote_path}', 'wb') as f:")
print(f"      f.write(gzip.decompress(data))")
print(f"  EOF")
