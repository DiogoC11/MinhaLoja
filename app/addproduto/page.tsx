"use client";
import { useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Category } from '@/lib/categories';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AddProdutoPage(){
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Previews para criação
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createPreviews, setCreatePreviews] = useState<string[]>([]);
  const createPreviewsRef = useRef<string[]>([]);
  useEffect(() => { createPreviewsRef.current = createPreviews; }, [createPreviews]);
  useEffect(() => {
    // Libertar quaisquer URLs ao desmontar
    return () => { createPreviewsRef.current.forEach(url => { try{ URL.revokeObjectURL(url); }catch{} }); };
  }, []);

  // Proteger página: requer sessão (client-side para manter consistência com admin/page)
  useState(() => {
    (async () => {
      try{
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        const j = await r.json();
        const isOk = !!(j.user && j.user.isAdmin);
        setAuthed(isOk);
        if (!isOk) location.href = '/';
      }catch{ setAuthed(false); location.href = '/login'; }
    })();
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      nome: String(fd.get('nome')||'').trim(),
      preco: Number(fd.get('preco')||0),
      categoria: String(fd.get('categoria')||'Outros').trim() || 'Outros',
      imagem: '',
      imagens: [] as string[],
      descricao: String(fd.get('descricao')||'').trim(),
    };
    if (!body.nome || !isFinite(body.preco) || body.preco < 0){
      setNotice({ text: 'Preencha nome e preço válidos.', kind: 'error' });
      setTimeout(()=>setNotice(null), 3000);
      return;
    }
    setBusy(true);
    try{
      // Upload de várias imagens (requer pelo menos uma)
  const inputEl = form.querySelector('input[name="imagensFiles"]') as HTMLInputElement | null;
      const fromForm = Array.from(inputEl?.files || []);
      const selectedFiles = createFiles.length ? createFiles : fromForm;
      if (!selectedFiles.length) throw new Error('Selecione pelo menos uma imagem');
      const uploaded: string[] = [];
      for (const file of selectedFiles){
        const up = new FormData(); up.append('file', file);
        const ur = await fetch('/api/upload', { method: 'POST', body: up });
        if (!ur.ok) throw new Error('Falha no upload da imagem');
        const uj = await ur.json(); uploaded.push(uj.path);
      }
      body.imagens = uploaded;
      body.imagem = uploaded[0] || '';
      const res = await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Falha ao guardar');
  await mutate('/api/products');
  try { form.reset(); } catch {}
      setCreateFiles([]); setCreatePreviews([]);
      setNotice({ text: 'Produto adicionado com sucesso!', kind: 'success' });
      setTimeout(()=>setNotice(null), 3000);
    }catch(err: any){
      setNotice({ text: err.message || 'Erro desconhecido', kind: 'error' });
      setTimeout(()=>setNotice(null), 3000);
    }finally{ setBusy(false); }
  }

  async function onExport(){
    const res = await fetch('/api/products');
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'produtos.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) { setNotice({ text: 'JSON inválido', kind: 'error' }); setTimeout(()=>setNotice(null), 3000); return; }
    for (const p of arr){
      await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });
    }
    await mutate('/api/products');
    setNotice({ text: 'Importação concluída.', kind: 'success' });
    setTimeout(()=>setNotice(null), 3000);
    e.target.value = '';
  }

  if (authed === null) return <div className="min-h-[50vh] grid place-items-center">A verificar permissões…</div>;

  return (
    <div>
      {notice && (
        <div className={`mb-3 text-sm rounded px-3 py-2 border ${notice.kind==='success' ? 'text-green-200 bg-green-900/50 border-green-700' : 'text-red-200 bg-red-900/50 border-red-700'}`}>
          {notice.text}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-3">Adicionar produto</h2>
      <form className="form card p-4" onSubmit={onSubmit}>
        <div className="grid md:grid-cols-2 gap-3 min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-slate-400">Nome</label>
            <input name="nome" required className="w-full max-w-full border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: Camiseta Premium" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-slate-400">Preço (€)</label>
            <input name="preco" type="number" min="0" step="0.01" required className="w-full max-w-full border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: 99.90" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-slate-400">Categoria</label>
            <select name="categoria" required className="w-full max-w-full border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
              <option value="">Selecione uma categoria</option>
              {(catsData||[]).map((c:any)=> <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-slate-400">Imagens (ficheiros)</label>
            <input name="imagensFiles" type="file" accept="image/*" multiple required={createFiles.length === 0} className="w-full max-w-full border border-slate-600 rounded-md bg-slate-900 px-3 py-2 text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-blue-400 file:text-slate-900 file:font-semibold file:px-3 file:py-2 hover:file:bg-blue-500 file:transition-colors file:duration-150"
              onChange={(e)=>{
                const files = Array.from(e.currentTarget.files||[]) as File[];
                if (files.length === 0) return;
                setCreateFiles(prev => [...prev, ...files]);
                // previews (acrescentar, sem revogar as anteriores)
                const urls = files.map(f => URL.createObjectURL(f));
                setCreatePreviews(prev => [...prev, ...urls]);
                // permitir escolher novamente os mesmos ficheiros
                e.currentTarget.value = '';
              }} />
            {createPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {createPreviews.map((src, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`preview ${i+1}`} className="w-16 h-16 object-contain rounded bg-slate-800" />
                    <button type="button" aria-label="Remover" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs"
                      onClick={() => {
                        setCreateFiles(fs => fs.filter((_, idx) => idx !== i));
                        setCreatePreviews(prev => {
                          const url = prev[i]; try{ URL.revokeObjectURL(url); }catch{}
                          return prev.filter((_, idx) => idx !== i);
                        });
                      }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-3 min-w-0">
          <label className="text-slate-400">Descrição</label>
          <textarea name="descricao" className="w-full max-w-full border border-slate-600 rounded-md bg-slate-900 px-3 py-2 min-h-24" placeholder="Detalhes do produto"></textarea>
        </div>
        <div className="flex flex-wrap gap-2 justify-end mt-3 min-w-0">
          <button type="button" className="btn block sm:inline-flex w-auto max-w-full px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2 leading-tight break-words text-center sm:whitespace-nowrap" onClick={onExport}>Exportar JSON</button>
          <label className="btn cursor-pointer block sm:inline-flex w-auto max-w-full px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2 leading-tight break-words text-center sm:whitespace-nowrap">Importar JSON
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
          </label>
          <button type="submit" className="btn block sm:inline-flex w-auto max-w-full px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2 leading-tight break-words text-center sm:whitespace-nowrap" disabled={busy}>{busy? 'A guardar...' : 'Guardar produto'}</button>
        </div>
      </form>
    </div>
  );
}
