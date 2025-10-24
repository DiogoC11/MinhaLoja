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
      <div className="w-[80%] mx-auto flex gap-4 overflow-x-auto">
        {tabs.map(t => {
          const active = pathname === t.href;
          return (
            <Link key={t.href} href={t.href} className={`px-3 py-2 ${active? 'border-b-2 border-blue-500 text-white' : 'text-slate-300 hover:text-white'}`}>{t.label}</Link>
          );
        })}
      </div>
    </div>
  );
}
