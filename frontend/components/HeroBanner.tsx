'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { mediaUrl } from '@/lib/api';

interface HeroBannerProps {
  imageUrl: string;
  title: string;
  description?: string | null;
  buttonText?: string | null;
  /** Blank means the button scrolls down to the next block on the page instead of navigating. */
  buttonLink?: string | null;
  /** Every hero is the same tall banner with text that follows you down it. The one at the very top of the
   * page also slides up under the header. */
  first?: boolean;
}

const buttonClass =
  'inline-flex items-center gap-2 rounded-full bg-white/75 hover:bg-white backdrop-blur-md px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#10100F] shadow-sm hover:shadow-md transition-all active:scale-95';

export function HeroBanner({ imageUrl, title, description, buttonText, buttonLink, first = false }: HeroBannerProps) {
  const section = useRef<HTMLElement>(null);

  function scrollToNext() {
    (section.current?.nextElementSibling as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth' });
  }

  const src = mediaUrl(imageUrl);
  // Uploaded images come from the backend (localhost in dev), which Next's image optimizer refuses to fetch.
  const remote = src.startsWith('http');

  return (
    /* 170vh tall -- the image is longer than the screen itself (Rains style) */
    <section
      ref={section}
      className={`relative w-full h-[160vh] sm:h-[175vh] ${first ? '-mt-20' : ''}`}
    >
      {/* Tall background image spanning the full height */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <Image
          src={src}
          alt={title.replace(/\s+/g, ' ')}
          fill
          priority={first}
          unoptimized={remote}
          sizes="100vw"
          className="object-cover object-top"
        />

        {/* Cinematic gradient overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/25 pointer-events-none" />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* Sticky text overlay that follows the screen until the tall image ends */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-end p-6 sm:p-12 md:p-16 lg:p-20 z-10 pointer-events-none">
        <div className="max-w-4xl space-y-4 pointer-events-auto">
          {first ? (
            <h1 className="text-white/85 font-black text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] tracking-tight leading-[0.92] select-none drop-shadow-md whitespace-pre-line">
              {title}
            </h1>
          ) : (
            <h2 className="text-white/85 font-black text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] tracking-tight leading-[0.92] select-none drop-shadow-md whitespace-pre-line">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-white/80 text-lg sm:text-2xl md:text-3xl font-medium tracking-tight drop-shadow-sm whitespace-pre-line">
              {description}
            </p>
          )}
          {buttonText && (
            <div className="pt-3">
              {buttonLink ? (
                buttonLink.startsWith('/') ? (
                  <Link href={buttonLink} className={buttonClass}>
                    <span>{buttonText}</span>
                  </Link>
                ) : (
                  <a href={buttonLink} className={buttonClass}>
                    <span>{buttonText}</span>
                  </a>
                )
              ) : (
                <button onClick={scrollToNext} className={buttonClass}>
                  <span>{buttonText}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
