import { getProduct } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';

export default async function ProductDetail({ params }: { params: { id: string } }){
  const p = await getProduct(params.id);
  if (!p) return <div className="empty">Produto não encontrado.</div>;
  return (
    <section className="hero">
      <h2 className="text-xl font-semibold mb-2">{p.nome}</h2>
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imagem} alt={p.nome} className="w-full max-h-[400px] object-cover" />
        <div className="card-body">
          <div className="text-slate-300 mb-2">{p.descricao}</div>
          <div className="font-bold mb-3">{formatPriceEUR(p.preco)}</div>
          <div className="flex gap-2">
            <a className="btn" href="/carrinho">Ir ao carrinho</a>
            <a className="btn btn-ghost" href="/produtos">Voltar</a>
          </div>
        </div>
      </div>
    </section>
  );
}
