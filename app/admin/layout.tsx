import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthUserFromCookies } from '@/lib/auth';
import AdminTabs from '@/components/AdminTabs';

export default async function AdminLayout({ children }: { children: ReactNode }){
  const user = await getAuthUserFromCookies();
  if (!user || !user.isAdmin) {
    redirect('/');
  }
  return (
    // Deixa a página inteira fazer scroll para que o footer fique no fim da página
    <div className="flex flex-col">
      {/* Tabs do admin sempre visíveis durante o scroll da página */}
      <div className="sticky top-0 z-10 border-b border-slate-700/70 bg-[var(--bg)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/60">
        <AdminTabs />
      </div>

      {/* Conteúdo normal (sem scroll interno) para empurrar o footer */}
      <div className="w-[80%] mx-auto py-4">
        {children}
      </div>
    </div>
  );
}
