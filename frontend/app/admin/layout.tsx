'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAdminAuth, getAdminAuth } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25-2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        )
      },
      {
        href: '/admin/reports',
        label: 'Reports',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'Catalog & Store',
    items: [
      {
        href: '/admin/products',
        label: 'Products',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        )
      },
      {
        href: '/admin/categories',
        label: 'Categories',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        )
      },
      {
        href: '/admin/home-sections',
        label: 'Homepage Blocks',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'Fulfillment',
    items: [
      {
        href: '/admin/orders',
        label: 'Orders',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        )
      },
      {
        href: '/admin/returns',
        label: 'Returns & Claims',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'Supply Chain',
    items: [
      {
        href: '/admin/suppliers',
        label: 'Suppliers',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
        )
      },
      {
        href: '/admin/purchase-orders',
        label: 'Restock Orders',
        icon: (active) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )
      }
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Both start empty on the server AND on the client's first render (localStorage only exists in the browser, so
  // reading it in the initial state made the client render the full admin shell where the server had rendered
  // nothing -- a hydration mismatch on every admin page, and the Next.js "1 Issue" badge). The effect below fills
  // them in right after mount.
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    if (!adminEmail) {
      setAdminEmail(auth.email);
    }
    if (!ready) {
      setReady(true);
    }
  }, [pathname, router, adminEmail, ready]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === '/admin/login') {
    return <div className="flex min-h-screen items-center justify-center bg-[#10100F] px-4 font-sans">{children}</div>;
  }
  if (!ready) return null;

  // Find active item label for breadcrumbs
  let currentLabel = 'Console';
  for (const sec of navSections) {
    for (const itm of sec.items) {
      if (itm.href === '/admin' ? pathname === '/admin' : pathname.startsWith(itm.href)) {
        currentLabel = itm.label;
      }
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#10100F] text-white border-r border-white/10 select-none font-sans">
      {/* Brand Header - Matches Storefront Pill Style */}
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group">
            <span className="inline-flex items-center justify-center rounded-full bg-white/15 group-hover:bg-white px-3.5 py-1.5 border border-white/15 transition-all text-xs font-black tracking-tight text-white group-hover:text-[#10100F] uppercase">
              GRAPHITES
            </span>
            <div>
              <span className="text-xs font-bold tracking-wider text-white uppercase block leading-none">
                STUDIO
              </span>
              <span className="text-[10px] text-white/40 tracking-wider uppercase block mt-1">
                Operations
              </span>
            </div>
          </Link>

          <Link
            href="/"
            target="_blank"
            title="Open customer storefront"
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Middle Navigation - Clean sans-serif typography */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              {section.title}
            </span>
            <div className="space-y-0.5 pt-0.5">
              {section.items.map((item) => {
                const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs tracking-tight transition-colors duration-150 outline-none select-none ${
                      isActive
                        ? 'bg-white/15 text-white font-bold shadow-xs border border-white/10'
                        : 'text-white/60 font-medium hover:bg-white/[0.08] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-white/50'}>
                        {item.icon(isActive)}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-semibold text-white/90">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pinned Bottom User & Exit Area - ALWAYS in view, never scrolls away! */}
      <div className="shrink-0 border-t border-white/10 p-3.5 bg-[#0a0a09]">
        <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-700 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate leading-tight">
                {adminEmail || 'Admin'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Manager
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              clearAdminAuth();
              router.push('/admin/login');
            }}
            title="Log out of Admin"
            className="p-2 text-white/50 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-all shrink-0 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#10100F] text-[#10100F] font-sans antialiased">
      {/* Desktop Sticky Sidebar (Permanent, 100% height, never scrolls with page) */}
      <aside className="hidden md:flex w-64 lg:w-72 h-full shrink-0 flex-col z-30 bg-[#10100F]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Container - Full height, flex-col, content scrolls independently */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#fbfbfb]">
        {/* Top Header - Fixed at top of main view */}
        <header className="h-14 sm:h-16 shrink-0 border-b border-[#e5ded2] bg-white/80 backdrop-blur-md px-4 sm:px-8 lg:px-10 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-[#10100F]/70 hover:text-[#10100F] rounded-md hover:bg-black/5"
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumb Navigation - Clean sans-serif */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-tight">
              <span className="text-[#10100F]/40 uppercase font-medium">Admin</span>
              <span className="text-[#10100F]/20">/</span>
              <span className="text-[#10100F] font-bold uppercase">{currentLabel}</span>
            </div>
          </div>

          {/* Right Header Status & Store Link */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Production Live</span>
            </div>

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-[#f3f3f1] border border-black/5 shadow-sm px-4 py-1.5 text-xs font-bold uppercase tracking-tight text-[#10100F] transition-all active:scale-95"
            >
              <span>View Store</span>
              <span className="text-xs">↗</span>
            </Link>
          </div>
        </header>

        {/* Content Viewport - INDEPENDENT SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 scrollbar-thin bg-[#fbfbfb]">
          {children}
        </main>
      </div>
    </div>
  );
}
