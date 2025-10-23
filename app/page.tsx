"use client";
import useSWR from 'swr';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/fsdb';
import type { Category } from '@/lib/categories';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage(){
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const list = data || [];
  const prices = list.map((p: Product) => p.preco);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPriceInt = Math.floor(minPrice);
  const maxPriceInt = Math.ceil(maxPrice);
  const catsFromApi = (catsData || []) as unknown as Category[];
  const presentCatsSet = new Set(list.map((p: Product) => (p.categoria||'').trim()).filter(Boolean));
  const cats = (catsFromApi && catsFromApi.length > 0)
    // Mantém ordem do API mas filtra para apenas categorias com pelo menos 1 produto
    ? catsFromApi.map(c => c.nome).filter(nome => presentCatsSet.has((nome||'').trim()))
    // Fallback: deriva diretamente dos produtos
    : Array.from(presentCatsSet);

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
                  <input id="minPriceI" type="number" step={1} inputMode="numeric" min={minPriceInt} max={maxPriceInt} defaultValue={minPriceInt}
                    placeholder={String(minPriceInt)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
                  <small id="minPriceErr" className="text-red-400 text-xs hidden">O mínimo não pode ser superior ao máximo.</small>
                </div>
                <div className="flex flex-col gap-1">
                  <small className="muted">Máximo</small>
                  <input id="maxPriceI" type="number" step={1} inputMode="numeric" min={minPriceInt} max={maxPriceInt} defaultValue={maxPriceInt}
                    placeholder={String(maxPriceInt)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
                  <small id="maxPriceErr" className="text-red-400 text-xs hidden">O máximo não pode ser inferior ao mínimo.</small>
                </div>
              </div>
              
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
          const minErr = document.getElementById('minPriceErr');
          const maxErr = document.getElementById('maxPriceErr');
          const minBound = parseInt(minI.min||'0', 10); // limites iniciais (todos os produtos)
          const maxBound = parseInt(maxI.max||'0', 10);
          let curMinBound = minBound; // limites dinâmicos conforme filtros aplicados
          let curMaxBound = maxBound;
          let lastChanged = null;
          let justChangedCategory = false;

          function filter(){
            // Pesquisa sem acentos
            const strip = (s) => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const qs = strip(q.value||'').toLowerCase();
            const cs = (cat.value||'').toLowerCase();
            const applySearch = !!qs && !!cs; // apenas aplica pesquisa se uma categoria específica estiver selecionada
            const items = Array.from(grid.children);

            // Calcular limites dinâmicos (min/max) apenas com base nos itens que passam por nome+categoria
            const pricesForBounds = [];
            items.forEach((item) => {
              const name = strip(item.querySelector('h3')?.textContent||'').toLowerCase();
              const catVal = (item.getAttribute('data-cat')||'').toLowerCase();
              const price = parseFloat(item.getAttribute('data-price')||'0');
              const baseMatch = (cs ? catVal === cs : true) && (applySearch ? name.includes(qs) : true);
              if (baseMatch) pricesForBounds.push(price);
            });
            if (pricesForBounds.length > 0){
              curMinBound = Math.floor(Math.min.apply(null, pricesForBounds));
              curMaxBound = Math.ceil(Math.max.apply(null, pricesForBounds));
            } else {
              // Quando nenhum item é mostrado pelo filtro base, manter limites iniciais
              curMinBound = minBound; curMaxBound = maxBound;
            }

            // Atualizar atributos e placeholders dos inputs conforme limites dinâmicos
            minI.min = String(curMinBound); maxI.max = String(curMaxBound);
            minI.placeholder = String(curMinBound); maxI.placeholder = String(curMaxBound);

            // Forçar valores inteiros e restringir aos novos limites
            let minVal = parseFloat(minI.value);
            let maxVal = parseFloat(maxI.value);
            if (!isFinite(minVal)) minVal = curMinBound; if (!isFinite(maxVal)) maxVal = curMaxBound;
            minVal = Math.round(minVal); maxVal = Math.round(maxVal);
            // Se acabou de mudar a categoria, repor automaticamente o intervalo completo atual
            if (justChangedCategory){
              minVal = curMinBound;
              maxVal = curMaxBound;
              justChangedCategory = false;
            }
            // Ajustar aos limites dinâmicos
            if (minVal < curMinBound) minVal = curMinBound;
            if (maxVal > curMaxBound) maxVal = curMaxBound;
            // Refletir coerção no input para evitar floats/out-of-bounds
            if (String(minI.value) !== String(minVal)) minI.value = String(minVal);
            if (String(maxI.value) !== String(maxVal)) maxI.value = String(maxVal);
            const invalidRange = minVal > maxVal;

            // Show/hide inline error messages when the range is invalid
            if (invalidRange) {
              if (lastChanged === 'min') {
                minErr?.classList.remove('hidden');
                maxErr?.classList.add('hidden');
              } else if (lastChanged === 'max') {
                maxErr?.classList.remove('hidden');
                minErr?.classList.add('hidden');
              } else {
                // Default: show both if we can't detect which changed
                minErr?.classList.remove('hidden');
                maxErr?.classList.remove('hidden');
              }
            } else {
              minErr?.classList.add('hidden');
              maxErr?.classList.add('hidden');
            }
            items.forEach((item) => {
              const name = strip(item.querySelector('h3')?.textContent||'').toLowerCase();
              const catVal = (item.getAttribute('data-cat')||'').toLowerCase();
              const price = parseFloat(item.getAttribute('data-price')||'0');
              const baseMatch = (cs ? catVal === cs : true) && (applySearch ? name.includes(qs) : true);
              const inRange = invalidRange ? true : (price >= minVal && price <= maxVal);
              const match = baseMatch && inRange;
              item.style.display = match ? '' : 'none';
            });
          }

          // Eventos
          q?.addEventListener('input', filter);
          cat?.addEventListener('change', function(){
            // Se selecionar "Todas", limpar a pesquisa para mostrar todos os produtos
            if ((cat.value||'') === '') { q.value = ''; }
            lastChanged = null;
            justChangedCategory = true;
            filter();
          });
          minI?.addEventListener('input', function(){ lastChanged = 'min'; filter(); });
          maxI?.addEventListener('input', function(){ lastChanged = 'max'; filter(); });
          minI?.addEventListener('change', function(){ lastChanged = 'min'; filter(); });
          maxI?.addEventListener('change', function(){ lastChanged = 'max'; filter(); });
          // Inicialização
          requestAnimationFrame(filter);
        })();
      `}} />
    </div>
  );
}
