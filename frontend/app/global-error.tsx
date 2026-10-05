'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/** Next.js only calls this for errors thrown in the root layout itself (everywhere else, a nested
 * error.tsx would catch it first -- this project doesn't have one yet, so unhandled errors in any
 * page currently bubble up to here too). Reports to Sentry (a no-op until SENTRY_DSN is set) and
 * shows a plain fallback instead of a blank white screen. */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#fbfbfb] px-4 text-center font-sans text-[#10100F]">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#10100F]/60">
            We&apos;ve been notified. Please refresh the page or try again shortly.
          </p>
        </div>
      </body>
    </html>
  );
}
