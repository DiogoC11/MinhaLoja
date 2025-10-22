"use client";
import Link from 'next/link';
import { useCart } from './CartContext';
import { useEffect, useState } from 'react';

export default function Header(){
  const { count } = useCart();
  const [authLabel, setAuthLabel] = useState('Entrar');
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/70 bg-slate-900/60 backdrop-blur">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="font-bold">Minha Loja</Link>
        <nav className="flex items-center gap-4">
          <Link href="/produtos">Produtos</Link>
          <Link href="/carrinho" className="cart-link">Carrinho <span className="badge">{count}</span></Link>
          {isAdmin && <Link href="/admin">Adicionar produto</Link>}
          <Link href="/login" id="auth-link">{authLabel}</Link>
        </nav>
      </div>
    </header>
  );
}
