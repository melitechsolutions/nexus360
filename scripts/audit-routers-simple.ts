#!/usr/bin/env node

/**
 * Simple Router Audit Script
 * Checks for hardcoded role checks in TRPC routers
 */

import fs from "fs";
import path from "path";

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return files;
}

interface Finding {
  file: string;
  pattern: string;
  lineNumber: number;
  matchText: string;
}

const findings: Finding[] = [];

// Get the router directory - handle both file:// URLs and regular paths
let routerDir = import.meta.url;
if (routerDir.startsWith("file://")) {
  routerDir = routerDir.slice(7); // Remove file://
}
routerDir = path.dirname(routerDir);
routerDir = path.join(path.dirname(routerDir), "server", "routers");

console.log("🔍 Auditing TRPC routers for hardcoded role checks...\n");
console.log(`Scanning: ${routerDir}\n`);

const routerFiles = getAllFiles(routerDir);
console.log(`Found ${routerFiles.length} router files\n`);

// Patterns to look for
const checkPatterns = [
  { pattern: /role\s*===\s*['"]admin['"]/g, name: "Hardcoded admin check" },
  { pattern: /role\s*===\s*['"]super_admin['"]/g, name: "Hardcoded super_admin check" },
  { pattern: /includes\(\s*['"]admin['"]\s*\)/g, name: "Role includes admin" },
  { pattern: /\[\s*['"]super_admin['"]\s*,\s*['"]admin['"]\s*\]/g, name: "Hardcoded role array" },
];

for (const file of routerFiles) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    
    for (const { pattern, name } of checkPatterns) {
      let match;
      const globalPattern = new RegExp(pattern.source, "g");
      
      while ((match = globalPattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const lineText = lines[lineNumber - 1] || "";
        
        findings.push({
          file: file.replace(routerDir, ""),
          pattern: name,
          lineNumber,
          matchText: lineText.trim().substring(0, 100),
        });
      }
    }
  } catch (err) {
    // Skip files we can't read
  }
}

if (findings.length === 0) {
  console.log("✅ No hardcoded role checks found!\n");
} else {
  console.log(`❌ Found ${findings.length} potential issues:\n`);
  
  // Group by file
  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) {
      byFile.set(finding.file, []);
    }
    byFile.get(finding.file)!.push(finding);
  }
  
  for (const [file, fileFindings] of byFile.entries()) {
    console.log(`📄 ${file}`);
    for (const f of fileFindings) {
      console.log(`   Line ${f.lineNumber}: ${f.pattern}`);
      console.log(`   >>> ${f.matchText}`);
    }
    console.log();
  }
}

console.log("✅ Audit complete!");
