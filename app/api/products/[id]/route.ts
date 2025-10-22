import { NextResponse } from 'next/server';
import { readProducts, writeProducts, type Product } from '@/lib/fsdb';
import { requireAuth } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: { id: string } }){
  const list = await readProducts();
  const item = list.find(p => p.id === params.id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: { params: { id: string } }){
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const list = await readProducts();
  const idx = list.findIndex(p => p.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const old = list[idx];
  const updated: Product = {
    ...old,
    nome: body.nome != null ? String(body.nome) : old.nome,
    preco: body.preco != null ? Number(body.preco) : old.preco,
    descricao: body.descricao != null ? String(body.descricao) : old.descricao,
    imagem: body.imagem != null ? String(body.imagem) : old.imagem,
    categoria: body.categoria != null ? String(body.categoria) : old.categoria,
  };
  list[idx] = updated;
  await writeProducts(list);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }){
  const user = await requireAuth(_ as Request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const list = await readProducts();
  const idx = list.findIndex(p => p.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [removed] = list.splice(idx, 1);
  await writeProducts(list);
  return NextResponse.json(removed);
}
