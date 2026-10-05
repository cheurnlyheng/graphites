'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, apiFetch, mediaUrl } from '@/lib/api';
import { getAdminAuth, isAdminAuthError } from '@/lib/auth';
import { ImageField } from '@/components/admin/ImageField';
import { hintClass, inputClass, labelClass } from '@/components/admin/styles';
import type { AdminSectionProduct } from '@/lib/types';
import { ProductPicker } from './ProductPicker';
import { TYPE_LABELS, type Draft, type PanelDraft } from './draft';

const PREVIEW_OVERLAY = 'absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/25';

function HeroPreview({ draft }: { draft: Draft }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#ebe8e1] border border-[#e5ded2] shadow-xs">
      {draft.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(draft.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      )}
      <div className={PREVIEW_OVERLAY} />
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7">
        <h2 className="text-white/95 font-black text-2xl sm:text-4xl tracking-tight leading-[0.95] whitespace-pre-line font-sans">
          {draft.title || 'Your Header Title'}
        </h2>
        {draft.description && (
          <p className="mt-2 text-white/80 text-xs sm:text-sm font-medium tracking-tight whitespace-pre-line font-sans">{draft.description}</p>
        )}
        {draft.buttonText && (
          <span className="mt-3 inline-flex self-start rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-[#10100F] shadow-sm">
            {draft.buttonText}
          </span>
        )}
      </div>
    </div>
  );
}

