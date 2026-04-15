import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sseHandler } from "../sse";
import { setupPaymentWebhooks } from "../lib/paymentWebhooks";
import { serveStatic, setupVite } from "./vite";
import * as path from "path";
import * as fs from "fs";
import { initializeScheduledJobs } from "../jobs/invoiceReminders";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Note: Default permissions and roles are managed via the DB schema and migrations
  // Commenting out deprecated initialization that was never implemented
  // console.log("[DATABASE] Initializing default permissions and roles...");
  // await initializeDefaultPermissionsAndRoles();
  
  // Initialize scheduled jobs
  console.log("[SCHEDULER] Initializing scheduled jobs...");
  const scheduledJobs = initializeScheduledJobs();
  
  // security & parsing middleware
  app.use(cookieParser());

  // Configure body parser with larger size limit for file uploads BEFORE CSRF
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Configure rate limiting - much more permissive for internal CRM usage
  // Production environments should use per-user rate limiting instead of per-IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5000, // Increased from 500 to 5000 per 15 min (much more reasonable for CRM)
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === "/health" || req.path === "/api/health";
      },
      handler: (req, res) => {
        // Return proper JSON response instead of HTML
        res.status(429).json({
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests, please try again later",
            retryAfter: req.rateLimit?.resetTime ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : 60,
          },
        });
      },
    })
  );

  // CSRF protection - disable completely for JSON APIs
  // The application uses JWT token authentication for APIs, not session cookies
  // CSRF tokens are only useful against cross-site form attacks, not for API requests
  // Therefore, disable CSRF middleware entirely since all tRPC requests are JSON-based
  
  console.log(`[STARTUP] CSRF protection: DISABLED (using JWT token auth for APIs)`);

  // request sanitization helper (to be used selectively)
  app.use((req, res, next) => {
    // sanitize all string query params
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        req.query[key] = sanitizeHtml(req.query[key] as string, { allowedTags: [], allowedAttributes: {} });
      }
    }
    next();
  });
  
  // Set a proper Content-Security-Policy header to allow the app to function
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' https: http://localhost:* ws://localhost:* wss://localhost:*; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
    next();
  });
  // OAuth callback under /api/oauth/callback

  // session inactivity logout (10min) - placeholder implementation
  app.use((req, res, next) => {
    if (req.session && req.session.user) {
      const now = Date.now();
      const last = req.session.lastActivity || now;
      if (now - last > 10 * 60 * 1000) {
        // clear session/user; actual mechanism depends on auth implementation
        delete req.session.user;
        return res.status(440).send({ message: "Logged out due to inactivity" });
      }
      req.session.lastActivity = now;
    }
    next();
  });
  registerOAuthRoutes(app);
  
  // Setup payment webhooks (Stripe & M-Pesa) - MUST be before tRPC middleware and JSON parser
  setupPaymentWebhooks(app);

  // Real-time SSE notifications endpoint (before tRPC)
  app.get("/api/sse/notifications", sseHandler);

  // Serve uploaded documents
  const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use("/uploads", express.static(uploadDir));

  
  // Error logging middleware for API requests
  app.use("/api", (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (data?.code || res.statusCode >= 400) {
        console.log(`[API ${req.method}] ${req.path} - Status: ${res.statusCode}`, data);
      }
      return originalJson.call(this, data);
    };
    next();
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Global error handler middleware - catches all unhandled errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Error Handler]", err);
    
    // Don't override the status code if it's already been set
    if (!res.headersSent) {
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || "Internal Server Error";
      
      // Always return JSON for API requests
      if (req.path.startsWith("/api")) {
        res.status(statusCode).json({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: message,
            ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
          },
        });
      } else {
        // For non-API routes, return HTML error page
        res.status(statusCode).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Error ${statusCode}</title></head>
            <body>
              <h1>Error ${statusCode}</h1>
              <p>${message}</p>
            </body>
          </html>
        `);
      }
    }
  });
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
