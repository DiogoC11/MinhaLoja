import { NextResponse } from 'next/server';
import { readCategories, writeCategories } from '@/lib/categories';
import { requireAuth } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: { id: string } }){
  const user = await requireAuth(request);
  if (!user || !user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = params.id;
  const body = await request.json();
  const nome = String(body.nome||'').trim();
  if (!nome) return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
  const list = await readCategories();
  const exists = list.find(c => c.id === id);
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.some(c => c.id !== id && c.nome.toLowerCase() === nome.toLowerCase())){
    return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 409 });
  }
  exists.nome = nome;
  await writeCategories(list);
  return NextResponse.json(exists);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }){
  const user = await requireAuth(request);
  if (!user || !user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = params.id;
  const list = await readCategories();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [removed] = list.splice(idx, 1);
  await writeCategories(list);
  return NextResponse.json(removed);
}
