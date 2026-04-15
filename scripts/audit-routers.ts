#!/usr/bin/env ts-node

/**
 * TRPC Router Permission Audit Script
 * Identifies routers with missing permission enforcement
 * Reports any hardcoded role checks instead of using RBAC
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

interface RouterIssue {
  file: string;
  line: number;
  type: "missing_auth" | "hardcoded_roles" | "inconsistent_feature";
  description: string;
  code: string;
}

const issues: RouterIssue[] = [];

// Patterns that indicate problems
const PATTERNS = {
  // Missing permission checks
  missing_auth: /\.mutation\(\s*\(\|async\s*\(\s*{\s*input.*ctx.*}\s*=>|\.query\(\s*\(\|async\s*\(\s*{\s*input.*ctx.*}\s*=>/,

  // Hardcoded role arrays
  hardcoded_roles: /\["super_admin"\s*,\s*"admin"\]|\["admin"\s*,\s*"[^"]+"\]|includes\("admin"\)|includes\("super_admin"\)/,

  // Inline role checks
  inline_check: /ctx\.user\.role\s*===|ctx\.user\.role\s*===|\.role\s*!==\s*"admin"/,
};

async function auditRouters() {
  console.log("🔍 Auditing TRPC Routers for Permission Enforcement\n");

  const routerFiles = await glob("server/routers/**/*.ts", {
    ignore: ["**/node_modules/**", "**/*.test.ts"],
  });

  console.log(`Found ${routerFiles.length} router files\n`);

  for (const filePath of routerFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    let inRouter = false;
    let inProcedure = false;
    let procedureName = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Track router context
      if (line.includes("export const") && line.includes("Router = router({")) {
        inRouter = true;
      }

      // Check for hardcoded roles
      if (inRouter && PATTERNS.hardcoded_roles.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: "hardcoded_roles",
          description: "Hardcoded role array found - should use createFeatureRestrictedProcedure()",
          code: line.trim(),
        });
      }

      // Check for inline role checks
      if (inRouter && PATTERNS.inline_check.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: "hardcoded_roles",
          description: "Inline role check found - should use createFeatureRestrictedProcedure()",
          code: line.trim(),
        });
      }

      // Track procedure definitions
      if (line.includes(".mutation(") || line.includes(".query(")) {
        inProcedure = true;
        // Extract procedure name
        const match = line.match(/(\w+):\s*(protectedProcedure|createRoleRestrictedProcedure|createFeatureRestrictedProcedure)/);
        if (match) {
          procedureName = match[1];
        }
      }

      // Check for publicly accessible procedures
      if (
        inProcedure &&
        line.includes("protectedProcedure") &&
        !line.includes("createFeatureRestrictedProcedure") &&
        !line.includes("createRoleRestrictedProcedure")
      ) {
        // Flag procedures that only use protectedProcedure without feature restriction
        if (!lines.slice(Math.max(0, i - 3), i).join(" ").includes("createFeatureRestrictedProcedure")) {
          issues.push({
            file: filePath,
            line: lineNum,
            type: "inconsistent_feature",
            description: `Procedure "${procedureName}" uses only protectedProcedure - add feature permission check`,
            code: line.trim(),
          });
        }
      }

      if (line.includes("},")) {
        inProcedure = false;
      }
    }
  }

  // Report issues
  if (issues.length === 0) {
    console.log("✅ No permission enforcement issues found!\n");
    return;
  }

  console.log(`❌ Found ${issues.length} permission issues:\n`);

  const byFile = new Map<string, RouterIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file)!.push(issue);
  }

  for (const [file, fileIssues] of byFile) {
    console.log(`\n📄 ${file}`);
    for (const issue of fileIssues) {
      console.log(`   Line ${issue.line}: ${issue.type}`);
      console.log(`   ${issue.description}`);
      console.log(`   Code: ${issue.code}`);
    }
  }

  console.log(`\n📊 Summary by type:`);
  const byType = new Map<string, number>();
  for (const issue of issues) {
    byType.set(issue.type, (byType.get(issue.type) || 0) + 1);
  }
  for (const [type, count] of byType) {
    console.log(`   ${type}: ${count}`);
  }

  return issues;
}

// Run audit
auditRouters().then((issues) => {
  process.exit(issues && issues.length > 0 ? 1 : 0);
});
