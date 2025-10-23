"use client";
import useSWR from 'swr';
import { useCart } from '@/components/CartContext';
import type { Product } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CartPage(){
  const { cart, add, dec, del } = useCart();
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const list = data || [];
  const map = new Map(list.map(p => [p.id, p] as const));
  const items = Object.values(cart);

  if (items.length === 0) return (
    <div className="empty">O seu carrinho está vazio. <a className="btn btn-ghost ml-2" href="/produtos">Ver produtos</a></div>
  );

  let subtotal = 0;
  items.forEach(it => { const p = map.get(it.id); if (p) subtotal += p.preco * it.qty; });
  const portes = subtotal >= 299 ? 0 : 19.9;
  const total = subtotal + portes;

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-3">
        {items.map(it => {
          const p = map.get(it.id)!;
          const totalLinha = p.preco * it.qty;
          return (
            <div key={it.id} className="cart-item grid grid-cols-[72px_1fr_auto] gap-3 items-center card p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(p.imagens && p.imagens[0]) || p.imagem} alt={p.nome} className="w-[72px] h-[72px] object-contain rounded bg-slate-800" />
              <div>
                <div className="flex items-center justify-between">
                  <strong>{p.nome}</strong>
                  <button className="btn btn-ghost" onClick={() => del(p.id)}>Remover</button>
                </div>
                <small className="muted">{formatPriceEUR(p.preco)} un.</small>
                <div className="flex items-center gap-2 mt-2">
                  <button className="btn btn-ghost" onClick={() => dec(p.id)}>-</button>
                  <span>{it.qty}</span>
                  <button className="btn" onClick={() => add(p.id)}>+</button>
                </div>
              </div>
              <div className="text-right min-w-[90px]"><strong>{formatPriceEUR(totalLinha)}</strong></div>
            </div>
          );
        })}
      </div>
      <div className="cart-summary card p-4 h-fit">
        <h3 className="font-semibold text-lg">Resumo</h3>
        <div className="flex justify-between"><span>Subtotal</span><strong>{formatPriceEUR(subtotal)}</strong></div>
        <div className="flex justify-between"><span>Portes</span><strong>{portes===0? 'Grátis' : formatPriceEUR(portes)}</strong></div>
        <hr className="my-3 border-slate-700" />
        <div className="flex justify-between text-lg"><span>Total</span><strong>{formatPriceEUR(total)}</strong></div>
        <button className="btn w-full mt-3">Concluir compra</button>
        <small className="muted">Exemplo sem pagamento real.</small>
      </div>
    </div>
  );
}
