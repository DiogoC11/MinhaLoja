"use client";
import useSWR from 'swr';
import ProductCard, { type Product } from '@/components/ProductCard';
import type { Category } from '@/lib/categories';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage(){
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const list = data || [];
  const prices = list.map((p: Product) => p.preco);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const catsFromApi = (catsData || []) as unknown as Category[];
  const cats = (catsFromApi && catsFromApi.length > 0)
    ? catsFromApi.map(c => c.nome)
    : Array.from(new Set(list.map((p: Product) => p.categoria)));

  return (
    <div>
      <div className="toolbar">
        <h2 className="m-0">Todos os produtos</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        {/* Lista de produtos (esquerda) */}
        <div>
          <div className="grid-products" id="grid">
            {list.map((p: Product) => (
              <div key={p.id} data-cat={(p.categoria||'').toLowerCase()} data-price={p.preco} className="h-full">
                <ProductCard p={p} onDetails={(id)=>location.href=`/produto/${id}`} />
              </div>
            ))}
            {list.length === 0 && (
              <div className="muted">Sem produtos.</div>
            )}
          </div>
        </div>

        {/* Filtros (direita) */}
        <aside className="md:sticky md:top-24 card p-4 h-fit">
          <h3 className="font-semibold mb-3">Filtros</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Procurar</label>
              <input id="q" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Produto ou descrição" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Categoria</label>
              <select id="cat" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
                <option value="">Todas</option>
                {cats.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400">Preço</label>
              <div className="text-sm flex items-center justify-between">
                <span id="minLabel">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(minPrice)}</span>
                <span id="maxLabel">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(maxPrice)}</span>
              </div>
              <div className="relative h-8 flex items-center select-none" id="rangeWrap">
                {/* Trilho de fundo */}
                <div id="rangeTrack" className="absolute left-0 right-0 h-1 bg-slate-700 rounded" />
                {/* Dois sliders sobrepostos */}
                <input id="minR" type="range" min={minPrice} max={maxPrice} step="0.01" defaultValue={minPrice}
                  className="absolute w-full appearance-none bg-transparent pointer-events-auto" />
                <input id="maxR" type="range" min={minPrice} max={maxPrice} step="0.01" defaultValue={maxPrice}
                  className="absolute w-full appearance-none bg-transparent pointer-events-auto" />
              </div>
              <small className="muted">Arraste as bolinhas para definir o intervalo.</small>
            </div>
          </div>
        </aside>
      </div>

      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          const fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
          const q = document.getElementById('q');
          const cat = document.getElementById('cat');
          const grid = document.getElementById('grid');
          const minR = document.getElementById('minR');
          const maxR = document.getElementById('maxR');
          const rangeTrack = document.getElementById('rangeTrack');
          const minLabel = document.getElementById('minLabel');
          const maxLabel = document.getElementById('maxLabel');
          const minBound = parseFloat(minR.min||'0');
          const maxBound = parseFloat(maxR.max||'0');
          const step = parseFloat(minR.step||'0.01') || 0.01;

          function clampHandles(){
            let minVal = parseFloat(minR.value);
            let maxVal = parseFloat(maxR.value);
            if (minVal > maxVal - step) { minVal = maxVal - step; minR.value = String(minVal); }
            if (maxVal < minVal + step) { maxVal = minVal + step; maxR.value = String(maxVal); }
            // Labels
            minLabel.textContent = fmt.format(minVal);
            maxLabel.textContent = fmt.format(maxVal);
            // Track highlight
            const pct = (v) => ((v - minBound) / (maxBound - minBound)) * 100;
            const l = pct(minVal); const r = pct(maxVal);
            rangeTrack.style.background = 'linear-gradient(90deg, ' +
              '#334155 ' + l + '%, #60a5fa ' + l + '%, #60a5fa ' + r + '%, #334155 ' + r + '%)';
          }

          function filter(){
            clampHandles();
            const qs = (q.value||'').toLowerCase();
            const cs = (cat.value||'').toLowerCase();
            const minVal = parseFloat(minR.value);
            const maxVal = parseFloat(maxR.value);
            const items = Array.from(grid.children);
            items.forEach((item) => {
              const name = item.querySelector('h3')?.textContent?.toLowerCase()||'';
              const desc = item.querySelector('.text-slate-300')?.textContent?.toLowerCase()||'';
              const catVal = (item.getAttribute('data-cat')||'').toLowerCase();
              const price = parseFloat(item.getAttribute('data-price')||'0');
              const inRange = price >= minVal && price <= maxVal;
              const match = (!qs || (name + ' ' + desc).includes(qs)) && (!cs || catVal === cs) && inRange;
              item.style.display = match ? '' : 'none';
            });
          }

          // Eventos
          q?.addEventListener('input', filter);
          cat?.addEventListener('change', filter);
          minR?.addEventListener('input', filter);
          maxR?.addEventListener('input', filter);
          // Inicialização
          clampHandles();
        })();
      `}} />
    </div>
  );
}
