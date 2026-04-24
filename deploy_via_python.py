import gzip
import base64
import os
import sys

# Read the file
print('[*] Reading dist/index.js...', file=sys.stderr)
with open('dist/index.js', 'rb') as f:
    data = f.read()

# Gzip compress
print(f'[*] Compressing {len(data)} bytes...', file=sys.stderr)
compressed = gzip.compress(data, compresslevel=9)

# Base64 encode
print(f'[*] Encoding {len(compressed)} bytes...', file=sys.stderr)
encoded = base64.b64encode(compressed).decode('ascii')

print('', file=sys.stderr)
print('File size:', len(data), file=sys.stderr)
print('Compressed size:', len(compressed), file=sys.stderr)
print('Encoded size:', len(encoded), file=sys.stderr)
print('', file=sys.stderr)

# Generate a compact Python one-liner
oneliner = f'''python3 -c "import base64,gzip,os,shutil;d=base64.b64decode('{encoded}');c=gzip.decompress(d);t='/home/melitec1/public_html/Nexus360/dist/index.js';os.makedirs(os.path.dirname(t),exist_ok=True);b=t+'.bak';os.path.exists(t) and shutil.copy2(t,b);open(t,'wb').write(c);print('[V] Deployed:',t,'| Backup:',b if os.path.exists(b) else 'N/A','| Size:',len(c))"'''

# Print just the one-liner
print(oneliner)
