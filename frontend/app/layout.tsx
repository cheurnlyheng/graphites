import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap'
});

// Falls back to localhost so local dev still works, but production MUST set this in Vercel's env
// vars -- without it, the sitemap/robots.txt/canonical/OG tags all silently point at localhost,
// which is exactly what shipped here until this was caught.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Graphites -- Vintage-Inspired Streetwear',
    template: '%s | Graphites'
  },
  description:
    'Graphites is a small boutique making vintage-inspired tees, hoodies, and pants. ' +
    'Shop the Graphites collection, shipped from our studio to your door.',
  keywords: ['Graphites', 'graphites clothing', 'vintage streetwear', 'vintage tees', 'boutique hoodies'],
  alternates: {
    canonical: SITE_URL
  },
  openGraph: {
    type: 'website',
    siteName: 'Graphites',
    title: 'Graphites -- Vintage-Inspired Streetwear',
    description: 'A small boutique making vintage-inspired tees, hoodies, and pants.',
    url: SITE_URL
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Graphites -- Vintage-Inspired Streetwear',
    description: 'A small boutique making vintage-inspired tees, hoodies, and pants.'
  }
};

// Organization + WebSite structured data -- tells Google this domain IS the "Graphites" brand
// entity (helps brand-name searches surface this site, favicon, and a sitelinks search box)
// rather than just another page that happens to mention the word. Static JSON we author
// ourselves, not user input, so this is the standard safe use of dangerouslySetInnerHTML for
// JSON-LD -- see https://nextjs.org/docs/app/guides/json-ld.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Graphites',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`
    },
    {
      '@type': 'WebSite',
      name: 'Graphites',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/products?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased text-[#10100f] bg-[#fbfbfb]">{children}</body>
    </html>
  );
}
