/**
 * Simple in-memory TTL cache for expensive DB queries.
 * Keys are scoped per-organization so tenant data never leaks.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds

/** Build a cache key from procedure name + org id + optional extra parts */
export function cacheKey(procedure: string, orgId: string | null | undefined, ...parts: (string | number | undefined)[]): string {
  return [procedure, orgId ?? '_global', ...parts.filter(p => p !== undefined)].join(':');
}

/** Get a cached value or compute it via the factory function */
export async function cached<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.data;
  }
  const data = await factory();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

/** Invalidate all entries whose key starts with the given prefix */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Invalidate a specific key */
export function invalidateKey(key: string): void {
  cache.delete(key);
}

/** Periodic cleanup of expired entries (runs every 60s) */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 60_000);
