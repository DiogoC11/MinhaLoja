"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartContext';
import { useEffect, useState } from 'react';

export default function Header(){
  const { count } = useCart();
  const [authLabel, setAuthLabel] = useState('Entrar');
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname() || '/';

  async function refreshAuthLabel(){
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const { user } = await res.json();
      setAuthLabel(user ? `Conta (${user.name || user.email})` : 'Entrar');
      setIsAdmin(!!(user && user.isAdmin));
    } catch { setAuthLabel('Entrar'); }
  }

  useEffect(() => {
    refreshAuthLabel();
    const handler = () => refreshAuthLabel();
    window.addEventListener('auth:changed', handler);
    return () => window.removeEventListener('auth:changed', handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('minha-loja:session');
      if (!raw) { setAuthLabel('Entrar'); return; }
      const { userId } = JSON.parse(raw || '{}');
      const users = JSON.parse(localStorage.getItem('minha-loja:users') || '[]');
      const u = Array.isArray(users) ? users.find((x: any) => x.id === userId) : null;
      setAuthLabel(u ? `Conta (${u.name || u.email})` : 'Entrar');
    } catch {
      setAuthLabel('Entrar');
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/produtos') return pathname.startsWith('/produtos') || pathname.startsWith('/produto');
    if (href.startsWith('/admin')) return pathname.startsWith('/admin');
    return pathname === href || pathname.startsWith(href + '/');
  };
  // Top nav: restore pill-style active look (as in your image)
  const baseLink = 'px-3 py-1 rounded-full hover:text-blue-300 transition-colors';
  const activeLink = 'bg-slate-800/80 text-blue-300 font-semibold border border-slate-600/60';

  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/70 bg-slate-900/60 backdrop-blur">
      <div className="mx-auto w-[80%] flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Logo Minha Loja" className="w-7 h-7" />
          <span>Minha Loja</span>
        </Link>
        {/* Nav: quebra para a linha de baixo em ecrãs pequenos e evita sobrepor o logo */}
        <nav className="flex items-center gap-6 sm:gap-8 mt-2 sm:mt-0 w-full sm:w-auto order-2 sm:order-none overflow-x-auto">
          <Link href="/produtos" className={`${baseLink} ${isActive('/produtos') ? activeLink : ''}`}>Produtos</Link>
          <Link href="/carrinho" className={`cart-link inline-flex items-center gap-2 whitespace-nowrap ${baseLink} ${isActive('/carrinho') ? activeLink : ''}`}>
            Carrinho <span className="badge">{count}</span>
          </Link>
          <Link href="/contactos" className={`${baseLink} ${isActive('/contactos') ? activeLink : ''}`}>Contactos</Link>
          {isAdmin && <Link href="/admin/dashboard" className={`${baseLink} ${isActive('/admin') ? activeLink : ''}`}>Admin</Link>}
          <Link href="/login" id="auth-link" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{authLabel}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
