/**
 * In-memory metrics collector for system health monitoring.
 * Tracks request counts, response times, errors, and DB queries.
 */

interface MetricsBucket {
  timestamp: number;
  requests: number;
  errors: number;
  totalResponseTime: number;
  dbQueries: number;
}

const BUCKET_DURATION_MS = 60_000; // 1 minute per bucket
const MAX_BUCKETS = 60 * 24; // Keep 24 hours of data

let buckets: MetricsBucket[] = [];
let activeConnections = 0;
let cacheHits = 0;
let cacheMisses = 0;

function getCurrentBucket(): MetricsBucket {
  const now = Date.now();
  const bucketTs = now - (now % BUCKET_DURATION_MS);
  if (buckets.length === 0 || buckets[buckets.length - 1].timestamp !== bucketTs) {
    const bucket: MetricsBucket = {
      timestamp: bucketTs,
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      dbQueries: 0,
    };
    buckets.push(bucket);
    // Prune old buckets
    if (buckets.length > MAX_BUCKETS) {
      buckets = buckets.slice(-MAX_BUCKETS);
    }
    return bucket;
  }
  return buckets[buckets.length - 1];
}

function getBucketsForPeriod(period: string): MetricsBucket[] {
  const now = Date.now();
  const durations: Record<string, number> = {
    "1h": 60 * 60_000,
    "24h": 24 * 60 * 60_000,
    "7d": 7 * 24 * 60 * 60_000,
    "30d": 30 * 24 * 60 * 60_000,
  };
  const cutoff = now - (durations[period] || durations["24h"]);
  return buckets.filter((b) => b.timestamp >= cutoff);
}

export const metricsCollector = {
  recordRequest(responseTimeMs: number, isError: boolean) {
    const bucket = getCurrentBucket();
    bucket.requests++;
    bucket.totalResponseTime += responseTimeMs;
    if (isError) bucket.errors++;
  },

  recordDbQuery() {
    getCurrentBucket().dbQueries++;
  },

  recordCacheHit() {
    cacheHits++;
  },

  recordCacheMiss() {
    cacheMisses++;
  },

  incrementConnections() {
    activeConnections++;
  },

  decrementConnections() {
    activeConnections = Math.max(0, activeConnections - 1);
  },

  getMetrics(period: string = "24h") {
    const relevantBuckets = getBucketsForPeriod(period);
    if (relevantBuckets.length === 0) {
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
        activeConnections,
        databaseQueries: 0,
        cacheHitRate: 0,
      };
    }

    const totalRequests = relevantBuckets.reduce((s, b) => s + b.requests, 0);
    const totalErrors = relevantBuckets.reduce((s, b) => s + b.errors, 0);
    const totalResponseTime = relevantBuckets.reduce((s, b) => s + b.totalResponseTime, 0);
    const totalDbQueries = relevantBuckets.reduce((s, b) => s + b.dbQueries, 0);
    const minutesElapsed = Math.max(1, relevantBuckets.length);
    const totalCacheOps = cacheHits + cacheMisses;

    return {
      requestsPerMinute: Math.round(totalRequests / minutesElapsed),
      averageResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
      errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
      activeConnections,
      databaseQueries: totalDbQueries,
      cacheHitRate: totalCacheOps > 0 ? Math.round((cacheHits / totalCacheOps) * 100 * 100) / 100 : 100,
    };
  },
};
