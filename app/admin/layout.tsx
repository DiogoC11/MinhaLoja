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
    <div>
      {/* Sub tabs para ações do admin */}
      <AdminTabs />
      <div className="w-[80%] mx-auto">
        {children}
      </div>
    </div>
  );
}
