#!/bin/bash

# Read the encoded base64 data from file and deploy
cat << 'DEPLOY_EOF' | base64 -d | gzip -d > /home/melitec1/public_html/Nexus360/dist/index.js
