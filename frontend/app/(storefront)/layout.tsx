import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartProvider } from '@/components/cart/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="relative min-h-screen flex flex-col bg-[#fbfbfb] text-[#10100F]">
        <Header />
        <main className="flex-1 w-full">
          {children}
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
