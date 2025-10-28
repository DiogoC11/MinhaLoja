import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Minha Loja',
  description: 'Loja Next.js com carrinho e admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Header />
          <main className="mx-auto w-[80%] py-4 flex-1">{children}</main>
        </CartProvider>
        <Footer />
      </body>
    </html>
  );
}
