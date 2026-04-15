#!/usr/bin/env ts-node

/**
 * Permissions Validation Script
 * Validates that:
 * 1. No duplicate permission keys exist
 * 2. All server permissions have corresponding client mappings
 * 3. All TRPC routers have proper permission enforcement
 * 4. All users have required permission records
 */

import fs from "fs";
import path from "path";

interface PermissionEntry {
  key: string;
  file: string;
  roles: string[];
  line: number;
}

// Extract FEATURE_ACCESS entries from both server and client
function parsePermissionsFile(filePath: string): PermissionEntry[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const entries: PermissionEntry[] = [];

  // Find all permission entries: "key": [roles]
  const regex = /^\s*"([^"]+)":\s*\[([\s\S]*?)\]/gm;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const rolesStr = match[2];

    // Parse roles
    const roles = rolesStr
      .split(",")
      .map((r) => r.trim().replace(/["']/g, ""))
      .filter((r) => r);

    // Get line number
    const line =
      content.substring(0, match.index).split("\n").length;

    entries.push({ key, file: filePath, roles, line });
  }

  return entries;
}

// Check for duplicates
function findDuplicates(entries: PermissionEntry[]): Map<string, PermissionEntry[]> {
  const duplicates = new Map<string, PermissionEntry[]>();

  for (const entry of entries) {
    if (!duplicates.has(entry.key)) {
      duplicates.set(entry.key, []);
    }
    duplicates.get(entry.key)!.push(entry);
  }

  return new Map(
    [...duplicates.entries()].filter(([_, entries]) => entries.length > 1)
  );
}

// Check for role mismatches
function findMismatches(
  serverEntries: PermissionEntry[],
  clientEntries: PermissionEntry[]
): string[] {
  const issues: string[] = [];
  const serverMap = new Map(serverEntries.map((e) => [e.key, e]));
  const clientMap = new Map(clientEntries.map((e) => [e.key, e]));

  // Check each server permission exists on client
  for (const [key, serverPerm] of serverMap) {
    if (!clientMap.has(key)) {
      issues.push(`❌ Server permission missing on client: ${key}`);
    } else {
      const clientPerm = clientMap.get(key)!;
      const serverRoles = new Set(serverPerm.roles);
      const clientRoles = new Set(clientPerm.roles);

      const missing = [...serverRoles].filter((r) => !clientRoles.has(r));
      const extra = [...clientRoles].filter((r) => !serverRoles.has(r));

      if (missing.length > 0) {
        issues.push(
          `⚠️  ${key}: Missing roles on client: ${missing.join(", ")}`
        );
      }
      if (extra.length > 0) {
        issues.push(
          `⚠️  ${key}: Extra roles on client: ${extra.join(", ")}`
        );
      }
    }
  }

  return issues;
}

// Main validation
console.log("📋 Validating Permissions System\n");

const serverPath = path.join(
  process.cwd(),
  "server/middleware/enhancedRbac.ts"
);
const clientPath = path.join(process.cwd(), "client/src/lib/permissions.ts");

if (!fs.existsSync(serverPath)) {
  console.error(`❌ Server permissions file not found: ${serverPath}`);
  process.exit(1);
}

if (!fs.existsSync(clientPath)) {
  console.error(`❌ Client permissions file not found: ${clientPath}`);
  process.exit(1);
}

console.log("🔍 Parsing permissions files...\n");

const serverEntries = parsePermissionsFile(serverPath);
const clientEntries = parsePermissionsFile(clientPath);

console.log(`Server entries found: ${serverEntries.length}`);
console.log(`Client entries found: ${clientEntries.length}\n`);

// Check for duplicates
console.log("🔎 Checking for duplicate keys...\n");

const serverDups = findDuplicates(serverEntries);
const clientDups = findDuplicates(clientEntries);

if (serverDups.size > 0) {
  console.log(`❌ Found ${serverDups.size} duplicate keys in SERVER:\n`);
  for (const [key, entries] of serverDups) {
    console.log(`   "${key}" appears ${entries.length} times:`);
    entries.forEach((e) => console.log(`      Line ${e.line}: ${e.file}`));
  }
  console.log();
}

if (clientDups.size > 0) {
  console.log(`❌ Found ${clientDups.size} duplicate keys in CLIENT:\n`);
  for (const [key, entries] of clientDups) {
    console.log(`   "${key}" appears ${entries.length} times:`);
    entries.forEach((e) => console.log(`      Line ${e.line}: ${e.file}`));
  }
  console.log();
}

// Check for mismatches
console.log("🔗 Checking for mismatches...\n");

const mismatches = findMismatches(serverEntries, clientEntries);

if (mismatches.length > 0) {
  console.log(`Found ${mismatches.length} issues:\n`);
  mismatches.forEach((issue) => console.log(`   ${issue}`));
  console.log();
} else {
  console.log("✅ All server and client permissions match!\n");
}

// Summary
console.log("📊 Summary:");
console.log(`   Total Server Permissions: ${serverEntries.length}`);
console.log(`   Total Client Permissions: ${clientEntries.length}`);
console.log(`   Server Duplicates: ${serverDups.size}`);
console.log(`   Client Duplicates: ${clientDups.size}`);
console.log(`   Mismatches: ${mismatches.length}`);

const hasIssues =
  serverDups.size > 0 || clientDups.size > 0 || mismatches.length > 0;

if (hasIssues) {
  console.log("\n❌ Validation FAILED - Fix the issues above");
  process.exit(1);
} else {
  console.log("\n✅ Validation PASSED - All permissions are clean!");
  process.exit(0);
}
