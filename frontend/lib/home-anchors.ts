import type { HomeSectionResponse } from '@/lib/types';

/** A landing-page product row (New Arrivals, Everyday Essentials...) as a link in the header menu. */
export interface FeaturedLink {
  id: string;
  title: string;
  /** Jumps to that row on the landing page. */
  href: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Block types that carry a picked product list and can be jumped to -- a horizontally-scrolling row and
 * the hanging garment rail alike. */
function isProductBlock(type: HomeSectionResponse['type']): boolean {
  return type === 'PRODUCTS' || type === 'HANGING_RAIL';
}

/**
 * The in-page anchor for each product row, keyed by block id. The homepage puts these ids on the rows and
 * the header menu links to them, so both call this with the same ordered blocks and get the same answer.
 * Two rows with the same title get "-2", "-3"... so an anchor never points at the wrong one.
 */
export function productRowAnchors(blocks: HomeSectionResponse[]): Map<string, string> {
  const anchors = new Map<string, string>();
  const used = new Map<string, number>();
  for (const block of blocks) {
    if (!isProductBlock(block.type)) continue;
    const base = slugify(block.title ?? '') || 'section';
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    anchors.set(block.id, count === 1 ? base : `${base}-${count}`);
  }
  return anchors;
}

export function featuredLinks(blocks: HomeSectionResponse[]): FeaturedLink[] {
  const anchors = productRowAnchors(blocks);
  return blocks
    .filter((b) => isProductBlock(b.type) && b.title)
    .map((b) => ({ id: b.id, title: b.title as string, href: `/#${anchors.get(b.id)}` }));
}
