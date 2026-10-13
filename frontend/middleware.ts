import { NextRequest, NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

// Short in-memory cache so a maintenance-mode check doesn't add a backend round trip to every
// single storefront page view -- a module-level variable in a Next.js middleware isolate persists
// across requests handled by that same warm instance, which is good enough here: toggling
// maintenance mode just takes up to this long to actually show up for customers already browsing.
const CACHE_MS = 10_000;
let cached: { enabled: boolean; message: string | null; fetchedAt: number } | null = null;

async function getMaintenanceStatus(): Promise<{ enabled: boolean; message: string | null }> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached;
  }
  try {
    const res = await fetch(`${API_BASE}/api/settings/maintenance`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    cached = { enabled: !!data.enabled, message: data.message ?? null, fetchedAt: Date.now() };
    return cached;
  } catch {
    // Backend unreachable or erroring -- fail OPEN. A flaky health check should never be the thing
    // that accidentally takes the whole storefront down; that's what the admin's own explicit
    // toggle is for.
    return { enabled: false, message: null };
  }
}

export async function middleware(request: NextRequest) {
  const { enabled, message } = await getMaintenanceStatus();
  if (!enabled) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  if (message) url.searchParams.set('message', message);
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except: the admin console (its own login still has to work so Jess can turn this
  // back off), the maintenance page itself (would otherwise rewrite-loop), Next's internals/static
  // assets, and the files search engines/crawlers fetch directly.
  matcher: ['/((?!admin|maintenance|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)']
};
