'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/api';
import { hintClass, inputClass, labelClass } from '@/components/admin/styles';
import type { AdminSectionProduct } from '@/lib/types';

const smallButton =
  'flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-xs font-bold text-[#10100F] shadow-xs hover:bg-white disabled:opacity-30 transition-all font-sans';

function Thumb({ product, className }: { product: AdminSectionProduct; className?: string }) {
  return product.thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(product.thumbnailUrl)} alt={product.name} className={`object-cover bg-[#f3f3f1] ${className ?? ''}`} />
  ) : (
    <div className={`flex items-center justify-center bg-[#f3f3f1] text-[10px] uppercase font-sans text-[#10100F]/30 ${className ?? ''}`}>
      No image
    </div>
  );
}

/** Choose the products of a row: the picked ones (drag or use the arrows to reorder) above a searchable grid
 * of every product with its picture. */
export function ProductPicker({
  options,
  selectedIds,
  onChange,
  maxSelected
}: {
  options: AdminSectionProduct[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Caps how many can be picked (e.g. a hanging rail, which is meant to stay a small shelf, not a full
   * carousel). Leave unset for no cap. */
  maxSelected?: number;
}) {
  const [search, setSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const productById = new Map(options.map((p) => [p.id, p]));
  const query = search.trim().toLowerCase();
  const visibleOptions = query ? options.filter((p) => p.name.toLowerCase().includes(query)) : options;
  const atLimit = maxSelected != null && selectedIds.length >= maxSelected;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (atLimit) return;
    onChange([...selectedIds, id]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= selectedIds.length || from === to || Number.isNaN(from)) return;
    const ids = [...selectedIds];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onChange(ids);
  }

  return (
    <>
      {/* Selected products, in display order */}
      <div>
        <label className={labelClass}>
          Products in this row ({selectedIds.length}{maxSelected != null ? ` / ${maxSelected}` : ''}) &mdash; drag to reorder
        </label>
        {selectedIds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e5ded2] p-6 text-center text-sm text-[#10100F]/50 font-sans">
            No products selected yet. Pick items from the catalog grid below.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedIds.map((id, i) => {
              const p = productById.get(id);
              if (!p) return null;
              return (
                <div
                  key={id}
                  data-testid="selected-product"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(i));
                    setDragIndex(i);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = e.dataTransfer.getData('text/plain');
                    if (from !== '') move(Number(from), i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`relative w-28 shrink-0 cursor-grab rounded-xl overflow-hidden border border-[#e5ded2] bg-white shadow-xs ${
                    dragIndex === i ? 'opacity-40' : ''
                  }`}
                >
                  <Thumb product={p} className="aspect-[3/4] w-full" />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#10100F] px-2 py-0.5 text-[9px] font-sans font-bold text-white shadow-2xs">
                    #{i + 1}
                  </span>
                  <div className="absolute right-1.5 top-1.5 flex gap-1">
                    <button type="button" aria-label="Remove" onClick={() => toggle(id)} className={smallButton}>
                      ✕
                    </button>
                  </div>
                  <div className="absolute inset-x-1 top-[38%] flex justify-between">
                    <button
                      type="button"
                      aria-label="Move earlier"
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                      className={smallButton}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      aria-label="Move later"
                      disabled={i === selectedIds.length - 1}
                      onClick={() => move(i, i + 1)}
                      className={smallButton}
                    >
                      ▶
                    </button>
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] font-bold uppercase tracking-tight text-[#10100F] font-sans">{p.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Picker */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
          <label className={`${labelClass} mb-0`}>Select from Published Inventory</label>
          <input
            name="product-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full sm:max-w-xs rounded-full border border-[#e5ded2] bg-white px-4 py-2 text-xs text-[#10100F] placeholder:text-[#10100F]/40 focus:border-[#10100F] focus:outline-none font-sans"
          />
        </div>
        {visibleOptions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e5ded2] p-6 text-center text-sm text-[#10100F]/50 font-sans">
            {options.length === 0 ? 'There are no products yet.' : 'No products match your search.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {visibleOptions.map((p) => {
              const position = selectedIds.indexOf(p.id);
              const picked = position !== -1;
              const disabled = !picked && atLimit;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid="product-option"
                  data-product-name={p.name}
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  title={disabled ? `Remove one first -- at most ${maxSelected} products` : undefined}
                  className={`relative text-left rounded-xl overflow-hidden border bg-white transition-all shadow-xs ${
                    picked
                      ? 'border-[#10100F] ring-2 ring-[#10100F]'
                      : disabled
                        ? 'border-[#e5ded2] opacity-40 cursor-not-allowed'
                        : 'border-[#e5ded2] hover:border-[#10100F]'
                  }`}
                >
                  <Thumb product={p} className="aspect-[3/4] w-full" />
                  {picked && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#10100F] text-[10px] font-sans font-bold text-white shadow">
                      {position + 1}
                    </span>
                  )}
                  {(p.status !== 'ACTIVE' || !p.inStock) && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-sans font-bold uppercase text-white shadow-2xs tracking-wider">
                      {p.status !== 'ACTIVE' ? p.status : 'Sold out'}
                    </span>
                  )}
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[11px] font-bold uppercase tracking-tight text-[#10100F] font-sans">{p.name}</p>
                    <p className="font-sans text-[11px] font-semibold text-[#10100F]/60">${p.price.toFixed(2)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className={hintClass}>
          Draft and sold-out products are marked, and are hidden from the storefront homepage until active and in stock.
          {maxSelected != null && ` This row holds at most ${maxSelected} products -- remove one to pick a different one.`}
        </p>
      </div>
    </>
  );
}
