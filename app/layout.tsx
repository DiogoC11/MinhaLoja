import './globals.css';
import type { Metadata } from 'next';
import { CartProvider } from '@/components/CartContext';
import Header from '@/components/Header';

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
          <main className="mx-auto w-[80%] py-4 flex-1 min-h-0">{children}</main>
        </CartProvider>
        <footer className="border-t border-slate-700/70 mt-8 py-6 text-slate-400">
          <div className="mx-auto w-[80%]">© {new Date().getFullYear()} Minha Loja</div>
        </footer>
      </body>
    </html>
  );
}
