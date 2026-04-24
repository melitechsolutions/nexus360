#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║  BUILD.PHP UPLOAD & PRODUCTION BUILD HELPER              ║${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}⚠️  ACTION REQUIRED:${colors.reset}
The build.php file on production is empty and needs to be fixed.

${colors.cyan}STEP 1: Manual File Manager Upload${colors.reset}
1. Go to: https://melitechsolutions.co.ke:2083/cpsess4823000933/frontend/jupiter/filemanager/
2. Navigate to: /home/melitec1/nexus360.melitechsolutions.co.ke/
3. Find the empty build.php file (0 bytes)
4. Right-click on it → Edit (or double-click)
5. Delete any existing content
6. Paste this PHP code:

\`\`\`php
<?php
$cmd = $_GET['cmd'] ?? 'status';
$app_dir = dirname(__FILE__);
chdir($app_dir);
header('Content-Type: application/json');

if ($cmd === 'install') {
    $output = shell_exec('npm install --production 2>&1');
    echo json_encode(['cmd' => 'install', 'output' => $output, 'cwd' => getcwd()]);
} else if ($cmd === 'build') {
    $output = shell_exec('npm run build 2>&1');
    echo json_encode(['cmd' => 'build', 'output' => $output, 'cwd' => getcwd()]);
} else if ($cmd === 'status') {
    echo json_encode([
        'node' => trim(shell_exec('node --version 2>&1')),
        'npm' => trim(shell_exec('npm --version 2>&1')),
        'cwd' => getcwd(),
        'node_modules' => is_dir('node_modules'),
        'dist' => is_dir('dist'),
        'env' => file_exists('.env')
    ]);
}
?>
\`\`\`

7. Save the file (Ctrl+S)

${colors.cyan}STEP 2: Test the Build Script${colors.reset}
Once saved, test it by visiting:
${colors.green}✓ https://nexus360.melitechsolutions.co.ke/build.php?cmd=status${colors.reset}

This should return JSON showing Node/npm versions and file status.

${colors.cyan}STEP 3: Run Production Build${colors.reset}
Then execute npm commands:
${colors.green}✓ https://nexus360.melitechsolutions.co.ke/build.php?cmd=install${colors.reset} (wait 2-3 min)
${colors.green}✓ https://nexus360.melitechsolutions.co.ke/build.php?cmd=build${colors.reset} (wait 30-60 sec)

${colors.cyan}STEP 4: Restart Node.js${colors.reset}
Go to: cPanel → Node.js Manager
Click the ${colors.yellow}RESTART${colors.reset} button for nexus360.melitechsolutions.co.ke

${colors.cyan}STEP 5: Verify Application${colors.reset}
Visit: ${colors.green}https://nexus360.melitechsolutions.co.ke/${colors.reset}
You should see the login page (no more 404 or 503 error!)

${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}
${colors.yellow}OPTIONAL: Copy build.php to clipboard${colors.reset}
`);

// Display the PHP file content from the local workspace
const buildPhpPath = path.resolve(__dirname, '../build.php');
if (fs.existsSync(buildPhpPath)) {
  const content = fs.readFileSync(buildPhpPath, 'utf-8');
  console.log(`\n${colors.green}✓ build.php found locally (${(fs.statSync(buildPhpPath).size / 1024).toFixed(2)}KB)${colors.reset}\n`);
  console.log('Copy this to your clipboard and paste into the File Manager editor:\n');
  console.log(`${colors.blue}${content}${colors.reset}\n`);
} else {
  console.log(`${colors.red}✗ build.php not found at ${buildPhpPath}${colors.reset}\n`);
}

console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
