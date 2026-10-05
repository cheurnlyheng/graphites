import Link from 'next/link';

/** Shared top bar for the new-block and edit-block pages: a Back link plus the page title. */
export function EditorHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-[#e5ded2] pb-8">
      <Link
        href="/admin/home-sections"
        className="flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-white px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] transition-all shadow-xs shrink-0 active:scale-95"
      >
        ← Back
      </Link>
      <div>
        <span className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]/60 block mb-1.5">
          Storefront Merchandising
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10100F] uppercase font-sans">{title}</h1>
      </div>
    </div>
  );
}
