import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const heading = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-heading' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: "Jess's Shop",
  description: 'Clothing, shipped from our own warehouse to you.'
};

// Deliberately has no <Header>/<Footer> here -- the storefront route group
// ((storefront)/layout.tsx) and the admin panel (admin/layout.tsx) each supply
// their own chrome, so the admin panel never shows the customer-facing nav.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
