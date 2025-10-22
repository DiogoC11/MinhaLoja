import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthUserFromCookies } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: ReactNode }){
  const user = await getAuthUserFromCookies();
  if (!user || !user.isAdmin) {
    redirect('/');
  }
  return <>{children}</>;
}
