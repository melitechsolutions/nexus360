const fs = require('fs');
const path = require('path');

// Get all TS files in server/ (not dist/)
function getFiles(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (f === 'dist' || f === 'node_modules') continue;
    if (fs.statSync(full).isDirectory()) getFiles(full, files);
    else if (full.endsWith('.ts')) files.push(full);
  }
  return files;
}

const files = getFiles('server');
let totalFixed = 0;
const fixedFiles = [];

// Files that should NOT be fixed (not DB writes)
const skipPatterns = [
  'notificationBroadcaster.ts', // SSE events, not DB
  'paymentWebhooks.ts',         // API response, not DB
];

const FIX = "new Date().toISOString().replace('T', ' ').substring(0, 19)";

for (const file of files) {
  const relPath = path.relative('.', file);
  if (skipPatterns.some(p => relPath.endsWith(p))) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip if already fixed
    if (line.includes(".replace('T'") || line.includes('.replace("T"')) continue;

    const hasToISO = line.includes('toISOString()');
    const hasRawDate = /new Date\(\)\s*[,}\)]/.test(line) && !line.includes('toISOString');

    if (!hasToISO && !hasRawDate) continue;

    // Check surrounding context for DB operations
    const context = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 5)).join(' ');
    const isDbContext =
      /\.(set|values|insert)\s*\(/.test(context) ||
      /\.(update|select|from|where)\s*\(/.test(context) ||
      /(createdAt|updatedAt|readAt|resolvedAt|lastSync|processedAt|completedAt|approvedAt|lastMessage|lastGenerated|nextDue|issueDate|dueDate|startDate|endDate|sentAt|receivedAt|scheduledAt|paidAt|lastSign|addedAt|confirmedAt|closedAt)/.test(line);

    if (!isDbContext) continue;

    let newLine = line;

    if (hasToISO) {
      // Fix: new Date().toISOString() → new Date().toISOString().replace(...)
      newLine = newLine.replace(
        /new Date\(\)\.toISOString\(\)(?!\.replace)/g,
        FIX
      );
      // Fix: new Date(expr).toISOString() → new Date(expr).toISOString().replace(...)
      newLine = newLine.replace(
        /new Date\(([^)]+)\)\.toISOString\(\)(?!\.replace)/g,
        "new Date($1).toISOString().replace('T', ' ').substring(0, 19)"
      );
      // Fix: var.toISOString() → var.toISOString().replace(...)
      newLine = newLine.replace(
        /(\b\w+)\.toISOString\(\)(?!\.replace)/g,
        "$1.toISOString().replace('T', ' ').substring(0, 19)"
      );
    }

    if (hasRawDate && !newLine.includes('toISOString')) {
      // Fix raw new Date() being used as a value in DB operations
      newLine = newLine.replace(
        /:\s*new Date\(\)\s*([,}\)])/g,
        `: ${FIX}$1`
      );
      newLine = newLine.replace(
        /:\s*new Date\(\)\s*$/,
        `: ${FIX}`
      );
    }

    if (newLine !== line) {
      lines[i] = newLine;
      changed = true;
      totalFixed++;
    }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    fixedFiles.push(relPath);
  }
}

console.log('Total lines fixed:', totalFixed);
console.log('Files modified:', fixedFiles.length);
fixedFiles.forEach(f => console.log(' ', f));
