// PWD – functions/_middleware.js
// Applies security headers to every response (static + API).
// Also handles OPTIONS preflight centrally so all routes — including
// future API endpoints — get correct CORS behaviour automatically.

// CORS headers applied uniformly to every response.
// The API is intentionally open (*) to support browser extensions and
// third-party integrations.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
  // Vary: Origin tells CDNs and proxies that the response may differ by
  // origin, preventing a cached open-CORS response from being served to a
  // request that expects a restricted one (and vice-versa).
  "Vary": "Origin",
};

export async function onRequest(context) {
  const { request } = context;

  // ── Handle OPTIONS preflight centrally for all routes.
  // This covers /api/generate and any future endpoints without each
  // function needing its own onRequestOptions export.
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = await context.next();
  const headers  = new Headers(response.headers);

  // ── CORS — applied to every response so static assets and API are consistent.
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }

  // ── Content Security Policy
  // Allows Google Fonts (preconnect + stylesheet) + self for everything else.
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "));

  headers.set("X-Frame-Options",            "DENY");
  headers.set("X-Content-Type-Options",     "nosniff");
  // X-XSS-Protection intentionally omitted — removed from living standard;
  // the mode=block behaviour was itself exploitable in some older browsers.
  headers.set("Referrer-Policy",            "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy",         "geolocation=(), microphone=(), camera=(), payment=()");
  headers.set("Strict-Transport-Security",  "max-age=31536000; includeSubDomains; preload");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // CORP is relaxed to cross-origin here because the API is public.
  // The restrictive same-site value would block legitimate browser-extension
  // and third-party fetch() calls.
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // ── Cache-Control
  // HTML documents (the index page) must never be cached — they reference
  // hashed asset filenames and a stale document would break the app.
  // JS and CSS assets are safe to cache; they carry no sensitive data.
  const url         = new URL(request.url);
  const isHTML      = url.pathname === "/" || url.pathname.endsWith(".html");
  const isAPIRoute  = url.pathname.startsWith("/api/");
  if (isHTML || isAPIRoute) {
    headers.set("Cache-Control", "no-store");
  }

  return new Response(response.body, {
    status:  response.status,
    headers,
  });
}
