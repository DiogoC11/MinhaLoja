import { NextResponse } from 'next/server';
import { readProducts, writeProducts, genId, type Product } from '@/lib/fsdb';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const list = await readProducts();
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const p: Product = {
    id: genId(body.nome || 'item'),
    nome: String(body.nome || '').slice(0, 120),
    preco: Number(body.preco || 0),
    descricao: String(body.descricao || ''),
    imagem: String(body.imagem || ''),
    categoria: String(body.categoria || 'Outros'),
  };
  const list = await readProducts();
  list.push(p);
  await writeProducts(list);
  return NextResponse.json(p, { status: 201 });
}
