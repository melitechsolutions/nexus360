import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple possible paths for the dist directory
  const possiblePaths = [
    // Absolute path based on process.cwd()
    path.join(process.cwd(), "dist", "public"),
    // dist directly (Vite outputs here when outDir = dist)
    path.join(process.cwd(), "dist"),
    // Relative to this file's directory (in unbundled development)
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
    path.resolve(import.meta.dirname, "..", "dist"),
    // Same directory as the running bundle (when index.js is in dist/)
    import.meta.dirname,
    // Absolute path for Docker container
    "/app/dist/public",
  ];

  let distPath = possiblePaths[0];
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      console.log(`[Static] Serving assets from: ${distPath}`);
      break;
    }
  }

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory. Tried:`,
      possiblePaths.join(", "),
      `Make sure to build the client first`
    );
  }

  // Serve hashed Vite assets with long-lived cache (immutable fingerprinted files)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
    extensions: ["html"],
    dotfiles: "allow",
  }));

  // Serve remaining static files with short cache
  app.use(express.static(distPath, {
    extensions: ["html"],
    dotfiles: "allow",
    maxAge: "10m",
  }));

  // Only fall through to index.html for non-asset routes. This prevents
  // requests for module files (e.g. /src/main.tsx) from being rewritten to
  // the SPA index.html which would return text/html instead of a JS module.
  app.get("*", (req, res) => {
    const p = req.path || req.url || "";
    // If the request looks like an asset (has an extension or is in /assets),
    // let the static middleware return 404 instead of serving index.html.
    if (path.extname(p) || p.startsWith("/assets/") || p.startsWith("/src/") || p.startsWith("/api/")) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
