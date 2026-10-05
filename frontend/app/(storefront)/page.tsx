import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { HangingRailSection } from '@/components/HangingRailSection';
import { HeroBanner } from '@/components/HeroBanner';
import { HomeSectionRow } from '@/components/HomeSectionRow';
import { SplitBanner } from '@/components/SplitBanner';
import { productRowAnchors } from '@/lib/home-anchors';
import type { HomeSectionResponse } from '@/lib/types';

/** The homepage is an ordered list of blocks the admin builds (Admin > Homepage): hero banners, split
 * banners and rows of hand-picked products, in whatever order they choose. */
export default async function HomePage() {
  const blocks = await apiFetch<HomeSectionResponse[]>('/api/home-sections').catch(() => [] as HomeSectionResponse[]);

  if (blocks.length === 0) {
    return (
      <div className="px-4 sm:px-8 lg:px-12 py-40 text-center">
        <Link
          href="/products"
          className="text-xs font-bold uppercase tracking-wider text-[#10100F] hover:opacity-60 transition-opacity"
        >
          Browse all products →
        </Link>
      </div>
    );
  }

  // Each product row gets an anchor so the header menu can jump straight to it (New Arrivals -> /#new-arrivals).
  const anchors = productRowAnchors(blocks);

  return (
    <div>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'HERO':
            return (
              <HeroBanner
                key={block.id}
                first={index === 0}
                imageUrl={block.imageUrl ?? ''}
                title={block.title ?? ''}
                description={block.description}
                buttonText={block.buttonText}
                buttonLink={block.buttonLink}
              />
            );
          case 'SPLIT_BANNER':
            return <SplitBanner key={block.id} panels={block.panels} />;
          case 'PRODUCTS':
            return (
              // scroll-mt keeps the row's title clear of the fixed header when jumped to
              <div key={block.id} id={anchors.get(block.id)} className="py-10 sm:py-14 scroll-mt-16">
                <HomeSectionRow section={block} />
              </div>
            );
          case 'HANGING_RAIL':
            return (
              <HangingRailSection
                key={block.id}
                id={anchors.get(block.id)}
                title={block.title}
                description={block.description}
                products={block.products}
              />
            );
        }
      })}
    </div>
  );
}
