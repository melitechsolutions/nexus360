/**
 * Super Admin Seed Script
 * Creates the default super admin user and organization
 * Run with: npx ts-node scripts/seed-super-admin.ts
 */

import { getDb } from "../server/db";
import { users, organizations, userRoles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SUPER_ADMIN = {
  email: "admin@nexus360.ke",
  password: "n3xus.k-360!!",
  name: "Nexus360 Super Admin",
  role: "super_admin" as const,
};

const DEFAULT_ORG = {
  id: `org_nexus360_default`,
  name: "Nexus360 Platform",
  slug: "nexus360",
  plan: "enterprise",
  maxUsers: 999,
  currency: "KES",
  timezone: "Africa/Nairobi",
};

async function seedSuperAdmin() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ Failed to connect to database");
      process.exit(1);
    }

    console.log("🌱 Seeding super admin...\n");

    // Check if org already exists
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, DEFAULT_ORG.slug))
      .limit(1);

    let orgId = DEFAULT_ORG.id;

    if (existingOrg.length > 0) {
      orgId = existingOrg[0].id;
      console.log(`⏭️  Organization "${DEFAULT_ORG.name}" already exists (id: ${orgId})`);
    } else {
      await db.insert(organizations).values({
        id: orgId,
        name: DEFAULT_ORG.name,
        slug: DEFAULT_ORG.slug,
        plan: DEFAULT_ORG.plan,
        maxUsers: DEFAULT_ORG.maxUsers,
        currency: DEFAULT_ORG.currency,
        timezone: DEFAULT_ORG.timezone,
        isActive: true,
      });
      console.log(`✅ Created organization: ${DEFAULT_ORG.name}`);
    }

    // Check if super admin user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, SUPER_ADMIN.email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`⏭️  Super admin ${SUPER_ADMIN.email} already exists`);
    } else {
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);
      const userId = `user_super_admin_${Date.now()}`;

      await db.insert(users).values({
        id: userId,
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
        passwordHash: hashedPassword,
        role: SUPER_ADMIN.role,
        organizationId: orgId,
        isActive: true,
        loginMethod: "local",
        createdAt: new Date().toISOString(),
      });

      // Also insert into userRoles for role-based access
      await db.insert(userRoles).values({
        id: `ur_super_admin_${Date.now()}`,
        userId: userId,
        role: "super_admin",
        roleName: "Super Administrator",
        description: "Full platform access",
        isActive: 1,
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Created super admin: ${SUPER_ADMIN.name} (${SUPER_ADMIN.email})`);
    }

    console.log("\n🎉 Super admin seed complete!");
    console.log(`\n  📧 Email:    ${SUPER_ADMIN.email}`);
    console.log(`  🔑 Password: ${SUPER_ADMIN.password}`);
    console.log(`  🏢 Org:      ${DEFAULT_ORG.name} (${DEFAULT_ORG.slug})`);
  } catch (error) {
    console.error("❌ Error seeding super admin:", error);
    process.exit(1);
  }
}

seedSuperAdmin();
