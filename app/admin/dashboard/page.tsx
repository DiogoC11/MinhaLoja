"use client";
import useSWR from 'swr';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Order } from '@/lib/orders';
import type { Product } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';

const fetcher = (u: string) => fetch(u).then(r=>r.json());

function AutoScroll({ children, depKey }: { children: ReactNode; depKey?: string }){
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Scroll to the far right (today) after layout
    requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
  }, [depKey]);
  return <div ref={ref} className="overflow-x-auto">{children}</div>;
}

type TopItem = { productId: string; qty: number; product: Product | null };
function TopProductsChart({ top, depKey }: { top: TopItem[]; depKey?: string }){
  const [progress, setProgress] = useState(0); // 0..1 for bar animation
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
  const dur = 1400; // ms (slower animation)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [depKey]);

  const margin = { top: 16, right: 16, bottom: 56, left: 40 };
  const H = 320;
  const innerH = H - margin.top - margin.bottom;
  const barArea = Math.max(360, top.length * 100);
  const W = margin.left + barArea + margin.right;
  const innerW = W - margin.left - margin.right;
  const yMax = Math.max(1, ...top.map(t => t.qty));
  const ticks = 5;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((yMax * i) / ticks));
  const band = innerW / Math.max(1, top.length);
  const barW = Math.min(64, Math.max(28, band * 0.6));
  const color = '#3B82F6';

  return (
    <AutoScroll depKey={depKey}>
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
          const fullH = (qty / yMax) * innerH;
          const h = fullH * progress;
          const y = margin.top + innerH - h;
          const name = product?.nome || '(produto removido)';
          const labelY = y - 6;
          return (
            <g key={productId}>
              <rect x={x} y={y} width={barW} height={h} fill={color} opacity={0.9} />
              {progress > 0.1 && (
                <text x={x + barW / 2} y={labelY} textAnchor="middle" fill="#cbd5e1" fontSize={12}>
                  {qty}
                </text>
              )}
              <text x={x + barW / 2} y={H - margin.bottom + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12} style={{ pointerEvents: 'none' }}>
                {name.length > 16 ? name.slice(0, 15) + '…' : name}
              </text>
            </g>
          );
        })}
        <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#475569" />
      </svg>
    </AutoScroll>
  );
}

