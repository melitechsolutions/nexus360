/**
 * Shared rate limit configuration module.
 *
 * Exports:
 *  - TIER_RATE_LIMITS  — default per-tier request quotas
 *  - rateLimitConfig   — mutable global config (updated by ICT management UI)
 *  - createGlobalRateLimiter() — IP-based brute-force limiter using express-rate-limit
 *  - createTierRateLimiter()   — per-org async middleware that enforces tier quotas
 *  - getTierLimit()            — resolve effective limit for a tier (respects overrides)
 *  - getRateLimitStats()       — live stats from in-memory counters
 *  - invalidateOrgCache()      — flush cached user→org→tier lookups
 */
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { organizations, users } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export type SubscriptionTier =
  | "free"
  | "trial"
  | "starter"
  | "professional"
  | "enterprise"
  | "custom";

/** Default requests-per-window for each subscription tier (15-minute window). */
export const TIER_RATE_LIMITS: Record<
  SubscriptionTier,
  { requestsPerWindow: number; windowMs: number; label: string }
> = {
  free:         { requestsPerWindow: 300,   windowMs: 15 * 60 * 1000, label: "Free"         },
  trial:        { requestsPerWindow: 500,   windowMs: 15 * 60 * 1000, label: "Trial"        },
  starter:      { requestsPerWindow: 2_000, windowMs: 15 * 60 * 1000, label: "Starter"      },
  professional: { requestsPerWindow: 5_000, windowMs: 15 * 60 * 1000, label: "Professional" },
  enterprise:   { requestsPerWindow: 15_000,windowMs: 15 * 60 * 1000, label: "Enterprise"   },
  custom:       { requestsPerWindow: 15_000,windowMs: 15 * 60 * 1000, label: "Custom"       },
};

// ---------------------------------------------------------------------------
// Mutable global config — updated at runtime by ICT Management UI
// ---------------------------------------------------------------------------

export const rateLimitConfig = {
  /** Global IP-level ceiling per window (brute-force protection) */
  globalRequestsPerMinute: 5_000,
  /** Per-user ceiling per minute (per-org tier limiter key unit) */
  perUserRequestsPerMinute: 60,
  burstLimit: 100,
  /** Sliding window length in ms shared by both limiters */
  windowMs: 15 * 60 * 1000,
  whitelistedIPs: [] as string[],
  enabled: true,
  /**
   * Per-tier overrides.
   * When set, these values replace the TIER_RATE_LIMITS defaults.
   */
  tierOverrides: {} as Partial<Record<SubscriptionTier, number>>,
};

// ---------------------------------------------------------------------------
// In-memory user→org→tier cache (5-minute TTL)
// ---------------------------------------------------------------------------

interface UserOrgEntry {
  orgId: string;
  tier: SubscriptionTier;
  expiresAt: number;
}

const userOrgCache = new Map<string, UserOrgEntry>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

/** Flush cached user→org entries, optionally scoped to one orgId. */
export function invalidateOrgCache(orgId?: string): void {
  if (orgId) {
    for (const [key, val] of userOrgCache.entries()) {
      if (val.orgId === orgId) userOrgCache.delete(key);
    }
  } else {
    userOrgCache.clear();
  }
}

async function getUserOrgInfo(
  userId: string
): Promise<{ orgId: string; tier: SubscriptionTier }> {
  const now = Date.now();
  const cached = userOrgCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { orgId: cached.orgId, tier: cached.tier };
  }

  try {
    const db = await getDb();
    if (!db) return { orgId: "unknown", tier: "trial" };

    const [user] = await db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.organizationId) {
      return { orgId: "unknown", tier: "trial" };
    }

    const [org] = await db
      .select({ plan: organizations.plan })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const tier = (org?.plan as SubscriptionTier) ?? "trial";
    const result = { orgId: user.organizationId, tier };
    userOrgCache.set(userId, { ...result, expiresAt: now + USER_CACHE_TTL_MS });
    return result;
  } catch {
    return { orgId: "unknown", tier: "trial" };
  }
}

// ---------------------------------------------------------------------------
// JWT userId extraction (no signature verification — tRPC context does that)
// ---------------------------------------------------------------------------

