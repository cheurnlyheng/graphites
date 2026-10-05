import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'GRAPHITES',
  description: 'A small boutique of vintage-inspired tees, hoodies, and pants.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans antialiased text-[#10100f] bg-[#fbfbfb]">{children}</body>
    </html>
  );
}
