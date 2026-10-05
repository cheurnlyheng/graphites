'use client';

import { useState } from 'react';

const announcements = [
  'COMPLIMENTARY WORLDWIDE SHIPPING ON ORDERS OVER $100',
  'ENGINEERED FOR MODERN UTILITY & WET WEATHER',
  '100% RECYCLED PERFORMANCE TEXTILES',
  'NEW SEASONAL DROP NOW LIVE'
];

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-ink-pure text-paper-pure text-[11px] font-medium tracking-widest uppercase overflow-hidden border-b border-ink">
      <div className="flex items-center h-8">
        <div className="flex animate-marquee whitespace-nowrap gap-12">
          {announcements.concat(announcements).map((text, idx) => (
            <div key={idx} className="flex items-center gap-6">
              <span>{text}</span>
              <span className="text-line/40 text-[9px]">✦</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-paper/40 hover:text-paper transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
