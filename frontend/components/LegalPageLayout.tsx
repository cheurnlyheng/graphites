import Link from 'next/link';

export function LegalPageLayout({
  title,
  updated,
  children
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-8 sm:py-24">
      <Link href="/" className="text-xs font-bold uppercase tracking-widest text-[#10100F]/50 hover:text-[#10100F]">
        ← Back home
      </Link>
      <h1 className="mt-6 text-3xl font-black uppercase tracking-tight text-[#10100F] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#10100F]/40">Last updated: {updated}</p>
      <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-[#10100F]/80">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold uppercase tracking-wider text-[#10100F]">{heading}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Wraps a placeholder the shop owner must fill in before launch -- deliberately loud so it can't
 * accidentally ship as real legal text. */
export function FillIn({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[13px] font-semibold text-amber-900">
      [{children}]
    </span>
  );
}
