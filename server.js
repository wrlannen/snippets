
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

// Security headers middleware
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Enable XSS protection (legacy, but doesn't hurt)
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// Gzip compression to reduce memory and bandwidth usage
app.use(compression());

// Serve static files with cache control and efficient streaming
app.use(express.static(publicDir, {
  maxAge: '30d', // Cache static assets for 30 days
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // No cache for HTML files
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// SPA-ish fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Snippets app running at http://${HOST}:${PORT}`);
});
