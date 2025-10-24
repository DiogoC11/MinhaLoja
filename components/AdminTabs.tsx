"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminTabs(){
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin', label: 'Produtos' },
    { href: '/admin/categorias', label: 'Categorias' },
  ];
  return (
    <div className="border-b border-slate-700/70 mb-4">
  <div className="w-[80%] mx-auto flex gap-2 overflow-x-auto overflow-y-hidden pt-2 pb-0 items-end">
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
