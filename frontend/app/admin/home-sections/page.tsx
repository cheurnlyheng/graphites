'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, mediaUrl } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import type { AdminHomeSectionResponse, HomeSectionType } from '@/lib/types';
import { TYPE_LABELS } from './draft';

const ADD_CHOICES: { type: HomeSectionType; blurb: string; icon: string }[] = [
  { type: 'HERO', blurb: 'Full-width cinematic banner with headline, subcopy, and action button.', icon: '🖼' },
  { type: 'SPLIT_BANNER', blurb: 'Two side-by-side editorial panels for category campaigns.', icon: '◫' },
  { type: 'PRODUCTS', blurb: 'Horizontal curated carousel showcasing hand-picked garment silhouettes.', icon: '▦' },
  { type: 'HANGING_RAIL', blurb: 'Every hand-picked product hanging on a rail, with a header and description in the middle. Built for a small catalog.', icon: '🧥' }
];

const HAS_PRODUCT_PICKS: HomeSectionType[] = ['PRODUCTS', 'HANGING_RAIL'];

function Thumb({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(src)} alt="" className={`object-cover object-top rounded-xl border border-[#e5ded2] bg-[#f3f3f1] ${className ?? ''}`} />
  ) : (
    <div className={`rounded-xl border border-[#e5ded2] bg-[#f3f3f1] flex items-center justify-center text-[10px] text-[#10100F]/30 uppercase font-sans font-bold ${className ?? ''}`}>
      Empty
    </div>
  );
}

function blockName(s: AdminHomeSectionResponse): string {
  if (s.type === 'SPLIT_BANNER') return s.panels.map((p) => p.title).join('  |  ');
  return s.title.replace(/\s+/g, ' ');
}

/** Just the list -- editing (new or existing) happens on its own page (see ./new and ./[id]), so this page
 * stays light even once there are many blocks each carrying a lot of picked-product data. */
