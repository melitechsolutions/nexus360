import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getPool, getDb } from "../db";
import { settings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

// Admin-only guard
const adminOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ── Website pages registry (matches actual public routes) ─────────────
const WEBSITE_PAGES = [
  { slug: "landing", title: "Landing Page", path: "/", description: "Main homepage with hero, features overview, and CTAs" },
  { slug: "features", title: "Features", path: "/features", description: "Product features showcase by category" },
  { slug: "pricing", title: "Pricing", path: "/pricing", description: "Pricing tiers and feature comparison" },
  { slug: "about", title: "About Us", path: "/about", description: "Company story, values, team, and milestones" },
  { slug: "contact", title: "Contact", path: "/contact", description: "Contact form and company info" },
  { slug: "demo", title: "Demo", path: "/demo", description: "Interactive product demo page" },
  { slug: "documentation", title: "Documentation", path: "/documentation", description: "Platform documentation and knowledge base" },
  { slug: "user-guide", title: "User Guide", path: "/user-guide", description: "Step-by-step user guide" },
  { slug: "troubleshooting", title: "Troubleshooting", path: "/troubleshooting", description: "Support and troubleshooting guide" },
  { slug: "privacy-policy", title: "Privacy Policy", path: "/privacy-policy", description: "Privacy policy page" },
  { slug: "terms-and-conditions", title: "Terms & Conditions", path: "/terms-and-conditions", description: "Terms of service" },
];

export const websiteAdminRouter = router({
  // ── Pages ──────────────────────────────────────────────────────
  getPages: adminOnly.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return WEBSITE_PAGES.map(p => ({ ...p, isPublished: true, seoTitle: "", seoDescription: "", seoKeywords: "" }));

    const [rows] = await pool.query(
      "SELECT * FROM systemSettings WHERE category = 'website_page'"
    );
    const settings = rows as any[];
    const settingsMap: Record<string, any> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.dataType === "json" ? JSON.parse(s.value || "{}") : s.value;
    }

    return WEBSITE_PAGES.map(p => {
      const pageData = settingsMap[`page_${p.slug}`] || {};
      return {
        ...p,
        isPublished: pageData.isPublished !== false,
        seoTitle: pageData.seoTitle || "",
        seoDescription: pageData.seoDescription || "",
        seoKeywords: pageData.seoKeywords || "",
      };
    });
  }),

  updatePage: adminOnly
    .input(z.object({
      slug: z.string(),
      isPublished: z.boolean().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      seoKeywords: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const key = `page_${input.slug}`;
      const value = JSON.stringify({
        isPublished: input.isPublished ?? true,
        seoTitle: input.seoTitle || "",
        seoDescription: input.seoDescription || "",
        seoKeywords: input.seoKeywords || "",
      });

      // Upsert
      const [existing] = await pool.query(
        "SELECT id FROM systemSettings WHERE category = 'website_page' AND `key` = ?",
        [key]
      );
      const rows = existing as any[];
      if (rows.length) {
        await pool.query(
          "UPDATE systemSettings SET value = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?",
          [value, ctx.user.id, rows[0].id]
        );
      } else {
        await pool.query(
          "INSERT INTO systemSettings (id, category, `key`, value, dataType, description, isPublic, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [uuidv4(), "website_page", key, value, "json", `Page settings for ${input.slug}`, 0, ctx.user.id]
        );
      }
      return { success: true };
    }),

  // ── Navigation ─────────────────────────────────────────────────
  getNavigation: adminOnly.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return null;

    const [rows] = await pool.query(
      "SELECT value FROM systemSettings WHERE category = 'website_nav' AND `key` = 'config'"
    );
    const arr = rows as any[];
    if (arr.length && arr[0].value) {
      return JSON.parse(arr[0].value);
    }
    // Return default nav structure
    return {
      mainLinks: [
        { label: "Features",    href: "/features",         visible: true },
        { label: "Pricing",     href: "/pricing",          visible: true },
        { label: "Book a Demo", href: "/book-a-demo",      visible: true },
        { label: "Partners",    href: "/become-a-partner", visible: true },
        { label: "About",       href: "/about",            visible: true },
        { label: "Contact",     href: "/contact",          visible: true },
      ],
      resourceLinks: [
        { label: "Documentation",   href: "/documentation",  visible: true },
        { label: "User Guide",      href: "/user-guide",     visible: true },
        { label: "Troubleshooting", href: "/troubleshooting", visible: true },
      ],
      ctaText: "Get Started",
      ctaLink: "/signup",
    };
  }),

  updateNavigation: adminOnly
    .input(z.object({
      mainLinks: z.array(z.object({
        label: z.string(),
        href: z.string(),
        visible: z.boolean(),
      })),
      resourceLinks: z.array(z.object({
        label: z.string(),
        href: z.string(),
        visible: z.boolean(),
      })),
      ctaText: z.string(),
      ctaLink: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const value = JSON.stringify(input);
      const [existing] = await pool.query(
        "SELECT id FROM systemSettings WHERE category = 'website_nav' AND `key` = 'config'"
      );
      const rows = existing as any[];
      if (rows.length) {
        await pool.query(
          "UPDATE systemSettings SET value = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?",
          [value, ctx.user.id, rows[0].id]
        );
      } else {
        await pool.query(
          "INSERT INTO systemSettings (id, category, `key`, value, dataType, description, isPublic, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [uuidv4(), "website_nav", "config", value, "json", "Website navigation configuration", 0, ctx.user.id]
        );
      }
      return { success: true };
    }),

  // ── General website settings ───────────────────────────────────
  getSettings: adminOnly.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return null;

    const [rows] = await pool.query(
      "SELECT * FROM systemSettings WHERE category = 'website_general'"
    );
    const arr = rows as any[];
    const result: Record<string, string> = {};
    for (const r of arr) {
      result[r.key] = r.value || "";
    }
    return {
      siteTitle: result.siteTitle || "Nexus360",
      tagline: result.tagline || "Complete Business Management Platform",
      heroTitle: result.heroTitle || "",
      heroSubtitle: result.heroSubtitle || "",
      contactEmail: result.contactEmail || "",
      contactPhone: result.contactPhone || "",
      contactAddress: result.contactAddress || "",
      socialLinkedIn: result.socialLinkedIn || "",
      socialTwitter: result.socialTwitter || "",
      socialFacebook: result.socialFacebook || "",
      socialInstagram: result.socialInstagram || "",
      googleAnalyticsId: result.googleAnalyticsId || "",
      customHeadScript: result.customHeadScript || "",
      announcementBanner: result.announcementBanner || "",
      announcementEnabled: result.announcementEnabled === "true",
    };
  }),

  updateSettings: adminOnly
    .input(z.object({
      siteTitle: z.string().optional(),
      tagline: z.string().optional(),
      heroTitle: z.string().optional(),
      heroSubtitle: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      contactAddress: z.string().optional(),
      socialLinkedIn: z.string().optional(),
      socialTwitter: z.string().optional(),
      socialFacebook: z.string().optional(),
      socialInstagram: z.string().optional(),
      googleAnalyticsId: z.string().optional(),
      customHeadScript: z.string().optional(),
      announcementBanner: z.string().optional(),
      announcementEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (const [key, val] of Object.entries(input)) {
        if (val === undefined) continue;
        const strVal = typeof val === "boolean" ? String(val) : val;
        const [existing] = await pool.query(
          "SELECT id FROM systemSettings WHERE category = 'website_general' AND `key` = ?",
          [key]
        );
        const rows = existing as any[];
        if (rows.length) {
          await pool.query(
            "UPDATE systemSettings SET value = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?",
            [strVal, ctx.user.id, rows[0].id]
          );
        } else {
          await pool.query(
            "INSERT INTO systemSettings (id, category, `key`, value, dataType, description, isPublic, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [uuidv4(), "website_general", key, strVal, "string", `Website setting: ${key}`, 0, ctx.user.id]
          );
        }
      }
      return { success: true };
    }),

  // ── Contact form submissions ───────────────────────────────────
  getContactSubmissions: adminOnly.query(async ({ ctx }) => {
    const pool = getPool();
    if (!pool) return [];

    // Check if websiteContacts table exists
    try {
      const [rows] = await pool.query(
        "SELECT * FROM websiteContacts ORDER BY createdAt DESC LIMIT 100"
      );
      return (rows as any[]).map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone || "",
        company: r.company || "",
        subject: r.subject || "",
        message: r.message,
        status: r.status || "new",
        createdAt: r.createdAt,
      }));
    } catch {
      return [];
    }
  }),

  updateContactStatus: adminOnly
    .input(z.object({
      id: z.string(),
      status: z.enum(["new", "read", "replied", "archived"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        await pool.query(
          "UPDATE websiteContacts SET status = ? WHERE id = ?",
          [input.status, input.id]
        );
      } catch {
        // Table might not have status column — attempt to add it
        try {
          await pool.query("ALTER TABLE websiteContacts ADD COLUMN status VARCHAR(20) DEFAULT 'new'");
          await pool.query("UPDATE websiteContacts SET status = ? WHERE id = ?", [input.status, input.id]);
        } catch { /* ignore */ }
      }
      return { success: true };
    }),

  // ── Analytics placeholder ──────────────────────────────────────
  getAnalytics: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) {
      return { totalPages: WEBSITE_PAGES.length, publishedPages: WEBSITE_PAGES.length, lastUpdated: new Date().toISOString(), totalInquiries: 0, inquiriesByMonth: [], inquiriesByStatus: {} };
    }

    // Get page settings for published count
    const [pageRows] = await pool.query("SELECT value FROM systemSettings WHERE category = 'website_page'");
    const pageSettings = pageRows as any[];
    let publishedCount = WEBSITE_PAGES.length;
    for (const s of pageSettings) {
      try {
        const val = JSON.parse(s.value || "{}");
        if (val.isPublished === false) publishedCount--;
      } catch {}
    }

    // Get inquiry stats
    let totalInquiries = 0;
    let inquiriesByMonth: { month: string; count: number }[] = [];
    let inquiriesByStatus: Record<string, number> = { new: 0, read: 0, replied: 0, archived: 0 };
    try {
      const [countRows] = await pool.query("SELECT COUNT(*) as total FROM websiteContacts");
      totalInquiries = (countRows as any[])[0]?.total ?? 0;

      const [monthRows] = await pool.query(
        "SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count FROM websiteContacts GROUP BY month ORDER BY month DESC LIMIT 12"
      );
      inquiriesByMonth = (monthRows as any[]).reverse();

      const [statusRows] = await pool.query(
        "SELECT COALESCE(status, 'new') as status, COUNT(*) as count FROM websiteContacts GROUP BY status"
      );
      for (const r of statusRows as any[]) {
        inquiriesByStatus[r.status] = r.count;
      }
    } catch {}

    return {
      totalPages: WEBSITE_PAGES.length,
      publishedPages: publishedCount,
      lastUpdated: new Date().toISOString(),
      totalInquiries,
      inquiriesByMonth,
      inquiriesByStatus,
    };
  }),

  // ── Delete contact ────────────────────────────────────────────
  deleteContact: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await pool.query("DELETE FROM websiteContacts WHERE id = ?", [input.id]);
      return { success: true };
    }),

  // ── Bulk update contacts ──────────────────────────────────────
  bulkUpdateContacts: adminOnly
    .input(z.object({
      ids: z.array(z.string()),
      action: z.enum(["read", "replied", "archived", "delete"]),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (input.action === "delete") {
        await pool.query("DELETE FROM websiteContacts WHERE id IN (?)", [input.ids]);
      } else {
        await pool.query("UPDATE websiteContacts SET status = ? WHERE id IN (?)", [input.action, input.ids]);
      }
      return { success: true };
    }),

  // ── Footer configuration ──────────────────────────────────────
  getFooterConfig: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    const [rows] = await pool.query(
      "SELECT value FROM systemSettings WHERE category = 'website_footer' AND `key` = 'config'"
    );
    const arr = rows as any[];
    if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    return {
      columns: [
        { title: "Product", links: [
          { label: "Features", href: "/features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Demo", href: "/demo" },
          { label: "Documentation", href: "/documentation" },
        ]},
        { title: "Resources", links: [
          { label: "User Guide", href: "/user-guide" },
          { label: "Troubleshooting", href: "/troubleshooting" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ]},
        { title: "Legal", links: [
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
        ]},
      ],
      copyrightText: "",
      showCloudPartners: true,
      showComplianceBadges: true,
    };
  }),

  updateFooterConfig: adminOnly
    .input(z.object({
      columns: z.array(z.object({
        title: z.string(),
        links: z.array(z.object({ label: z.string(), href: z.string() })),
      })),
      copyrightText: z.string().optional(),
      showCloudPartners: z.boolean().optional(),
      showComplianceBadges: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const value = JSON.stringify(input);
      const [existing] = await pool.query(
        "SELECT id FROM systemSettings WHERE category = 'website_footer' AND `key` = 'config'"
      );
      const rows = existing as any[];
      if (rows.length) {
        await pool.query("UPDATE systemSettings SET value = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?",
          [value, ctx.user.id, rows[0].id]);
      } else {
        await pool.query(
          "INSERT INTO systemSettings (id, category, `key`, value, dataType, description, isPublic, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [uuidv4(), "website_footer", "config", value, "json", "Website footer configuration", 0, ctx.user.id]);
      }
      return { success: true };
    }),

  // ── Public endpoints (no auth required) ────────────────────────
  publicNavigation: publicProcedure.query(async () => {
    const pool = getPool();
    const defaultNav = {
      mainLinks: [
        { label: "Features",      href: "/features",          visible: true },
        { label: "Pricing",       href: "/pricing",           visible: true },
        { label: "Book a Demo",   href: "/book-a-demo",       visible: true },
        { label: "Partners",      href: "/become-a-partner",  visible: true },
        { label: "About",         href: "/about",             visible: true },
        { label: "Contact",       href: "/contact",           visible: true },
      ],
      resourceLinks: [
        { label: "Documentation",   href: "/documentation",  visible: true },
        { label: "User Guide",      href: "/user-guide",     visible: true },
        { label: "Troubleshooting", href: "/troubleshooting", visible: true },
      ],
      ctaText: "Get Started",
      ctaLink: "/signup",
    };
    if (!pool) return defaultNav;
    const [rows] = await pool.query(
      "SELECT value FROM systemSettings WHERE category = 'website_nav' AND `key` = 'config'"
    );
    const arr = rows as any[];
    if (!arr.length || !arr[0].value) return defaultNav;

    const stored = JSON.parse(arr[0].value);
    // Upgrade legacy /demo link → /book-a-demo, and inject /become-a-partner if missing
    if (stored.mainLinks) {
      stored.mainLinks = stored.mainLinks.map((link: any) => {
        if (link.href === "/demo") return { ...link, label: "Book a Demo", href: "/book-a-demo" };
        return link;
      });
      const hasPartners = stored.mainLinks.some((l: any) => l.href === "/become-a-partner");
      if (!hasPartners) {
        const bookIdx = stored.mainLinks.findIndex((l: any) => l.href === "/book-a-demo");
        const insertAt = bookIdx >= 0 ? bookIdx + 1 : stored.mainLinks.length;
        stored.mainLinks.splice(insertAt, 0, { label: "Partners", href: "/become-a-partner", visible: true });
      }
    }
    return stored;
  }),

  publicSettings: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    const [rows] = await pool.query(
      "SELECT * FROM systemSettings WHERE category = 'website_general'"
    );
    const arr = rows as any[];
    const result: Record<string, string> = {};
    for (const r of arr) result[r.key] = r.value || "";

    // Fetch company logo and name from the settings table (company_logos + general categories)
    let logoUrl = "";
    let companyName = "";
    try {
      const database = await getDb();
      if (database) {
        const logoRows = await database
          .select()
          .from(settings)
          .where(eq(settings.category, "company_logos"));
        const logoMap: Record<string, string> = {};
        for (const r of logoRows) logoMap[r.key] = r.value ?? "";
        logoUrl = logoMap.largeLogo || logoMap.smallLogo || "";

        const generalRows = await database
          .select()
          .from(settings)
          .where(eq(settings.category, "general"));
        const generalMap: Record<string, string> = {};
        for (const r of generalRows) generalMap[r.key] = r.value ?? "";
        companyName = generalMap.companyName || "";
      }
    } catch (_) { /* non-fatal */ }

    return {
      siteTitle: result.siteTitle || "Nexus360",
      tagline: result.tagline || "One Hub. Total Control. The unified business management platform for modern enterprises.",
      contactEmail: result.contactEmail || "",
      contactPhone: result.contactPhone || "",
      contactAddress: result.contactAddress || "",
      socialLinkedIn: result.socialLinkedIn || "",
      socialTwitter: result.socialTwitter || "",
      socialFacebook: result.socialFacebook || "",
      socialInstagram: result.socialInstagram || "",
      announcementBanner: result.announcementBanner || "",
      announcementEnabled: result.announcementEnabled === "true",
      logoUrl,
      companyName,
    };
  }),

  publicFooterConfig: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    const [rows] = await pool.query(
      "SELECT value FROM systemSettings WHERE category = 'website_footer' AND `key` = 'config'"
    );
    const arr = rows as any[];
    if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    return {
      columns: [
        { title: "Product", links: [
          { label: "Features", href: "/features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Demo", href: "/demo" },
          { label: "Documentation", href: "/documentation" },
        ]},
        { title: "Resources", links: [
          { label: "User Guide", href: "/user-guide" },
          { label: "Troubleshooting", href: "/troubleshooting" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ]},
        { title: "Legal", links: [
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
        ]},
      ],
      copyrightText: "",
      showCloudPartners: true,
      showComplianceBadges: true,
    };
  }),

  /** Public pricing data - fetches plans from CRM pricing management */
  publicPricing: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;

    // 1. Try to read plan prices from settings (managed via CRM admin)
    const [priceRows] = await pool.query(
      "SELECT value FROM settings WHERE `key` = 'plan_prices' LIMIT 1"
    );
    const priceArr = priceRows as any[];
    let prices: Record<string, any> | null = null;
    if (priceArr.length && priceArr[0].value) {
      try { prices = JSON.parse(priceArr[0].value); } catch { /* ignore */ }
    }

    // 2. Try to read pricing plans from pricingPlans table
    let dbPlans: any[] = [];
    try {
      const [planRows] = await pool.query(
        "SELECT * FROM pricingPlans WHERE isActive = 1 ORDER BY displayOrder ASC, monthlyPrice ASC"
      );
      dbPlans = planRows as any[];
    } catch { /* table may not exist yet */ }

    // 3. Read tier features
    let tierFeatures: Record<string, Record<string, boolean>> = {};
    try {
      const [featureRows] = await pool.query(
        "SELECT tier, featureKey, isEnabled FROM pricingTierFeatures"
      );
      for (const f of featureRows as any[]) {
        if (!tierFeatures[f.tier]) tierFeatures[f.tier] = {};
        tierFeatures[f.tier][f.featureKey] = Boolean(f.isEnabled);
      }
    } catch { /* table may not exist */ }

    // 4. Read custom pricing config from website settings
    let customConfig: any = null;
    try {
      const [cfgRows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_pricing' AND `key` = 'config' LIMIT 1"
      );
      const cfgArr = cfgRows as any[];
      if (cfgArr.length && cfgArr[0].value) {
        customConfig = JSON.parse(cfgArr[0].value);
      }
    } catch { /* ignore */ }

    return { prices, dbPlans, tierFeatures, customConfig };
  }),

  /** Admin: save pricing page customization */
  updatePricingConfig: adminOnly
    .input(z.object({
      config: z.object({
        plans: z.array(z.object({
          name: z.string(),
          tier: z.string(),
          monthlyKes: z.number(),
          annualKes: z.number(),
          description: z.string(),
          highlight: z.boolean(),
          badge: z.string().nullable(),
          cta: z.string(),
          ctaLink: z.string(),
          maxUsers: z.string(),
          features: z.array(z.object({
            text: z.string(),
            included: z.boolean(),
          })),
        })),
        comparisonRows: z.array(z.object({
          category: z.string().optional(),
          label: z.string().optional(),
          starter: z.any().optional(),
          pro: z.any().optional(),
          ent: z.any().optional(),
        })),
        faq: z.array(z.object({
          q: z.string(),
          a: z.string(),
        })),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const value = JSON.stringify(input.config);
      const [existing] = await pool.query(
        "SELECT id FROM systemSettings WHERE category = 'website_pricing' AND `key` = 'config'"
      );
      const rows = existing as any[];
      if (rows.length) {
        await pool.query(
          "UPDATE systemSettings SET value = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?",
          [value, ctx.user.id, rows[0].id]
        );
      } else {
        await pool.query(
          "INSERT INTO systemSettings (id, category, `key`, value, dataType, description, isPublic, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [uuidv4(), "website_pricing", "config", value, "json", "Public pricing page configuration", 1, ctx.user.id]
        );
      }
      return { success: true };
    }),

  /** Admin: get pricing page config */
  getPricingConfig: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_pricing' AND `key` = 'config' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  // ── About Page Content ─────────────────────────────────────────
  getAboutContent: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_about' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  updateAboutContent: adminOnly
    .input(z.object({
      heroTitle: z.string().max(200).optional(),
      heroSubtitle: z.string().max(500).optional(),
      missionText: z.string().max(2000).optional(),
      stats: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      values: z.array(z.object({ title: z.string(), desc: z.string(), icon: z.string().optional(), color: z.string().optional() })).optional(),
      milestones: z.array(z.object({ year: z.string(), event: z.string() })).optional(),
      team: z.array(z.object({ name: z.string(), role: z.string(), bio: z.string() })).optional(),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_about', 'content', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  // Public About content
  publicAboutContent: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_about' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  // ── Features Page Content ──────────────────────────────────────
  getFeaturesContent: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_features' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  updateFeaturesContent: adminOnly
    .input(z.object({
      heroTitle: z.string().max(200).optional(),
      heroBadge: z.string().max(100).optional(),
      heroSubtitle: z.string().max(500).optional(),
      sections: z.array(z.object({
        category: z.string(),
        desc: z.string().optional(),
        icon: z.string().optional(),
        features: z.array(z.string()),
      })).optional(),
      pillars: z.array(z.object({ title: z.string(), desc: z.string(), icon: z.string().optional() })).optional(),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_features', 'content', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  // Public Features content
  publicFeaturesContent: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_features' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  // ── Testimonials ──────────────────────────────────────────────
  getTestimonials: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_testimonials' AND `key` = 'items' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return [];
  }),

  updateTestimonials: adminOnly
    .input(z.array(z.object({
      id: z.string(),
      name: z.string().max(100),
      role: z.string().max(100).optional(),
      company: z.string().max(100).optional(),
      content: z.string().max(1000),
      rating: z.number().min(1).max(5).default(5),
      isVisible: z.boolean().default(true),
      avatarUrl: z.string().max(500).optional(),
    })))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_testimonials', 'items', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  publicTestimonials: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_testimonials' AND `key` = 'items' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) {
        const items = JSON.parse(arr[0].value);
        return items.filter((t: any) => t.isVisible !== false);
      }
    } catch { /* ignore */ }
    return [];
  }),

  // ── FAQ ────────────────────────────────────────────────────────
  getFAQs: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_faq' AND `key` = 'items' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return [];
  }),

  updateFAQs: adminOnly
    .input(z.array(z.object({
      id: z.string(),
      question: z.string().max(500),
      answer: z.string().max(2000),
      category: z.string().max(100).optional(),
      order: z.number().default(0),
      isVisible: z.boolean().default(true),
    })))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_faq', 'items', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  publicFAQs: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_faq' AND `key` = 'items' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) {
        const items = JSON.parse(arr[0].value);
        return items.filter((f: any) => f.isVisible !== false).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      }
    } catch { /* ignore */ }
    return [];
  }),

  // ── Blog ───────────────────────────────────────────────────────
  getBlogPosts: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_blog' AND `key` = 'posts' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return [];
  }),

  updateBlogPosts: adminOnly
    .input(z.array(z.object({
      id: z.string(),
      title: z.string().max(300),
      slug: z.string().max(300),
      excerpt: z.string().max(500).optional(),
      content: z.string().max(50000),
      author: z.string().max(100).optional(),
      category: z.string().max(100).optional(),
      tags: z.array(z.string()).optional(),
      coverImageUrl: z.string().max(500).optional(),
      isPublished: z.boolean().default(false),
      publishedAt: z.string().optional(),
      createdAt: z.string().optional(),
    })))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_blog', 'posts', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  publicBlogPosts: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return [];
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_blog' AND `key` = 'posts' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) {
        const posts = JSON.parse(arr[0].value);
        return posts.filter((p: any) => p.isPublished).sort((a: any, b: any) =>
          new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime()
        );
      }
    } catch { /* ignore */ }
    return [];
  }),

  // ── Hero / Landing Content ─────────────────────────────────────
  getHeroContent: adminOnly.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_hero' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  updateHeroContent: adminOnly
    .input(z.object({
      badge: z.string().max(100).optional(),
      title: z.string().max(300).optional(),
      subtitle: z.string().max(500).optional(),
      ctaPrimary: z.object({ label: z.string(), href: z.string() }).optional(),
      ctaSecondary: z.object({ label: z.string(), href: z.string() }).optional(),
      stats: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      if (!pool) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const value = JSON.stringify(input);
      await pool.query(
        `INSERT INTO systemSettings (id, category, \`key\`, value, dataType)
         VALUES (?, 'website_hero', 'content', ?, 'json')
         ON DUPLICATE KEY UPDATE value = ?`,
        [uuidv4(), value, value]
      );
      return { success: true };
    }),

  publicHeroContent: publicProcedure.query(async () => {
    const pool = getPool();
    if (!pool) return null;
    try {
      const [rows] = await pool.query(
        "SELECT value FROM systemSettings WHERE category = 'website_hero' AND `key` = 'content' LIMIT 1"
      );
      const arr = rows as any[];
      if (arr.length && arr[0].value) return JSON.parse(arr[0].value);
    } catch { /* ignore */ }
    return null;
  }),

  // ── Public: Submit contact / partner application ───────────────
  submitContact: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(255),
      company: z.string().max(255).optional(),
      phone: z.string().max(50).optional(),
      website: z.string().max(500).optional(),
      subject: z.string().max(500).optional(),
      message: z.string().min(1).max(10000),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      const id = uuidv4();
      const subject = input.subject || "Website Enquiry";
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO websiteContacts (id, name, email, company, phone, subject, message, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW())
             ON DUPLICATE KEY UPDATE id = id`,
            [id, input.name, input.email, input.company || null, input.phone || null, subject, input.message]
          );
        } catch (err) {
          // phone column may not exist — retry without it
          try {
            await pool.query(
              `INSERT INTO websiteContacts (id, name, email, company, subject, message, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())`,
              [id, input.name, input.email, input.company || null, subject, input.message]
            );
          } catch { /* ignore if table doesn't exist */ }
        }
      }
      return { success: true, message: "Thank you! We'll be in touch shortly." };
    }),

  // ── Public: Book a demo ───────────────────────────────────────
  bookDemo: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(255),
      company: z.string().max(255).optional(),
      phone: z.string().max(50).optional(),
      teamSize: z.string().max(50).optional(),
      message: z.string().max(2000).optional(),
      date: z.string().max(50),
      time: z.string().max(20),
      timezone: z.string().max(100),
      duration: z.number().int().min(15).max(120),
    }))
    .mutation(async ({ input }) => {
      const pool = getPool();
      const id = uuidv4();
      const subject = `Demo Booking – ${input.date} at ${input.time} (${input.timezone})`;
      const messageBody = [
        `Meeting: ${input.date} at ${input.time} ${input.timezone} (${input.duration} min)`,
        `Company: ${input.company || "—"}`,
        `Phone: ${input.phone || "—"}`,
        `Team size: ${input.teamSize || "—"}`,
        input.message ? `Notes: ${input.message}` : "",
      ].filter(Boolean).join("\n");

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO websiteContacts (id, name, email, company, phone, subject, message, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
            [id, input.name, input.email, input.company || null, input.phone || null, subject, messageBody]
          );
        } catch {
          try {
            await pool.query(
              `INSERT INTO websiteContacts (id, name, email, company, subject, message, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())`,
              [id, input.name, input.email, input.company || null, subject, messageBody]
            );
          } catch { /* ignore */ }
        }
      }
      return { success: true, message: "Demo booked! Check your email for a confirmation." };
    }),
});
