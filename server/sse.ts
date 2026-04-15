import type { Response } from "express";
import { sdk } from "./_core/sdk";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SseNotification {
  id: string;
  type:
    | "invoice_paid"
    | "invoice_created"
    | "expense_approved"
    | "new_client"
    | "task_completed"
    | "payment_received"
    | "project_created"
    | "info";
  title: string;
  body: string;
  href?: string;
  timestamp: string;
}

// ─── Per-org subscriber registry ───────────────────────────────────────────

// Key: organizationId (stringified) OR "user_<userId>" for platform-level users
const sseClients = new Map<string, Set<Response>>();

function addClient(orgId: string, res: Response) {
  if (!sseClients.has(orgId)) sseClients.set(orgId, new Set());
  sseClients.get(orgId)!.add(res);
}

function removeClient(orgId: string, res: Response) {
  sseClients.get(orgId)?.delete(res);
  if (sseClients.get(orgId)?.size === 0) sseClients.delete(orgId);
}

// ─── Emitters ───────────────────────────────────────────────────────────────

/**
 * Send a notification to all connected clients in an org.
 * Safe to call from any tRPC router after a mutation.
 */
export function notifyOrg(orgId: number | string, event: SseNotification) {
  const key = String(orgId);
  const clients = sseClients.get(key);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // client disconnected mid-write; cleanup is handled by the 'close' event
    }
  }
}

/**
 * Send a notification to a specific user by their user ID.
 * Used for users who have no organizationId (e.g. platform admins).
 */
export function notifyUser(userId: string, event: SseNotification) {
  notifyOrg(`user_${userId}`, event);
}

// ─── Express route handler ──────────────────────────────────────────────────

/**
 * Register this BEFORE tRPC middleware in the main server file:
 *   app.get('/api/sse/notifications', sseHandler);
 */
export async function sseHandler(req: any, res: Response) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  // EventSource can't set custom headers, so we also accept ?token= query param
  // (short-lived use: it's the same JWT the client already has from localStorage)
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;

  let user: any = null;
  try {
    if (queryToken) {
      // Override the Authorization header with the query param token so
      // sdk.authenticateRequest can pick it up via its Bearer-token path
      const syntheticReq = {
        ...req,
        headers: {
          ...req.headers,
          authorization: `Bearer ${queryToken}`,
        },
      };
      user = await sdk.authenticateRequest(syntheticReq as any);
    } else {
      user = await sdk.authenticateRequest(req);
    }
  } catch {
    // ignore auth errors — treat as unauthenticated
  }

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Users with an organizationId are scoped to their org channel.
  // Platform-level admins (no organizationId) get a personal channel keyed by userId.
  const orgId = user.organizationId
    ? String(user.organizationId)
    : `user_${user.id}`;

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  // Prevent browser from reusing the SSE socket for other requests after it drops.
  // Also disables the idle socket timeout so the long-lived connection isn't killed.
  const sock = (req as any).socket;
  if (sock) {
    sock.setTimeout(0);
    sock.setNoDelay(true);
    sock.setKeepAlive(true, 0);
  }
  res.flushHeaders();

  // Send initial connection acknowledgement with retry hint
  res.write(
    `retry: 5000\ndata: ${JSON.stringify({
      id: `init-${Date.now()}`,
      type: "info",
      title: "Connected",
      body: "Real-time notifications active",
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Register client
  addClient(orgId, res);

  // Heartbeat every 15 s to keep connection alive through proxies / load balancers
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  // Clean up when client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(orgId, res);
  });
}
