#!/usr/bin/env python3
"""
Server-side deployment script.
This file should be uploaded to the server and executed.
It reads index-js-encoded.b64 and deploys the index.js file.
"""

import base64
import gzip
import os
import sys

# Target file path
target_file = '/home/melitec1/public_html/Nexus360/dist/index.js'
backup_file = '/home/melitec1/public_html/Nexus360/dist/index.js.backup'
encoded_file = 'index-js-encoded.b64'

print("[*] Nexus360 Deployment Script")
print(f"[*] Target: {target_file}")

# Check if encoded file exists
if not os.path.exists(encoded_file):
    print(f"[ERROR] Encoded file not found: {encoded_file}")
    sys.exit(1)

# Read and deploy
print(f"[*] Reading encoded file...")
with open(encoded_file, 'r') as f:
    encoded_data = f.read().strip()

print(f"[*] Encoded size: {len(encoded_data):,} characters")

# Create backup if target exists
if os.path.exists(target_file):
    print(f"[*] Creating backup: {backup_file}")
    os.system(f'cp "{target_file}" "{backup_file}"')

# Decode and deploy
print(f"[*] Decoding and decompressing...")
try:
    decoded_data = base64.b64decode(encoded_data)
    decompressed_data = gzip.decompress(decoded_data)
    
    # Write to target file
    os.makedirs(os.path.dirname(target_file), exist_ok=True)
    with open(target_file, 'wb') as f:
        f.write(decompressed_data)
    
    # Verify
    file_size = os.path.getsize(target_file)
    expected_size = 11139434
    
    print(f"[OK] File deployed successfully")
    print(f"[*] New file size: {file_size:,} bytes")
    print(f"[*] Expected size: {expected_size:,} bytes")
    
    if file_size == expected_size:
        print(f"[SUCCESS] File size is correct!")
        os.system(f'ls -lh "{target_file}"')
    else:
        print(f"[ERROR] File size mismatch!")
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] Deployment failed: {e}")
    sys.exit(1)
