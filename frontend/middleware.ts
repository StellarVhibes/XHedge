import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Generates a cryptographically random nonce for CSP using the Web Crypto API
 * (compatible with the Edge Runtime).
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

/**
 * Builds a strict Content-Security-Policy header value.
 * Uses a per-request nonce for inline scripts to prevent XSS.
 */
function buildCsp(nonce: string): string {
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      // Next.js requires 'strict-dynamic' for its runtime chunks
      "'strict-dynamic'",
    ].join(" "),
    "style-src": [
      "'self'",
      // Tailwind / inline styles injected by Next.js
      "'unsafe-inline'",
    ].join(" "),
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      // CoinGecko asset images
      "https://assets.coingecko.com",
    ].join(" "),
    "font-src": "'self'",
    "connect-src": [
      "'self'",
      // Stellar network endpoints
      "https://horizon.stellar.org",
      "https://horizon-testnet.stellar.org",
      "https://horizon-futurenet.stellar.org",
      "https://rpc.mainnet.stellar.org",
      "https://rpc.testnet.stellar.org",
      "https://rpc-futurenet.stellar.org",
      // CoinGecko price API
      "https://api.coingecko.com",
    ].join(" "),
    "frame-src": "'none'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "upgrade-insecure-requests": "",
  };

  return Object.entries(directives)
    .map(([key, value]) => (value ? `${key} ${value}` : key))
    .join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  // Pass nonce to the page so Next.js can inject it into <script> tags
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("content-security-policy", csp);
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "strict-transport-security",
    "max-age=63072000; includeSubDomains; preload"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
