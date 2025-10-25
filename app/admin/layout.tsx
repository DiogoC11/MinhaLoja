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
    // Mantém as tabs sempre visíveis e aplica scroll vertical apenas ao conteúdo
    <div className="flex h-full flex-col min-h-0">
      {/* Sub tabs para ações do admin (fixas no topo da área do admin) */}
      <div className="flex-none">
        <AdminTabs />
      </div>

      {/* Conteúdo com scroll vertical interno */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-[80%] mx-auto py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
