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
        <h2 className="m-0 text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 text-transparent bg-clip-text drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]">Todos os Produtos</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        {/* Lista de produtos (esquerda) */}
        <div>
          <div className="grid-products" id="grid">
            {list.map((p: Product, i: number) => (
              <div key={p.id} data-idx={i} data-cat={(p.categoria||'').toLowerCase()} data-price={p.preco} className="h-full">
                <ProductCard p={p} onDetails={(id)=>location.href=`/produto/${id}`} />
              </div>
            ))}
            {list.length === 0 && (
              <div className="muted">Sem produtos.</div>
            )}
          </div>
          {/* Paginação */}
          <div id="pager" className="mt-6 flex items-center justify-center gap-2 flex-wrap"></div>
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
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Ordenar por preço</label>
              <select id="sort" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
                <option value="">Padrão</option>
                <option value="asc">Mais barato → caro</option>
                <option value="desc">Mais caro → barato</option>
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
          const sortSel = document.getElementById('sort');
          const pager = document.getElementById('pager');
          const pageSize = 20; // max 20 por página
          let currentPage = 1;
          let shouldScrollOnNextFilter = false;
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
          let justChangedSearch = false;
          let typingMin = false;
          let typingMax = false;

          function buildPageList(total, current){
            const pages = [];
            if (total <= 1) return pages;
            const delta = 2;
            const left = Math.max(2, current - delta);
            const right = Math.min(total - 1, current + delta);
            pages.push(1);
            if (left > 2) pages.push('...');
            for (let i = left; i <= right; i++) pages.push(i);
            if (right < total - 1) pages.push('...');
            if (total > 1) pages.push(total);
            return pages;
          }

          function renderPager(totalPages){
            if (!pager) return;
            if (!totalPages || totalPages <= 1){ pager.innerHTML = ''; return; }
            // Prev / numbers / Next
            const pages = buildPageList(totalPages, currentPage);
            const parts = [];
            const prevDisabled = (currentPage===1) ? ' opacity-50 cursor-not-allowed' : '';
            parts.push('<button type="button" data-page="prev" class="px-3 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-blue-400'+prevDisabled+'">Anterior</button>');
            pages.forEach(function(p){
              if (p === '...') {
                parts.push('<span class="px-2 text-slate-400 select-none">…</span>');
              } else {
                const active = (p === currentPage);
                const cls = 'px-3 py-1 rounded-md border ' + (active ? 'bg-slate-800 border-blue-400 text-blue-300 font-semibold' : 'border-slate-600 text-slate-200 hover:border-blue-400');
                parts.push('<button type="button" data-page="'+p+'" class="'+cls+'">'+p+'</button>');
              }
            });
            const nextDisabled = (currentPage===totalPages) ? ' opacity-50 cursor-not-allowed' : '';
            parts.push('<button type="button" data-page="next" class="px-3 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-blue-400'+nextDisabled+'">Seguinte</button>');
            pager.innerHTML = parts.join('');
          }

          pager?.addEventListener('click', function(e){
            const btn = e.target.closest('[data-page]');
            if (!btn) return;
            const val = btn.getAttribute('data-page');
            const items = Array.from(grid.children);
            const visible = items.filter(el => el.style.display !== 'none');
            // total pages will be recomputed in filter(); here just adjust currentPage then re-filter
            if (val === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (val === 'next') currentPage = currentPage + 1; // clamp later in filter
            else currentPage = parseInt(val, 10) || 1;
            shouldScrollOnNextFilter = true;
            filter();
          });

          function scrollToGrid(){
            // Voltar ao topo da página
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
          }

          function filter(){
            // Pesquisa sem acentos
            const strip = (s) => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const qs = strip(q.value||'').toLowerCase();
            const cs = (cat.value||'').toLowerCase();
            const applySearch = !!qs; // aplica pesquisa independentemente da categoria
            const items = Array.from(grid.children);

            // Calcular limites dinâmicos (min/max)
            const pricesForBounds = [];
            items.forEach((item) => {
              const name = strip(item.querySelector('h3')?.textContent||'').toLowerCase();
              const catVal = (item.getAttribute('data-cat')||'').toLowerCase();
              const price = parseFloat(item.getAttribute('data-price')||'0');
              // Quando a pesquisa está vazia, não aplicar filtro por nome; apenas categoria
              const byCatOnly = (cs ? catVal === cs : true);
              const withName = byCatOnly && (name.includes(qs));
              const baseMatch = !qs ? byCatOnly : withName;
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
            // Se acabou de mudar a pesquisa por nome, repor automaticamente o intervalo completo dos resultados atuais
            if (justChangedSearch){
              minVal = curMinBound;
              maxVal = curMaxBound;
              justChangedSearch = false;
              // Forçar sincronização visual dos inputs com os novos limites derivados da pesquisa
              try { minI.value = String(minVal); } catch {}
              try { maxI.value = String(maxVal); } catch {}
            }
            // Requisito: se pesquisa por nome está vazia, repor intervalo global
            if (!qs){
              minVal = curMinBound;
              maxVal = curMaxBound;
            }
            // Ajustar aos limites dinâmicos
            if (minVal < curMinBound) minVal = curMinBound;
            if (maxVal > curMaxBound) maxVal = curMaxBound;
            // Refletir coerção no input para evitar floats/out-of-bounds,
            // mas não enquanto o utilizador está a escrever (para não impedir edição)
            if (!typingMin && String(minI.value) !== String(minVal)) minI.value = String(minVal);
            if (!typingMax && String(maxI.value) !== String(maxVal)) maxI.value = String(maxVal);
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
            // Calcular items que passam no filtro completo
            const matches = [];
            for (const item of items){
              const name = strip(item.querySelector('h3')?.textContent||'').toLowerCase();
              const catVal = (item.getAttribute('data-cat')||'').toLowerCase();
              const price = parseFloat(item.getAttribute('data-price')||'0');
              const baseMatch = (cs ? catVal === cs : true) && (applySearch ? name.includes(qs) : true);
              const inRange = invalidRange ? true : (price >= minVal && price <= maxVal);
              const match = baseMatch && inRange;
              if (match) matches.push(item);
            }

            // Ordenação por preço (reordena o DOM para refletir a ordenação visual)
            const order = sortSel ? (sortSel.value || '') : '';
            const frag = document.createDocumentFragment();
            if (order === 'asc' || order === 'desc'){
              matches.sort(function(a, b){
                const pa = parseFloat(a.getAttribute('data-price')||'0');
                const pb = parseFloat(b.getAttribute('data-price')||'0');
                return order === 'asc' ? (pa - pb) : (pb - pa);
              });
              matches.forEach(function(el){ frag.appendChild(el); });
              grid.appendChild(frag);
            } else {
              // Padrão: restaurar ordem original (data-idx)
              matches.sort(function(a, b){
                const ia = parseInt(a.getAttribute('data-idx')||'0', 10);
                const ib = parseInt(b.getAttribute('data-idx')||'0', 10);
                return ia - ib;
              });
              matches.forEach(function(el){ frag.appendChild(el); });
              grid.appendChild(frag);
            }

            // Paginação baseada no número de matches
            const totalMatches = matches.length;
            const totalPages = Math.max(1, Math.ceil(totalMatches / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            // Esconder todos e mostrar apenas os da página atual
            items.forEach((el) => { el.style.display = 'none'; });
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            matches.slice(start, end).forEach((el) => { el.style.display = ''; });

            // Renderizar a paginação
            renderPager(totalPages);

            if (shouldScrollOnNextFilter) {
              shouldScrollOnNextFilter = false;
              scrollToGrid();
            }
          }

          // Eventos
          // Debounce leve para pesquisa por nome (inclui backspace)
          let qDeb = 0;
          function scheduleFilterFromSearch(){
            currentPage = 1;
            shouldScrollOnNextFilter = true;
            justChangedSearch = true;
            if (qDeb) cancelAnimationFrame(qDeb);
            qDeb = requestAnimationFrame(filter);
          }
          q?.addEventListener('input', scheduleFilterFromSearch);
          q?.addEventListener('keyup', scheduleFilterFromSearch);
          q?.addEventListener('change', scheduleFilterFromSearch);
          cat?.addEventListener('change', function(){
            // Se selecionar "Todas", limpar a pesquisa para mostrar todos os produtos
            if ((cat.value||'') === '') { q.value = ''; }
            lastChanged = null;
            justChangedCategory = true;
            currentPage = 1;
            shouldScrollOnNextFilter = true;
            filter();
          });
          minI?.addEventListener('input', function(){ typingMin = true; lastChanged = 'min'; currentPage = 1; filter(); });
          maxI?.addEventListener('input', function(){ typingMax = true; lastChanged = 'max'; currentPage = 1; filter(); });
          sortSel?.addEventListener('change', function(){ currentPage = 1; shouldScrollOnNextFilter = true; filter(); });
          minI?.addEventListener('change', function(){ typingMin = false; lastChanged = 'min'; currentPage = 1; shouldScrollOnNextFilter = true; filter(); });
          maxI?.addEventListener('change', function(){ typingMax = false; lastChanged = 'max'; currentPage = 1; shouldScrollOnNextFilter = true; filter(); });
          minI?.addEventListener('blur', function(){ typingMin = false; });
          maxI?.addEventListener('blur', function(){ typingMax = false; });
          // Inicialização
          requestAnimationFrame(filter);
        })();
      `}} />
    </div>
  );
}