export default function AdminHomepagePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [sections, setSections] = useState<AdminHomeSectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosingType, setChoosingType] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onAuthError() {
    clearAdminAuth();
    router.push('/admin/login');
  }

  function handleError(err: unknown, fallback: string) {
    if (isAdminAuthError(err)) {
      onAuthError();
      return;
    }
    setError(err instanceof ApiError ? err.message : fallback);
  }

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<AdminHomeSectionResponse[]>('/api/admin/home-sections', { token: auth.token })
      .then(setSections)
      .catch((err) => handleError(err, 'Could not load the homepage.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(s: AdminHomeSectionResponse) {
    if (!(await confirm({
      title: 'Delete homepage block',
      message: `Delete "${blockName(s)}" from the homepage?${s.type === 'PRODUCTS' ? ' The products in it are not deleted.' : ''}`,
      confirmLabel: 'Delete',
      danger: true
    }))) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/admin/home-sections/${s.id}`, { method: 'DELETE', token: auth.token });
      load();
    } catch (err) {
      handleError(err, 'Could not delete it.');
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    const ids = sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError(null);
    try {
      await apiFetch('/api/admin/home-sections/order', { method: 'PUT', token: auth.token, body: { sectionIds: ids } });
      load();
    } catch (err) {
      handleError(err, 'Could not reorder.');
    }
  }

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-8">
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]/60 block mb-1.5">
            Storefront Merchandising
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase font-sans">
              Homepage Layout
            </h1>
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/50">({sections.length} blocks)</span>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl font-sans">
            Compose and order your storefront landing page. Rearrange hero banners, dual editorial panels, and product carousels in real-time.
          </p>
        </div>
        <button
          data-testid="add-section"
          onClick={() => setChoosingType((v) => !v)}
          className="rounded-full bg-[#10100F] text-white px-6 py-3 text-xs font-sans font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-sm active:scale-95 self-start sm:self-auto"
        >
          {choosingType ? '✕ Close Menu' : '+ Add Layout Block'}
        </button>
      </div>

      {/* Pick what kind of block to add -- lightweight, so it's fine inline */}
      {choosingType && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-2xl border border-[#e5ded2] bg-[#f3f3f1]/60">
          {ADD_CHOICES.map((choice) => (
            <button
              key={choice.type}
              data-testid={`add-${choice.type}`}
              onClick={() => router.push(`/admin/home-sections/new?type=${choice.type}`)}
              className="group text-left rounded-2xl border border-[#e5ded2] bg-white p-6 shadow-xs hover:border-[#10100F] hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{choice.icon}</span>
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 transition-all">
                  Select →
                </span>
              </div>
              <span className="block text-sm font-bold uppercase tracking-wider text-[#10100F] font-sans">
                {TYPE_LABELS[choice.type]}
              </span>
              <span className="mt-2 block text-xs text-[#10100F]/60 leading-relaxed font-sans">
                {choice.blurb}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-sans font-medium text-red-700">
          {error}
        </div>
      )}

      {/* The blocks, in page order */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-[#e5ded2] bg-white p-12 text-center text-sm font-sans text-[#10100F]/60 shadow-xs">
            Loading homepage structure…
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e5ded2] bg-white p-16 text-center shadow-xs">
            <p className="text-sm font-extrabold uppercase tracking-wider text-[#10100F] font-sans">No blocks added yet</p>
            <p className="text-xs text-[#10100F]/50 mt-1 font-sans">
              Add a hero banner or curated product row above to bring the storefront to life.
            </p>
          </div>
        ) : (
          sections.map((s, i) => (
            <div
              key={s.id}
              data-testid="section-card"
              data-type={s.type}
              className="rounded-2xl border border-[#e5ded2] bg-white p-6 shadow-xs hover:shadow-sm transition-shadow space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f3f1] border border-[#e5ded2] font-sans text-xs font-bold text-[#10100F]/70">
                    {i + 1}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#10100F] px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-white shadow-2xs">
                    {TYPE_LABELS[s.type]}
                  </span>
                  <h3 className="truncate text-base sm:text-lg font-bold text-[#10100F] font-sans">
                    {blockName(s)}
                  </h3>
                  {!s.active && (
                    <span className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider text-[#10100F]/50">
                      Hidden
                    </span>
                  )}
                  {HAS_PRODUCT_PICKS.includes(s.type) && (
                    <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/50">
                      {s.products.length} product{s.products.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-full border border-[#e5ded2] bg-[#f3f3f1]/70 p-0.5">
                    <button
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-sans text-[#10100F] hover:bg-white disabled:opacity-20 transition-all"
                    >
                      ▲
                    </button>
                    <button
                      aria-label="Move down"
                      disabled={i === sections.length - 1}
                      onClick={() => move(i, 1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-sans text-[#10100F] hover:bg-white disabled:opacity-20 transition-all"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    data-testid="edit"
                    onClick={() => router.push(`/admin/home-sections/${s.id}`)}
                    className="rounded-full border border-[#e5ded2] bg-white px-4 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] transition-all shadow-xs active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    data-testid="delete"
                    onClick={() => remove(s)}
                    className="rounded-full border border-red-200 bg-red-50/50 px-4 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-red-700 hover:bg-red-100 transition-all active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {HAS_PRODUCT_PICKS.includes(s.type) && s.products.length > 0 && (
                <div className="pt-2 flex gap-3 overflow-x-auto pb-1">
                  {s.products.map((p) => (
                    <div key={p.id} title={p.name} className="w-16 shrink-0 group">
                      <Thumb src={p.hangingImageUrl ?? p.thumbnailUrl} className="aspect-[3/4] w-full" />
                      <p className="mt-1 truncate text-[10px] font-sans font-medium text-[#10100F]/70">{p.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {s.type === 'HANGING_RAIL' && s.description && (
                <p className="text-xs font-sans text-[#10100F]/60 max-w-xl">{s.description}</p>
              )}
              {s.type === 'HERO' && (
                <div className="pt-2 flex items-start gap-4">
                  <Thumb src={s.imageUrl} className="h-16 w-28 shrink-0" />
                  <div className="space-y-1 text-xs font-sans">
                    <p className="text-[#10100F]/70">
                      {s.description || <span className="italic text-[#10100F]/30">No description provided</span>}
                    </p>
                    {s.buttonText && (
                      <span className="inline-block font-sans text-[11px] font-bold text-[#10100F] bg-[#f3f3f1] border border-[#e5ded2] px-3 py-0.5 rounded-full">
                        CTA: {s.buttonText}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {s.type === 'SPLIT_BANNER' && (
                <div className="pt-2 grid grid-cols-2 gap-4 max-w-xl">
                  {s.panels.map((p, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-xl border border-[#e5ded2] bg-[#f3f3f1]/40 p-2.5">
                      <Thumb src={p.imageUrl} className="h-14 w-12 shrink-0" />
                      <div className="min-w-0 font-sans">
                        <span className="block truncate text-xs font-bold text-[#10100F]">{p.title || `Panel ${idx + 1}`}</span>
                        <p className="truncate text-[11px] text-[#10100F]/50 mt-0.5">{p.description || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
