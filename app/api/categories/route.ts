import { NextResponse } from 'next/server';
import { readCategories, writeCategories, genCategoryId, type Category } from '@/lib/categories';
import { requireAuth } from '@/lib/auth';

export async function GET(){
  const list = await readCategories();
  return NextResponse.json(list);
}

export async function POST(request: Request){
  const user = await requireAuth(request);
  if (!user || !user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const nome = String(body.nome||'').trim();
  if (!nome) return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
  const list = await readCategories();
  if (list.some(c => c.nome.toLowerCase() === nome.toLowerCase())){
    return NextResponse.json({ error: 'Já existe uma categoria com esse nome' }, { status: 409 });
  }
  const cat: Category = { id: genCategoryId(nome), nome, createdAt: Date.now() };
  list.push(cat);
  await writeCategories(list);
  return NextResponse.json(cat, { status: 201 });
}
