import Image from 'next/image';
import { mediaUrl } from '@/lib/api';
import type { BannerPanel } from '@/lib/types';

/** Two banners side by side, each filling half the screen edge to edge (stacked on phones), with a header
 * and description over the image. No margins, no button. */
export function SplitBanner({ panels }: { panels: BannerPanel[] }) {
  return (
    <section className="grid w-full grid-cols-1 sm:grid-cols-2">
      {panels.map((panel, i) => {
        const src = mediaUrl(panel.imageUrl);
        return (
          <div key={i} className="relative h-[85vh] sm:h-screen overflow-hidden bg-[#ebe8e1]">
            <Image
              src={src}
              alt={panel.title.replace(/\s+/g, ' ')}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              unoptimized={src.startsWith('http')}
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
              <h2 className="max-w-xl text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[0.95] text-white/90 drop-shadow-md whitespace-pre-line">
                {panel.title}
              </h2>
              {panel.description && (
                <p className="mt-3 max-w-md text-sm sm:text-base lg:text-lg font-medium text-white/80 drop-shadow-sm whitespace-pre-line">
                  {panel.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
