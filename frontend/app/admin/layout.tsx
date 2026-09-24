'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAdminAuth, getAdminAuth } from '@/lib/auth';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/returns', label: 'Returns' },
  { href: '/admin/suppliers', label: 'Suppliers' },
  { href: '/admin/purchase-orders', label: 'Restock' }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true);
      return;
    }
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <div className="flex min-h-screen items-center justify-center bg-ink px-4">{children}</div>;
  }
  if (!ready) return null;

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-56 shrink-0 flex-col bg-ink text-paper">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-heading text-lg font-semibold">Jess&apos;s Shop</p>
          <p className="text-xs uppercase tracking-widest text-paper/40">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 text-sm">
          {links.map((l) => {
            const isActive = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-md px-3 py-2 transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-paper/70 hover:bg-white/10 hover:text-paper'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => {
              clearAdminAuth();
              router.push('/admin/login');
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-paper/50 transition-colors hover:bg-white/10 hover:text-paper"
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="flex-1 px-8 py-8">{children}</div>
    </div>
  );
}