function extractUserId(req: Request): string | null {
  try {
    const authHeader = req.headers["authorization"];
    let token: string | undefined;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader = req.headers.cookie ?? "";
      const match = cookieHeader.match(/app_session_id=([^;]+)/);
      token = match?.[1];
    }

    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return typeof payload?.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

function getClientIP(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? "unknown";
}

// ---------------------------------------------------------------------------
// Per-org sliding-window counters
// ---------------------------------------------------------------------------

interface OrgCounter {
  count: number;
  windowStart: number;
}

const orgCounters = new Map<string, OrgCounter>();
let blockedRequestsCount = 0;

// Periodically purge stale counters (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, c] of orgCounters.entries()) {
    if (now - c.windowStart > rateLimitConfig.windowMs * 2) {
      orgCounters.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Resolve the effective per-window request limit for a given tier. */
export function getTierLimit(tier: SubscriptionTier): number {
  const override = rateLimitConfig.tierOverrides[tier];
  if (override !== undefined) return override;
  return TIER_RATE_LIMITS[tier]?.requestsPerWindow ?? TIER_RATE_LIMITS.trial.requestsPerWindow;
}

/** Live stats from the in-memory counters. */
export function getRateLimitStats() {
  const now = Date.now();
  let totalTracked = 0;
  let totalRequests = 0;
  const topEntries: { key: string; count: number }[] = [];

  for (const [key, counter] of orgCounters.entries()) {
    if (now - counter.windowStart < rateLimitConfig.windowMs) {
      totalTracked++;
      totalRequests += counter.count;
      topEntries.push({ key, count: counter.count });
    }
  }

  topEntries.sort((a, b) => b.count - a.count);

  return {
    totalTrackedUsers: totalTracked,
    totalRequestsLastMinute: totalRequests,
    topUsers: topEntries.slice(0, 10).map((e) => ({
      userId: e.key,
      requests: e.count,
    })),
    blockedRequests: blockedRequestsCount,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Global IP-based rate limiter (brute-force protection).
 * Uses express-rate-limit v7; reads from rateLimitConfig at call time.
 */
export function createGlobalRateLimiter() {
  return rateLimit({
    windowMs: () => rateLimitConfig.windowMs,
    max: (req: Request) => {
      if (!rateLimitConfig.enabled) return 0; // 0 = unlimited in e-r-l v7
      const ip = getClientIP(req);
      if (rateLimitConfig.whitelistedIPs.includes(ip)) return 0;
      return rateLimitConfig.globalRequestsPerMinute;
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      if (req.path === "/health" || req.path === "/api/health") return true;
      return rateLimitConfig.whitelistedIPs.includes(getClientIP(req));
    },
    handler: (_req: Request, res: Response) => {
      blockedRequestsCount++;
      res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests from this IP. Please try again later.",
        },
      });
    },
  });
}

/**
 * Tier-aware per-org rate limiter.
 * Decodes the JWT userId, looks up org + plan (cached 5 min), then enforces
 * the tier's per-window quota with an in-memory sliding window counter.
 *
 * Mount this on /api/trpc (or the full app) after the global limiter.
 */
export function createTierRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!rateLimitConfig.enabled) return next();

    const ip = getClientIP(req);
    if (rateLimitConfig.whitelistedIPs.includes(ip)) return next();
    if (req.path === "/health" || req.path === "/api/health") return next();

    const now = Date.now();
    const userId = extractUserId(req);

    let rateKey: string;
    let limit: number;
    let tierLabel: string | undefined;

    if (userId) {
      const { orgId, tier } = await getUserOrgInfo(userId);
      rateKey = `org:${orgId}`;
      limit = getTierLimit(tier);
      tierLabel = tier;
    } else {
      rateKey = `ip:${ip}`;
      limit = getTierLimit("free");
      tierLabel = "free";
    }

    let counter = orgCounters.get(rateKey);
    // Reset if window has expired
    if (!counter || now - counter.windowStart >= rateLimitConfig.windowMs) {
      counter = { count: 0, windowStart: now };
    }

    counter.count++;
    orgCounters.set(rateKey, counter);

    const remaining = Math.max(0, limit - counter.count);
    const resetAt = counter.windowStart + rateLimitConfig.windowMs;

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

    if (counter.count > limit) {
      blockedRequestsCount++;
      return res.status(429).json({
        error: {
          code: "TIER_RATE_LIMIT_EXCEEDED",
          message:
            "API rate limit exceeded for your subscription tier. Please upgrade your plan or wait for the window to reset.",
          tier: tierLabel,
          retryAfter: Math.ceil((resetAt - now) / 1000),
        },
      });
    }

    next();
  };
}
