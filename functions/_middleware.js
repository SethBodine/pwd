// PWD – functions/_middleware.js
// Applies security headers to every response (static + API)

export async function onRequest(context) {
  const response = await context.next();

  const headers = new Headers(response.headers);

  // Content Security Policy
  // Allows Google Fonts (preconnect + stylesheet) + self for everything else
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; "));

  headers.set("X-Frame-Options",           "DENY");
  headers.set("X-Content-Type-Options",    "nosniff");
  headers.set("X-XSS-Protection",          "1; mode=block");
  headers.set("Referrer-Policy",           "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy",        "geolocation=(), microphone=(), camera=(), payment=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("Cross-Origin-Opener-Policy","same-origin");
  headers.set("Cross-Origin-Resource-Policy","same-site");

  return new Response(response.body, {
    status:  response.status,
    headers
  });
}