function SplitPreview({ panels }: { panels: PanelDraft[] }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl overflow-hidden border border-[#e5ded2] shadow-xs">
      {panels.map((panel, i) => (
        <div key={i} className="relative aspect-[4/5] overflow-hidden bg-[#ebe8e1]">
          {panel.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(panel.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
            <h2 className="text-white/95 font-black text-base sm:text-xl tracking-tight leading-[0.95] whitespace-pre-line font-sans">
              {panel.title || (i === 0 ? 'Left Editorial' : 'Right Editorial')}
            </h2>
            {panel.description && <p className="mt-1 text-white/80 text-[10px] sm:text-xs whitespace-pre-line font-sans">{panel.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

interface BlockEditorProps {
  initial: Draft;
  options: AdminSectionProduct[];
  onSaved: () => void;
  onCancel: () => void;
  onAuthError: () => void;
}

/** Create or edit one homepage block. The fields shown depend on its type. */
export function BlockEditor({ initial, options, onSaved, onCancel, onAuthError }: BlockEditorProps) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setPanel = (index: number, patch: Partial<PanelDraft>) =>
    setDraft((d) => ({ ...d, panels: d.panels.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const auth = getAdminAuth();
    if (!auth) {
      onAuthError();
      return;
    }
    const { type, active } = draft;
    const body =
      type === 'PRODUCTS'
        ? { type, active, title: draft.title, productIds: draft.productIds }
        : type === 'HANGING_RAIL'
          ? { type, active, title: draft.title, description: draft.description, productIds: draft.productIds }
          : type === 'HERO'
          ? {
              type,
              active,
              title: draft.title,
              description: draft.description,
              imageUrl: draft.imageUrl,
              buttonText: draft.buttonText,
              buttonLink: draft.buttonLink
            }
          : { type, active, panels: draft.panels };

    setSaving(true);
    setError(null);
    try {
      await apiFetch(draft.id ? `/api/admin/home-sections/${draft.id}` : '/api/admin/home-sections', {
        method: draft.id ? 'PUT' : 'POST',
        token: auth.token,
        body
      });
      onSaved();
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const imageHint = 'Tall or portrait photos look best. Keep faces and products toward the top of the picture.';

  return (
    <form onSubmit={save} className="rounded-2xl border border-[#e5ded2] bg-white p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5ded2] pb-4">
        <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]">
          {draft.id ? 'Edit' : 'Configure New'} {TYPE_LABELS[draft.type]}
        </h2>
        <label className="flex items-center gap-2.5 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] cursor-pointer select-none">
          <input
            type="checkbox"
            name="active"
            checked={draft.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="h-4 w-4 rounded accent-[#10100F]"
          />
          Publish On Homepage
        </label>
      </div>

      {draft.type === 'PRODUCTS' && (
        <>
          <div>
            <label className={labelClass}>Section Title</label>
            <input
              name="title"
              value={draft.title}
              required
              maxLength={120}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Flash Sale, New Arrivals, Stormproof Outerwear"
              className={inputClass}
            />
            <p className={hintClass}>Each carousel row automatically includes a &ldquo;View All&rdquo; shortcut to catalog filters.</p>
          </div>
          <ProductPicker options={options} selectedIds={draft.productIds} onChange={(productIds) => set({ productIds })} />
        </>
      )}

      {draft.type === 'HANGING_RAIL' && (
        <>
          <div>
            <label className={labelClass}>Header</label>
            <input
              name="title"
              value={draft.title}
              required
              maxLength={120}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. The Collection"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea
              name="description"
              value={draft.description}
              rows={2}
              maxLength={300}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="A short line about the collection, shown under the header."
              className={inputClass}
            />
            <p className={hintClass}>
              The header and description sit centered above the rail of hanging garments.
            </p>
          </div>
          <ProductPicker options={options} selectedIds={draft.productIds} onChange={(productIds) => set({ productIds })} />
          <p className={hintClass}>
            Each product uses its own &ldquo;hanging photo&rdquo; if it has one (set on the product&rsquo;s edit page),
            falling back to its normal thumbnail otherwise. Shown 3 at a time -- the storefront pages through the
            rest with an arrow (desktop) or a swipe (mobile).
          </p>
        </>
      )}

      {draft.type === 'HERO' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <ImageField
              label="Banner Image"
              name="imageUrl"
              value={draft.imageUrl}
              onChange={(imageUrl) => set({ imageUrl })}
              onAuthError={onAuthError}
              hint={imageHint}
            />
            <div>
              <label className={labelClass}>Header Title</label>
              <textarea
                name="title"
                value={draft.title}
                required
                rows={2}
                maxLength={120}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Weatherproof Outerwear&#10;Engineered for Storms"
                className={inputClass}
              />
              <p className={hintClass}>Press Enter to split across multiple lines. {draft.title.length}/120</p>
            </div>
            <div>
              <label className={labelClass}>Description Subcopy (optional)</label>
              <textarea
                name="description"
                value={draft.description}
                rows={2}
                maxLength={300}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="e.g. Designed in Denmark with ultrasonically welded waterproof seams and matte polyurethane finishes."
                className={inputClass}
              />
              <p className={hintClass}>Subhead caption under main title. {draft.description.length}/300</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Button Text (optional)</label>
                <input
                  name="buttonText"
                  value={draft.buttonText}
                  maxLength={40}
                  onChange={(e) => set({ buttonText: e.target.value })}
                  placeholder="Explore Collection"
                  className={inputClass}
                />
                <p className={hintClass}>Leave empty to hide button.</p>
              </div>
              <div>
                <label className={labelClass}>Button Link Target</label>
                <input
                  name="buttonLink"
                  value={draft.buttonLink}
                  maxLength={300}
                  onChange={(e) => set({ buttonLink: e.target.value })}
                  placeholder="/products?categoryId=..."
                  className={inputClass}
                />
                <p className={hintClass}>Relative path like /products or direct URL.</p>
              </div>
            </div>
          </div>
          <div className="xl:sticky xl:top-6 space-y-2">
            <span className={labelClass}>Live Viewport Preview</span>
            <HeroPreview draft={draft} />
          </div>
        </div>
      )}

      {draft.type === 'SPLIT_BANNER' && (
        <div className="space-y-6">
          <p className={`${hintClass} mt-0`}>
            Dual side-by-side promotional panels showcasing complementary categories.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {draft.panels.map((panel, i) => {
              const side = i === 0 ? 'Left' : 'Right';
              return (
                <div key={i} className="space-y-4 rounded-2xl border border-[#e5ded2] bg-[#f3f3f1]/40 p-5 sm:p-6">
                  <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]">{side} Editorial Panel</h3>
                  <ImageField
                    label="Panel Image"
                    name={`panel${i}-imageUrl`}
                    value={panel.imageUrl}
                    onChange={(imageUrl) => setPanel(i, { imageUrl })}
                    onAuthError={onAuthError}
                  />
                  <div>
                    <label className={labelClass}>Header</label>
                    <input
                      name={`panel${i}-title`}
                      value={panel.title}
                      required
                      maxLength={120}
                      onChange={(e) => setPanel(i, { title: e.target.value })}
                      placeholder={i === 0 ? 'e.g. Heavy Duty Backpacks' : 'e.g. Travel Duffles'}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Description (optional)</label>
                    <textarea
                      name={`panel${i}-description`}
                      value={panel.description}
                      rows={2}
                      maxLength={300}
                      onChange={(e) => setPanel(i, { description: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <span className={labelClass}>Live Viewport Preview</span>
            <SplitPreview panels={draft.panels} />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-sans font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#10100F] text-white px-7 py-3 text-xs font-sans font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-sm active:scale-95"
        >
          {saving ? 'Saving Block…' : 'Save Layout Block'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#e5ded2] bg-white px-7 py-3 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] transition-all active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
