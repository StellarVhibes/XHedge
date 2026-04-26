import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
  runtimeCaching: [
    // Cache API responses with stale-while-revalidate strategy
    {
      urlPattern: /^https:\/\/api\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "xhedge-api-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache vault data responses
    {
      urlPattern: /^https:\/\/.*\/vault.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "xhedge-vault-cache",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache images
    {
      urlPattern: /^https:\/\/.+\.(png|jpg|jpeg|svg|gif|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "xhedge-images",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Cache static assets
    {
      urlPattern: /^https:\/\/.+\.(js|css|woff|woff2)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "xhedge-static",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {},
  images: {
    domains: [],
    unoptimized: false,
  },
  // Security headers are now managed by middleware.ts (CSP with nonce support).
  // Keeping static fallback headers here for environments that bypass middleware.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
