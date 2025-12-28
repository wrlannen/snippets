/**
 * Snippets Server
 * 
 * A minimal Express server that serves static files with security headers.
 * All application logic runs client-side; this server only provides:
 * - Static file serving with caching
 * - Security headers (CSP, X-Frame-Options, etc.)
 * - Gzip compression (all files, no size threshold)
 * - Health check endpoint
 * 
 * For production, consider using nginx or Caddy for even lower resource usage.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

// =============================================================================
// Security Headers Middleware
// =============================================================================

app.use((req, res, next) => {
  // Content Security Policy - restrict resource loading sources
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  
  res.setHeader("X-Frame-Options", "DENY");                              // Prevent clickjacking
  res.setHeader("X-Content-Type-Options", "nosniff");                    // Prevent MIME sniffing
  res.setHeader("X-XSS-Protection", "1; mode=block");                    // Legacy XSS protection
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");   // Control referrer info
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()"); // Disable unused APIs
  
  next();
});

// =============================================================================
// Static File Serving
// =============================================================================

// Enable gzip compression for all responses
app.use(compression({
  threshold: 0,  // Compress everything, even small responses
  filter: () => true  // Compress all content types
}));

// Serve static files with appropriate cache headers
app.use(express.static(publicDir, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
      // No cache for HTML and manifest - always check for updates
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      // Short cache for JS/CSS - revalidate after 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else {
      // Longer cache for images/fonts (7 days)
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// =============================================================================
// Routes
// =============================================================================

// Health check endpoint for monitoring/orchestration
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// SPA fallback - serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// =============================================================================
// Server Start
// =============================================================================

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Snippets app running at http://${HOST}:${PORT}`);
});
