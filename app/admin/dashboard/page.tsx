"use client";
import useSWR from 'swr';
import type { Order } from '@/lib/orders';
import type { Product } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';

const fetcher = (u: string) => fetch(u).then(r=>r.json());

export default function AdminDashboard(){
  const { data: orders } = useSWR<Order[]>('/api/orders', fetcher);
  const { data: products } = useSWR<Product[]>('/api/products', fetcher);
  const list = orders || [];
  const prods = products || [];
  const prodMap = new Map(prods.map(p => [p.id, p] as const));

  const now = Date.now();
  const thirtyDays = 1000*60*60*24*30;
  const recent = list.filter(o => (now - o.createdAt) <= thirtyDays);
  const comprasUltimoMes = recent.length;

  const qtyByProduct = new Map<string, number>();
  for (const o of recent){
    for (const it of o.items){
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId)||0) + it.qty);
    }
  }
  const top = Array.from(qtyByProduct.entries())
    .sort((a,b)=> b[1]-a[1])
    .slice(0,5)
    .map(([productId, qty]) => ({ productId, qty, product: prodMap.get(productId)||null }));

  const totalRecent = recent.reduce((sum, o)=> sum + (o.total||0), 0);
  const maxQty = top.reduce((m, t) => Math.max(m, t.qty), 0);

  return (
    <div className="grid gap-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
          <div className="text-slate-400">Compras no último mês</div>
          <div className="text-3xl font-semibold">{comprasUltimoMes}</div>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
          <div className="text-slate-400">Faturação (últimos 30 dias)</div>
          <div className="text-3xl font-semibold">{formatPriceEUR(totalRecent)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-2">Produtos mais comprados (últimos 30 dias)</div>
        {top.length === 0 ? (
          <div className="text-slate-400">Sem dados de compras.</div>
        ) : (
          <div className="space-y-3">
            {top.map(({ productId, qty, product }) => (
              <div key={productId} className="flex items-center gap-3">
                <div className="w-48 shrink-0 text-sm text-slate-200 truncate" title={product?.nome || '(produto removido)'}>
                  {product?.nome || '(produto removido)'}
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-800 rounded">
                    <div
                      className="h-4 bg-emerald-500 rounded"
                      style={{ width: `${maxQty ? (qty / maxQty) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-10 text-right font-medium">x{qty}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
