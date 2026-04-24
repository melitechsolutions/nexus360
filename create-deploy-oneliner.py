#!/usr/bin/env python3
"""
Generate a simple Python one-liner for deployment.
This will read the encoded file and create a deployment command.
"""

with open(r'e:\melitech_crm\index-js-encoded.b64', 'r') as f:
    encoded_data = f.read().strip()

# Create a Python command that can be copy-pasted into the terminal
python_cmd = f"""python3 << 'PYEOF'
import base64, gzip, os
data = base64.b64decode('{encoded_data}')
os.makedirs('/home/melitec1/public_html/Nexus360/dist', exist_ok=True)
with open('/home/melitec1/public_html/Nexus360/dist/index.js', 'wb') as f:
    f.write(gzip.decompress(data))
print('[OK] File deployed successfully')
PYEOF
"""

# Save the command
with open(r'e:\melitech_crm\deploy-python-oneliner.txt', 'w') as f:
    f.write(python_cmd)

print("Python one-liner deployment command created!")
print("\nCommand length:", len(python_cmd))
print("\nTo deploy on the server, copy and paste this into the terminal:")
print(python_cmd)
