import { withSentryConfig } from '@sentry/nextjs/config';

const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Mitigates the admin JWT living in localStorage (see lib/auth.ts) by blocking the two things that
// would actually let an attacker read it -- script injection and being framed. There's no known XSS
// injection point in this codebase today (no dangerouslySetInnerHTML anywhere), so this is defense
// in depth rather than a fix for a known hole. 'unsafe-inline' on script/style is Next.js's own
// hydration/dev requirements, not something introduced here.
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "img-src 'self' data: https: http:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'"
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ];
  }
};

// withSentryConfig only adds source-map upload at build time (needs SENTRY_ORG/SENTRY_PROJECT/
// SENTRY_AUTH_TOKEN to actually upload anything) -- harmless no-op locally without those set.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true
});
