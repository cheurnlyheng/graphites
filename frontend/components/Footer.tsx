'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  }

  return (
    <footer className="w-full bg-[#10100F] text-white font-sans antialiased border-t border-white/10 selection:bg-white selection:text-[#10100F] relative overflow-hidden">
      {/* 1. Value Pillars Bar */}
      <div className="border-b border-white/10 py-12 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1700px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Pillar 1 */}
          <div className="flex items-start gap-4 group">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white group-hover:bg-white group-hover:text-[#10100F] transition-all shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Secure Checkout
              </h3>
              <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                Payments are processed securely through Stripe. We never see or store your card details.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="flex items-start gap-4 group">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white group-hover:bg-white group-hover:text-[#10100F] transition-all shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Guest Checkout
              </h3>
              <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                No account needed -- check out in seconds and track your order right from your email.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="flex items-start gap-4 group">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white group-hover:bg-white group-hover:text-[#10100F] transition-all shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                30-Day Returns
              </h3>
              <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                Accepted within 30 days of delivery on unworn items with tags attached.
              </p>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="flex items-start gap-4 group">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white group-hover:bg-white group-hover:text-[#10100F] transition-all shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Tracked Shipping
              </h3>
              <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                Every order ships with tracking and automatic email updates until it arrives.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Newsletter Collective Section */}
      <div className="border-b border-white/10 py-16 px-4 sm:px-8 lg:px-12 bg-white/[0.02]">
        <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center justify-between">
          <div className="lg:col-span-6 space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Join The List
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              Stay in the loop.
            </h2>
            <p className="text-sm text-white/60 max-w-xl leading-relaxed">
              New drops, restocks, and the occasional sale -- straight to your inbox, nothing else.
            </p>
          </div>

          <div className="lg:col-span-6 lg:max-w-xl lg:ml-auto w-full">
            {subscribed ? (
              <div className="flex items-center gap-3 p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[#10100F] font-black text-sm">
                  ✓
                </span>
                <span>You&apos;re subscribed -- we&apos;ll email you about new drops and sales.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl sm:rounded-full border border-white/20 bg-white/[0.05] focus-within:border-white/60 focus-within:bg-white/[0.08] transition-all">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address…"
                    className="w-full bg-transparent px-5 py-3 text-xs text-white placeholder:text-white/40 focus:outline-none font-sans"
                  />
                  <button
                    type="submit"
                    className="rounded-xl sm:rounded-full bg-white text-[#10100F] px-8 py-3 text-xs font-extrabold uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    Join
                  </button>
                </div>
                <p className="px-5 text-[11px] text-white/40">
                  By subscribing, you agree to receive marketing emails. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Columns */}
      <div className="py-16 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1700px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-10">
          {/* Brand Info */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-black tracking-[0.2em] text-[#10100F] uppercase shadow-sm group-hover:bg-neutral-200 transition-colors">
                GRAPHITES
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                Vintage-Inspired Clothing
              </span>
            </Link>

            <p className="text-xs text-white/60 max-w-sm leading-relaxed">
              A small boutique of vintage-inspired tees, hoodies, and pants -- picked and packed by hand, one order at a time.
            </p>

            <div className="space-y-2 pt-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold text-white/70">
                <span>Based in Davis, CA · USD ($)</span>
              </div>
            </div>
          </div>

          {/* Column: Catalog */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              Collections
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li>
                <Link href="/products" className="hover:text-white transition-colors block">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?search=shirt" className="hover:text-white transition-colors block">
                  T-Shirts
                </Link>
              </li>
              <li>
                <Link href="/products?search=hoodie" className="hover:text-white transition-colors block">
                  Hoodies
                </Link>
              </li>
              <li>
                <Link href="/products?search=pant" className="hover:text-white transition-colors block">
                  Pants
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Client Care */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li>
                <Link href="/cart" className="hover:text-white transition-colors block">
                  Cart &amp; Order Checkout
                </Link>
              </li>
              <li>
                <Link href="/returns-policy" className="hover:text-white transition-colors block">
                  Returns &amp; Refunds
                </Link>
              </li>
              <li>
                <Link href="/returns-policy" className="hover:text-white transition-colors block">
                  Shipping Info
                </Link>
              </li>
              <li>
                <a href="mailto:graphites.world@gmail.com" className="hover:text-white transition-colors block">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* Column: About */}
          <div className="col-span-2 md:col-span-4 lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              About
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li>
                <Link href="/admin" className="hover:text-white transition-colors inline-flex items-center gap-1.5 font-bold text-white/80">
                  <span>Operations Console</span>
                  <span className="text-[10px]">↗</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Bottom Sub-Footer: Legal, Payments & Copyright */}
      <div className="border-t border-white/10 py-8 px-4 sm:px-8 lg:px-12 bg-[#0a0a09]">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[11px] text-white/40">
            <p>&copy; {new Date().getFullYear()} GRAPHITES. ALL RIGHTS RESERVED.</p>
            <span className="hidden sm:inline text-white/20">•</span>
            <div className="flex items-center gap-4 text-[11px] font-medium text-white/50">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Sale</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/returns-policy" className="hover:text-white transition-colors">Returns &amp; Refunds</Link>
            </div>
          </div>

          {/* Payment Badges -- card networks actually accepted via Stripe. No PayPal/Apple Pay --
              don't advertise payment methods that aren't actually wired up. */}
          <div className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-white">VISA</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-white">MC</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-white">AMEX</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-white">STRIPE</span>
          </div>
        </div>
      </div>

      {/* 5. Architectural Background Signature Watermark */}
      <div className="w-full flex justify-center items-center py-10 sm:py-14 md:py-16 overflow-hidden select-none pointer-events-none opacity-[0.035] px-4">
        <span className="font-heading font-black text-[8.5vw] sm:text-[9.5vw] md:text-[10.5vw] lg:text-[11vw] leading-none tracking-[0.16em] pl-[0.16em] text-white uppercase whitespace-nowrap text-center">
          GRAPHITES
        </span>
      </div>
    </footer>
  );
}
