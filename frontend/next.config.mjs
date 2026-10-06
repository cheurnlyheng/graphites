import { withSentryConfig } from '@sentry/nextjs/config';

// Stripped of any trailing slash -- a CSP source like "https://api.graphites.world/" (with the
// slash) only matches that exact root path, not the whole origin, silently blocking every real
// API call.
const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

// Mitigates the admin JWT living in localStorage (see lib/auth.ts) by blocking the two things that
// would actually let an attacker read it -- script injection and being framed. There's no known XSS
// injection point in this codebase today (no dangerouslySetInnerHTML anywhere), so this is defense
// in depth rather than a fix for a known hole. 'unsafe-inline' on script/style is Next.js's own
// hydration/dev requirements, not something introduced here.
const csp = [
  "default-src 'self'",
  // api.stripe.com: Stripe.js's own API calls (tokenizing card details, polling the embedded
  // checkout session). Without this, those requests are silently blocked by the browser.
  `connect-src 'self' ${apiOrigin} https://api.stripe.com`,
  "img-src 'self' data: https: http:",
  // js.stripe.com: Stripe.js itself -- blocked by the default self-only policy, which is exactly
  // why embedded checkout failed to load before this was added.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  // The embedded checkout payment form (card fields, 3DS challenges) renders inside a Stripe-hosted
  // iframe -- with no frame-src set, that falls back to default-src 'self' and gets blocked too.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
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
