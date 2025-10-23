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
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <small className="muted">Mínimo</small>
                  <input id="minPriceI" type="number" step="0.01" min={minPrice} max={maxPrice} defaultValue={minPrice}
                    placeholder={String(minPrice)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
                </div>
                <div className="flex flex-col gap-1">
                  <small className="muted">Máximo</small>
                  <input id="maxPriceI" type="number" step="0.01" min={minPrice} max={maxPrice} defaultValue={maxPrice}
                    placeholder={String(maxPrice)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
                </div>
              </div>
              <small className="muted">A lista actualiza conforme altera os valores.</small>
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
          const minI = document.getElementById('minPriceI');
          const maxI = document.getElementById('maxPriceI');
          const minBound = parseFloat(minI.min||'0');
          const maxBound = parseFloat(maxI.max||'0');

          function filter(){
            const qs = (q.value||'').toLowerCase();
            const cs = (cat.value||'').toLowerCase();
            let minVal = parseFloat(minI.value);
            let maxVal = parseFloat(maxI.value);
            if (!isFinite(minVal)) minVal = minBound;
            if (!isFinite(maxVal)) maxVal = maxBound;
            if (minVal > maxVal) { const t = minVal; minVal = maxVal; maxVal = t; }
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
          minI?.addEventListener('input', filter);
          maxI?.addEventListener('input', filter);
          minI?.addEventListener('change', filter);
          maxI?.addEventListener('change', filter);
          // Inicialização
          requestAnimationFrame(filter);
        })();
      `}} />
    </div>
  );
}
