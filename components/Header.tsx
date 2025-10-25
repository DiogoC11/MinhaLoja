"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { useEffect, useRef, useState } from 'react';

export default function Header(){
  const router = useRouter();
  const { count } = useCart();
  const [authLabel, setAuthLabel] = useState('Entrar');
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname() || '/';
  // Horizontal drag for top nav
  const navRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef({
    down: false,
    startX: 0,
    sx: 0,
    moved: false,
    pid: 0,
    lastX: 0,
    lastT: 0,
    vx: 0, // px/ms
    raf: 0,
    suppressUntil: 0, // timestamp to suppress click after kinetic scroll
  });
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => { if (dragRef.current.raf) cancelAnimationFrame(dragRef.current.raf); }, []);

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
        <nav
          ref={navRef}
          className={`flex items-center gap-6 sm:gap-8 mt-2 sm:mt-0 w-full sm:w-auto order-2 sm:order-none overflow-x-auto ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const now = performance.now();
            if (dragRef.current.raf) { cancelAnimationFrame(dragRef.current.raf); dragRef.current.raf = 0; }
            dragRef.current.down = true;
            dragRef.current.startX = e.clientX;
            dragRef.current.sx = navRef.current?.scrollLeft || 0;
            dragRef.current.moved = false;
            dragRef.current.suppressUntil = 0;
            dragRef.current.pid = e.pointerId;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastT = now;
            dragRef.current.vx = 0;
            try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
          }}
          onPointerMove={(e) => {
            if (!dragRef.current.down) return;
            const el = navRef.current; if (!el) return;
            const now = performance.now();
            const dx = e.clientX - dragRef.current.startX;
            if (!dragging) setDragging(true);
            el.scrollLeft = dragRef.current.sx - dx;
              if (Math.abs(dx) > 4) dragRef.current.moved = true;
            const dt = Math.max(1, now - dragRef.current.lastT);
            dragRef.current.vx = (e.clientX - dragRef.current.lastX) / dt;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastT = now;
              // Only prevent default if we are actually dragging to avoid canceling clicks
              if (dragRef.current.moved) e.preventDefault();
          }}
          onPointerUp={(e) => {
            if (!dragRef.current.down) return;
            dragRef.current.down = false;
            try { (e.currentTarget as any).releasePointerCapture?.(dragRef.current.pid); } catch {}
            setDragging(false);
            const el = navRef.current; if (!el) return;
              // If movement was tiny, treat as a click and do not start inertia
              const dxTotal = Math.abs(e.clientX - dragRef.current.startX);
              if (dxTotal <= 4) {
                // Treat as a click: manually navigate to the link under pointer to avoid any suppressed native click
                dragRef.current.moved = false;
                dragRef.current.vx = 0;
                const elAt = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                const anchor = elAt?.closest('a[href]') as HTMLAnchorElement | null;
                const href = anchor?.getAttribute('href');
                if (href) {
                  // Prefer client-side navigation
                  router.push(href);
                }
                return;
              }
            const max = Math.max(0, el.scrollWidth - el.clientWidth);
            let vx = dragRef.current.vx; // px/ms
            let last = performance.now();
            const decel = 0.0018; // px/ms^2 (mais "solto")
            const step = (now: number) => {
              const dt = now - last; last = now;
              el.scrollLeft = el.scrollLeft - vx * dt;
              if (el.scrollLeft <= 0 || el.scrollLeft >= max) {
                el.scrollLeft = Math.min(Math.max(el.scrollLeft, 0), max);
                vx = 0;
              }
              const sign = Math.sign(vx);
              const mag = Math.max(0, Math.abs(vx) - decel * dt);
              vx = sign * mag;
              if (Math.abs(vx) > 0.02) {
                dragRef.current.raf = requestAnimationFrame(step);
              } else {
                dragRef.current.raf = 0;
              }
            };
              if (Math.abs(vx) > 0.05) {
                // Suppress clicks briefly right after a drag to avoid accidental activation
                dragRef.current.suppressUntil = performance.now() + 200;
                // Clear moved immediately; rely on suppressUntil only
                dragRef.current.moved = false;
                dragRef.current.raf = requestAnimationFrame(step);
              } else {
                dragRef.current.moved = false;
              }
          }}
          onPointerCancel={() => { dragRef.current.down = false; dragRef.current.moved = false; setDragging(false); }}
          onPointerLeave={() => { dragRef.current.down = false; dragRef.current.moved = false; setDragging(false); }}
            onClickCapture={(e) => {
              const now = performance.now();
              if (now < dragRef.current.suppressUntil) {
                e.preventDefault();
                e.stopPropagation();
                // Clear flags so the very next click works
                dragRef.current.suppressUntil = 0;
              }
            }}
        >
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
