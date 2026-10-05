import * as Sentry from '@sentry/nextjs';

// An empty/undefined DSN makes the SDK a no-op -- safe to leave unset locally; only reports errors
// once NEXT_PUBLIC_SENTRY_DSN is set to a real Sentry project DSN in production.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'local',
  tracesSampleRate: 0
});
