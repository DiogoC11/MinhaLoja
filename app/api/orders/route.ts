import { NextResponse } from 'next/server';
import { readOrders } from '@/lib/orders';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request){
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const list = await readOrders();
  return NextResponse.json(list);
}