// Generic animated line chart that reveals from left to right
function LineChart({
  labels,
  values,
  color,
  depKey,
  leftMargin,
  yTickFormatter,
  valueFormatter,
}: {
  labels: string[];
  values: number[];
  color: string;
  depKey?: string;
  leftMargin: number;
  yTickFormatter?: (v: number) => string | number;
  valueFormatter?: (v: number) => string | number;
}){
  const [progress, setProgress] = useState(0); // 0..1 reveal
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => {
    // measure on next frame after DOM paints
    requestAnimationFrame(() => {
      if (pathRef.current) {
        try { setPathLen(pathRef.current.getTotalLength()); } catch {}
      }
    });
    let raf = 0;
    const start = performance.now();
  const dur = 1600; // slower reveal
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      setProgress(ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [depKey]);

  const margin = { top: 24, right: 16, bottom: 48, left: leftMargin };
  const H = 320;
  const innerH = H - margin.top - margin.bottom;
  const step = 32;
  const barArea = Math.max(480, Math.max(0, labels.length - 1) * step);
  const W = margin.left + barArea + margin.right;
  const innerW = W - margin.left - margin.right;
  const yMax = Math.max(1, ...values);
  const ticks = 5;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (yMax * i) / ticks);
  const denom = Math.max(1, labels.length - 1);
  const points = values.map((v, i) => {
    const x = margin.left + (innerW * i) / denom;
    const y = margin.top + innerH - (v / yMax) * innerH;
    return { x, y, v };
  });
  const path = points.map((p,i)=> `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const revealedIdx = Math.floor(progress * denom + 0.001);
  const showValue = (v: number, i: number) => v > 0 && i <= revealedIdx && progress > 0.15;

  return (
    <AutoScroll depKey={depKey}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
        {/* grid and y-axis labels */}
        {yTicks.map((t, idx) => {
          const y = margin.top + innerH - (t / yMax) * innerH;
          const yLabel = yTickFormatter ? yTickFormatter(t) : Math.round(t);
          return (
            <g key={idx}>
              <line x1={margin.left} x2={W - margin.right} y1={y} y2={y} stroke="#334155" strokeOpacity={0.5} />
              <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize={12}>{yLabel}</text>
            </g>
          );
        })}
        {/* x-axis labels every 5 days */}
        {labels.map((lab, i) => (
          i % 5 === 0 ? (
            <text key={i} x={margin.left + (innerW * i) / denom} y={H - margin.bottom + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12}>{lab}</text>
          ) : null
        ))}
        {/* axis line */}
        <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#475569" />
        {/* animated line path */}
        <path ref={pathRef} d={path} fill="none" stroke={color} strokeWidth={2}
              style={pathLen ? { strokeDasharray: pathLen, strokeDashoffset: (1 - progress) * pathLen } : undefined} />
        {/* points and value labels (revealed progressively) */}
        {points.map((p, i) => (
          i <= revealedIdx ? (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#0B1220" strokeWidth={1} />
              {showValue(p.v, i) && (
                <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#cbd5e1" fontSize={12}>
                  {valueFormatter ? valueFormatter(p.v) : p.v}
                </text>
              )}
            </g>
          ) : null
        ))}
      </svg>
    </AutoScroll>
  );
}

export default function AdminDashboard(){
  const { data: orders } = useSWR<Order[]>('/api/orders', fetcher);
  const { data: products } = useSWR<Product[]>('/api/products', fetcher);
  const [topRange, setTopRange] = useState<'all'|'3m'|'1m'>('1m');
  const list = orders || [];
  const prods = products || [];
  const prodMap = new Map(prods.map(p => [p.id, p] as const));

  const now = Date.now();
  const thirtyDays = 1000*60*60*24*30;
  const recent = list.filter(o => (now - o.createdAt) <= thirtyDays);
  const comprasUltimoMes = recent.length;

  // Determinar período para o gráfico de "mais comprados"
  function monthsAgoStart(n: number){ const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-n); return d.getTime(); }
  const fromTs = topRange === 'all' ? 0 : monthsAgoStart(topRange === '3m' ? 3 : 1);
  const ordersForTop = topRange === 'all' ? list : list.filter(o => o.createdAt >= fromTs);

  const qtyByProduct = new Map<string, number>();
  for (const o of ordersForTop){
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
  // maxQty no longer used directly; handled in TopProductsChart

  return (
    <div className="grid gap-4">
      {/* Produtos mais comprados primeiro */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Produtos mais comprados</div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-400">Período</label>
            <select
              className="border border-slate-600 rounded bg-slate-900 px-2 py-1"
              value={topRange}
              onChange={e=>setTopRange(e.target.value as 'all'|'3m'|'1m')}
            >
              <option value="all">Desde sempre</option>
              <option value="3m">Últimos 3 meses</option>
              <option value="1m">Último mês</option>
            </select>
          </div>
        </div>
        {top.length === 0 ? (
          <div className="text-slate-400">Sem dados de compras.</div>
        ) : (
          <TopProductsChart top={top} depKey={topRange + '|' + top.map(t=>`${t.productId}:${t.qty}`).join('|')} />
        )}
      </div>

      {/* Linha: duas colunas lado a lado */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Compras por dia (últimos 30 dias) */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-3">Compras por dia (últimos 30 dias)</div>
        <LineChart
          labels={labels}
          values={dailyCounts}
          color="#1D4ED8"
          depKey={labels.join(',') + '|' + dailyCounts.join(',')}
          leftMargin={48}
          yTickFormatter={(t)=> Math.round(t)}
        />
      </div>

  {/* Faturação por dia (últimos 30 dias) */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
        <div className="font-semibold mb-3">Faturação por dia (últimos 30 dias)</div>
        <LineChart
          labels={labels}
          values={dailyRevenue}
          color="#6D28D9"
          depKey={labels.join(',') + '|' + dailyRevenue.join(',')}
          leftMargin={64}
          yTickFormatter={(t)=> formatPriceEUR(t)}
          valueFormatter={(v)=> formatPriceEUR(v)}
        />
        </div>
      </div>
    </div>
  );
}
