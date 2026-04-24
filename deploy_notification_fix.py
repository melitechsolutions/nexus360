#!/usr/bin/env python3
"""
Deploy notification popup fix to production
Uses SFTP for reliable file transfer
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    # Deployment settings
    DEPLOY_HOST = "melitechsolutions.co.ke"
    DEPLOY_USER = "melitec1"
    DEPLOY_PASS = "G=P%C7Xem~LP"
    REMOTE_DIR = "/home/melitec1/Nexus360"
    ZIP_FILE = Path("e:\\Nexus360\\deploy.zip")
    
    if not ZIP_FILE.exists():
        print(f"ERROR: {ZIP_FILE} not found")
        sys.exit(1)
    
    print(f"Deploying {ZIP_FILE.stat().st_size:,} bytes to {DEPLOY_HOST}")
    print(f"Uploading to {REMOTE_DIR}/...")
    
    # Use expect-like approach with scp - simpler than sftp for this use case
    # Actually, curl with increased timeout is the most reliable
    cmd = [
        "curl",
        "-k",
        "--max-time", "600",  # 10 minute timeout for upload
        "-u", f"{DEPLOY_USER}:{DEPLOY_PASS}",
        "-F", f"file=@{ZIP_FILE}",
        f"https://{DEPLOY_HOST}/do_deploy.php"
    ]
    
    print(f"Running: {' '.join(cmd[:5])} ...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=620)
    
    print("\n=== DEPLOYMENT RESPONSE ===")
    print(result.stdout)
    if result.stderr:
        print("\nErrors:")
        print(result.stderr)
    
    print(f"\nDeployment exit code: {result.returncode}")
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
