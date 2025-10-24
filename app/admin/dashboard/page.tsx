"use client";
import useSWR from 'swr';
import { useEffect, useRef } from 'react';
import type { Order } from '@/lib/orders';
import type { Product } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';

const fetcher = (u: string) => fetch(u).then(r=>r.json());

function AutoScroll({ children, depKey }: { children: React.ReactNode; depKey?: string }){
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Scroll to the far right (today) after layout
    requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
  }, [depKey]);
  return <div ref={ref} className="overflow-x-auto">{children}</div>;
}

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
  // Build daily series for last 30 days (inclusive of today)
  const dayStart = (t: number) => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
  const todayStart = dayStart(now);
  const start = todayStart - 30 * 24 * 60 * 60 * 1000;
  const days: number[] = Array.from({ length: 31 }, (_, i) => start + i * 24 * 60 * 60 * 1000);
  const countByDay = new Map<number, number>();
  const revenueByDay = new Map<number, number>();
  for (const o of list){
    const d = dayStart(o.createdAt);
    if (d < start || d > todayStart) continue;
    countByDay.set(d, (countByDay.get(d)||0) + 1);
    revenueByDay.set(d, (revenueByDay.get(d)||0) + (o.total||0));
  }
  const dailyCounts = days.map(d => countByDay.get(d)||0);
  const dailyRevenue = days.map(d => revenueByDay.get(d)||0);
  const labels = days.map(d => {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2,'0');
    const mm = String(dt.getMonth()+1).padStart(2,'0');
    return `${dd}/${mm}`;
  });
  const maxQty = top.reduce((m, t) => Math.max(m, t.qty), 0);

  return (
    <div className="grid gap-4">
      {/* Produtos mais comprados primeiro */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-3">Produtos mais comprados (últimos 30 dias)</div>
        {top.length === 0 ? (
          <div className="text-slate-400">Sem dados de compras.</div>
        ) : (
          <AutoScroll depKey={top.map(t=>`${t.productId}:${t.qty}`).join('|')}>
            {(() => {
              const margin = { top: 16, right: 16, bottom: 56, left: 40 };
              const H = 320;
              const innerH = H - margin.top - margin.bottom;
              const barArea = Math.max(360, top.length * 100);
              const W = margin.left + barArea + margin.right;
              const innerW = W - margin.left - margin.right;
              const yMax = Math.max(1, maxQty);
              const ticks = 5;
              const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((yMax * i) / ticks));
              const band = innerW / top.length;
              const barW = Math.min(64, Math.max(28, band * 0.6));
              const color = '#3B82F6';
              return (
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
                  <rect x={0} y={0} width={W} height={H} fill="transparent" />
                  {yTicks.map((t) => {
                    const y = margin.top + innerH - (t / yMax) * innerH;
                    return (
                      <g key={t}>
                        <line x1={margin.left} x2={W - margin.right} y1={y} y2={y} stroke="#334155" strokeOpacity={0.5} />
                        <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize={12}>
                          {t}
                        </text>
                      </g>
                    );
                  })}
                  {top.map(({ productId, qty, product }, i) => {
                    const x = margin.left + i * band + (band - barW) / 2;
                    const h = (qty / yMax) * innerH;
                    const y = margin.top + innerH - h;
                    const name = product?.nome || '(produto removido)';
                    return (
                      <g key={productId}>
                        <rect x={x} y={y} width={barW} height={h} fill={color} opacity={0.9} />
                        <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#cbd5e1" fontSize={12}>
                          {qty}
                        </text>
                        <text x={x + barW / 2} y={H - margin.bottom + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12} style={{ pointerEvents: 'none' }}>
                          {name.length > 16 ? name.slice(0, 15) + '…' : name}
                        </text>
                      </g>
                    );
                  })}
                  <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#475569" />
                </svg>
              );
            })()}
          </AutoScroll>
        )}
      </div>

      {/* Linha: duas colunas lado a lado */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Compras por dia (últimos 30 dias) */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-3">Compras por dia (últimos 30 dias)</div>
        {(() => {
          const margin = { top: 24, right: 16, bottom: 48, left: 48 };
          const H = 320;
          const innerH = H - margin.top - margin.bottom;
          const step = 32; // px per day
          const barArea = Math.max(480, (labels.length - 1) * step);
          const W = margin.left + barArea + margin.right;
          const innerW = W - margin.left - margin.right;
          const yMax = Math.max(1, ...dailyCounts);
          const ticks = 5;
          const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((yMax * i) / ticks));
          const points = dailyCounts.map((v, i) => {
            const x = margin.left + (innerW * i) / (labels.length - 1);
            const y = margin.top + innerH - (v / yMax) * innerH;
            return { x, y, v };
          });
          const path = points.map((p,i)=> `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
          return (
            <AutoScroll depKey={labels.join(',') + '|' + dailyCounts.join(',')}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
                {/* grid and y-axis labels */}
                {yTicks.map((t) => {
                  const y = margin.top + innerH - (t / yMax) * innerH;
                  return (
                    <g key={t}>
                      <line x1={margin.left} x2={W - margin.right} y1={y} y2={y} stroke="#334155" strokeOpacity={0.5} />
                      <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize={12}>{t}</text>
                    </g>
                  );
                })}
                {/* x-axis labels every 5 days */}
                {labels.map((lab, i) => (
                  i % 5 === 0 ? (
                    <text key={i} x={margin.left + (innerW * i) / (labels.length - 1)} y={H - margin.bottom + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12}>{lab}</text>
                  ) : null
                ))}
                {/* axis line */}
                <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#475569" />
                {/* line path */}
                <path d={path} fill="none" stroke="#1D4ED8" strokeWidth={2} />
                {/* points and value labels */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={4} fill="#1D4ED8" stroke="#0B1220" strokeWidth={1} />
                    {p.v > 0 && (
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#cbd5e1" fontSize={12}>{p.v}</text>
                    )}
                  </g>
                ))}
              </svg>
            </AutoScroll>
          );
        })()}
      </div>

  {/* Faturação por dia (últimos 30 dias) */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-3">Faturação por dia (últimos 30 dias)</div>
        {(() => {
          const margin = { top: 24, right: 16, bottom: 48, left: 64 };
          const H = 320;
          const innerH = H - margin.top - margin.bottom;
          const step = 32;
          const barArea = Math.max(480, (labels.length - 1) * step);
          const W = margin.left + barArea + margin.right;
          const innerW = W - margin.left - margin.right;
          const yMax = Math.max(1, ...dailyRevenue);
          const ticks = 5;
          const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (yMax * i) / ticks);
          const points = dailyRevenue.map((v, i) => {
            const x = margin.left + (innerW * i) / (labels.length - 1);
            const y = margin.top + innerH - (v / yMax) * innerH;
            return { x, y, v };
          });
          const path = points.map((p,i)=> `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
          return (
            <AutoScroll depKey={labels.join(',') + '|' + dailyRevenue.join(',')}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
                {yTicks.map((t, idx) => {
                  const y = margin.top + innerH - (t / yMax) * innerH;
                  return (
                    <g key={idx}>
                      <line x1={margin.left} x2={W - margin.right} y1={y} y2={y} stroke="#334155" strokeOpacity={0.5} />
                      <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize={12}>{formatPriceEUR(t)}</text>
                    </g>
                  );
                })}
                {labels.map((lab, i) => (
                  i % 5 === 0 ? (
                    <text key={i} x={margin.left + (innerW * i) / (labels.length - 1)} y={H - margin.bottom + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12}>{lab}</text>
                  ) : null
                ))}
                <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#475569" />
                <path d={path} fill="none" stroke="#6D28D9" strokeWidth={2} />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={4} fill="#6D28D9" stroke="#0B1220" strokeWidth={1} />
                    {p.v > 0 && (
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#cbd5e1" fontSize={12}>{formatPriceEUR(p.v)}</text>
                    )}
                  </g>
                ))}
              </svg>
            </AutoScroll>
          );
        })()}
        </div>
      </div>
    </div>
  );
}
