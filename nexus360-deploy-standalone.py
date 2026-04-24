#!/usr/bin/env python3
"""
Nexus360 Standalone Deployment Script
This script contains everything needed to deploy the correct index.js
"""

import base64
import gzip
import os
import sys

# Read the pre-encoded base64 data from file
print("[*] Reading base64 encoded data...", file=sys.stderr)
try:
    with open('index-js-encoded.b64', 'r') as f:
        b64_data = f.read().strip()
    print(f"[*] Read {len(b64_data):,} characters", file=sys.stderr)
except FileNotFoundError:
    print("[ERROR] index-js-encoded.b64 not found!", file=sys.stderr)
    print("[INFO] Make sure to copy both files to the same directory:", file=sys.stderr)
    print("  - nexus360-deploy-standalone.py", file=sys.stderr)
    print("  - index-js-encoded.b64", file=sys.stderr)
    sys.exit(1)

print("[*] Decoding and decompressing data...", file=sys.stderr)
try:
    # Decode base64
    decoded_data = base64.b64decode(b64_data)
    
    # Decompress gzip
    decompressed_data = gzip.decompress(decoded_data)
    
    print(f"[*] Decompressed size: {len(decompressed_data):,} bytes", file=sys.stderr)
    
    # Target file path
    target_file = '/home/melitec1/public_html/Nexus360/dist/index.js'
    backup_file = '/home/melitec1/public_html/Nexus360/dist/index.js.backup'
    
    # Create directories if needed
    os.makedirs(os.path.dirname(target_file), exist_ok=True)
    
    # Create backup if file exists
    if os.path.exists(target_file):
        print(f"[*] Creating backup: {backup_file}", file=sys.stderr)
        os.system(f'cp "{target_file}" "{backup_file}" 2>/dev/null')
    
    # Write the file
    print(f"[*] Writing to {target_file}...", file=sys.stderr)
    with open(target_file, 'wb') as f:
        f.write(decompressed_data)
    
    # Verify the file
    file_size = os.path.getsize(target_file)
    expected_size = 11139434
    
    print(f"\n[=== DEPLOYMENT RESULT ===]", file=sys.stderr)
    print(f"[*] File: {target_file}", file=sys.stderr)
    print(f"[*] Size: {file_size:,} bytes", file=sys.stderr)
    print(f"[*] Expected: {expected_size:,} bytes", file=sys.stderr)
    
    if file_size == expected_size:
        print(f"\n[SUCCESS] Deployment completed successfully!", file=sys.stderr)
        os.system(f'ls -lh "{target_file}"')
        sys.exit(0)
    else:
        print(f"\n[ERROR] File size mismatch!", file=sys.stderr)
        print(f"[ERROR] This may indicate deployment failure.", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] Deployment failed: {type(e).__name__}: {e}", file=sys.stderr)
    sys.exit(1)
