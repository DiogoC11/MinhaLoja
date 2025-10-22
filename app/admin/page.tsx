"use client";
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Product } from '@/components/ProductCard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminPage(){
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Proteger página: requer sessão
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
    const fd = new FormData(e.currentTarget);
    const body = {
      nome: String(fd.get('nome')||'').trim(),
      preco: Number(fd.get('preco')||0),
      categoria: String(fd.get('categoria')||'Outros').trim() || 'Outros',
      imagem: String(fd.get('imagem')||'').trim(),
      descricao: String(fd.get('descricao')||'').trim(),
    };
    if (!body.nome || !isFinite(body.preco) || body.preco < 0){
      alert('Preencha nome e preço válidos.');
      return;
    }
    setBusy(true);
    try{
      const res = await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Falha ao guardar');
      await mutate('/api/products');
      e.currentTarget.reset();
      alert('Produto adicionado com sucesso!');
    }catch(err: any){
      alert(err.message || 'Erro desconhecido');
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
    if (!Array.isArray(arr)) { alert('JSON inválido'); return; }
    for (const p of arr){
      await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });
    }
    await mutate('/api/products');
    alert('Importação concluída.');
    e.target.value = '';
  }

  if (authed === null) return <div className="min-h-[50vh] grid place-items-center">A verificar permissões…</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Adicionar produto</h2>
      <form className="form card p-4" onSubmit={onSubmit}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Nome</label>
            <input name="nome" required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: Camiseta Premium" />
          </div>
          <div className="flex flex-col gap-1">
               <label className="text-slate-400">Preço (€)</label>
            <input name="preco" type="number" min="0" step="0.01" required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: 99.90" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Categoria</label>
            <input name="categoria" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: Roupas" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Imagem (URL)</label>
            <input name="imagem" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="https://..." />
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-3">
          <label className="text-slate-400">Descrição</label>
          <textarea name="descricao" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 min-h-24" placeholder="Detalhes do produto"></textarea>
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <button type="button" className="btn btn-ghost" onClick={onExport}>Exportar JSON</button>
          <label className="btn btn-ghost cursor-pointer">Importar JSON
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
          </label>
             <button type="submit" className="btn" disabled={busy}>{busy? 'A guardar...' : 'Guardar produto'}</button>
        </div>
      </form>
    </div>
  );
}
