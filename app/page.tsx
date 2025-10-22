"use client";
import useSWR from 'swr';
import ProductCard, { type Product } from '@/components/ProductCard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage(){
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const list = data || [];

  const cats = Array.from(new Set(list.map((p: Product) => p.categoria)));

  function applyFilter(q: string, cat: string){
    q = (q || '').toLowerCase();
    cat = (cat || '').toLowerCase();
    return list
      .filter((p: Product) => (!q || `${p.nome} ${p.descricao}`.toLowerCase().includes(q)))
      .filter((p: Product) => (!cat || (p.categoria || '').toLowerCase() === cat));
  }

  return (
    <div>
      <div className="toolbar">
        <h2 className="m-0">Todos os produtos</h2>
        <div className="flex items-center gap-2">
          <input id="q" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Buscar produtos" />
          <select id="cat" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
            <option value="">Todas categorias</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-products" id="grid">
  {list.map((p: Product) => <ProductCard key={p.id} p={p} onDetails={(id)=>location.href=`/produto/${id}`} />)}
      </div>
      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          const q = document.getElementById('q');
          const cat = document.getElementById('cat');
          const grid = document.getElementById('grid');
          function filter(){
            const qs = (q.value||'').toLowerCase();
            const cs = (cat.value||'').toLowerCase();
            const items = Array.from(grid.children);
            items.forEach((item) => {
              const name = item.querySelector('h3')?.textContent?.toLowerCase()||'';
              const desc = item.querySelector('.text-slate-300')?.textContent?.toLowerCase()||'';
              const match = (!qs || (name + ' ' + desc).includes(qs));
              item.style.display = match ? '' : 'none';
            });
          }
          q?.addEventListener('input', filter);
          cat?.addEventListener('change', filter);
        })();
      `}} />
    </div>
  );
}
