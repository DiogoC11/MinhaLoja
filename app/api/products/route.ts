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
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const nome = String(body.nome || '').trim();
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  const imagens = Array.isArray(body.imagens)
    ? body.imagens.map((s: unknown) => String(s || '').trim()).filter((s: string) => s.length > 0).slice(0, 10)
    : undefined;
  const p: Product = {
    id: genId(nome || 'item'),
    nome: nome.slice(0, 120),
    preco: Number(body.preco || 0),
    descricao: String(body.descricao || ''),
    imagem: String(body.imagem || ''),
    ...(imagens && imagens.length ? { imagens } : {}),
    categoria: String(body.categoria || 'Outros'),
  };
  const list = await readProducts();
  const exists = list.some(x => (x.nome || '').trim().toLowerCase() === nome.toLowerCase());
  if (exists) {
    return NextResponse.json({ error: 'Já existe um produto com esse nome.' }, { status: 409 });
  }
  list.push(p);
  await writeProducts(list);
  return NextResponse.json(p, { status: 201 });
}
