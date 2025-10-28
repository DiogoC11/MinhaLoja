"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function AdminTabs(){
  const pathname = usePathname();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);
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
    suppressUntil: 0,
  });
  const [dragging, setDragging] = useState(false);
  useEffect(() => { return () => { if (dragRef.current.raf) cancelAnimationFrame(dragRef.current.raf); }; }, []);
  const tabs = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/addproduto', label: 'Produtos' },
    { href: '/admin/categorias', label: 'Categorias' },
  ];
  return (
    <div className="border-b border-slate-700/70 mb-4">
      <div
        ref={wrapRef}
        className={`w-[80%] mx-auto flex gap-2 overflow-x-auto overflow-y-hidden pt-2 pb-0 items-end ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const now = performance.now();
          if (dragRef.current.raf) { cancelAnimationFrame(dragRef.current.raf); dragRef.current.raf = 0; }
          dragRef.current.down = true;
          dragRef.current.startX = e.clientX;
          dragRef.current.sx = wrapRef.current?.scrollLeft || 0;
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
          const el = wrapRef.current; if (!el) return;
          const now = performance.now();
          const dx = e.clientX - dragRef.current.startX;
          if (!dragging) setDragging(true);
          el.scrollLeft = dragRef.current.sx - dx;
          if (Math.abs(dx) > 4) dragRef.current.moved = true;
          const dt = Math.max(1, now - dragRef.current.lastT);
          dragRef.current.vx = (e.clientX - dragRef.current.lastX) / dt;
          dragRef.current.lastX = e.clientX;
          dragRef.current.lastT = now;
          if (dragRef.current.moved) e.preventDefault();
        }}
        onPointerUp={(e) => {
          if (!dragRef.current.down) return;
          dragRef.current.down = false;
          try { (e.currentTarget as any).releasePointerCapture?.(dragRef.current.pid); } catch {}
          setDragging(false);
          const el = wrapRef.current; if (!el) return;
          const dxTotal = Math.abs(e.clientX - dragRef.current.startX);
          if (dxTotal <= 4) {
            // Treat as click: navigate to link under pointer to ensure click works reliably
            dragRef.current.moved = false;
            dragRef.current.vx = 0;
            const elAt = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            const anchor = elAt?.closest('a[href]') as HTMLAnchorElement | null;
            const href = anchor?.getAttribute('href');
            if (href) router.push(href);
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
            dragRef.current.suppressUntil = performance.now() + 200;
            dragRef.current.moved = false; // clear; rely on suppression window only
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
            dragRef.current.suppressUntil = 0;
          }
        }}
      >
        {tabs.map(t => {
          const active = pathname === t.href;
          const base = 'px-3 py-2 border-b-2 border-transparent transition-colors text-base';
          const hover = 'hover:text-blue-300';
          const act = 'border-blue-300 text-blue-300 font-bold text-lg mb-[-1px]';
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`${base} ${hover} ${active ? act : 'text-slate-300'}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
