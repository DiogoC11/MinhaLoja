"use client";
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Product } from '@/lib/fsdb';
import type { Category } from '@/lib/categories';
import Modal from '@/components/Modal';
import { formatPriceEUR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminPage(){
  const { data } = useSWR<Product[]>('/api/products', fetcher);
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ nome: string; preco: number; categoria: string; imagem: string; descricao: string }>({ nome: '', preco: 0, categoria: '', imagem: '', descricao: '' });
  const [editFile, setEditFile] = useState<File | null>(null);

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
      imagem: '',
      descricao: String(fd.get('descricao')||'').trim(),
    };
    if (!body.nome || !isFinite(body.preco) || body.preco < 0){
      setNotice({ text: 'Preencha nome e preço válidos.', kind: 'error' });
      setTimeout(()=>setNotice(null), 3000);
      return;
    }
    setBusy(true);
    try{
      // upload image first
      const file = fd.get('imagemFile') as File | null;
      if (!file || !file.size) throw new Error('Selecione uma imagem');
      const up = new FormData(); up.append('file', file);
      const ur = await fetch('/api/upload', { method: 'POST', body: up });
      if (!ur.ok) throw new Error('Falha no upload da imagem');
      const uj = await ur.json();
      body.imagem = uj.path;
      const res = await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Falha ao guardar');
      await mutate('/api/products');
      e.currentTarget.reset();
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
            <select name="categoria" required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
              <option value="">Selecione uma categoria</option>
              {(catsData||[]).map((c:any)=> <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Imagem (ficheiro)</label>
            <input name="imagemFile" type="file" accept="image/*" required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
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

      {/* Products list for editing */}
      <div className="card p-0 overflow-hidden mt-4">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-slate-800">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2 w-[160px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data||[]).map((p) => (
              <tr key={p.id} className="border-t border-slate-700">
                <td className="px-3 py-2">{p.nome}</td>
                <td className="px-3 py-2">{p.categoria}</td>
                <td className="px-3 py-2">{formatPriceEUR(p.preco)}</td>
                <td className="px-3 py-2">
                  <button className="btn" onClick={() => { setEditId(p.id); setEdit({ nome: p.nome, preco: p.preco, categoria: p.categoria, imagem: p.imagem, descricao: p.descricao }); setEditOpen(true); }} disabled={busy}>Editar</button>
                </td>
              </tr>
            ))}
            {(data||[]).length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={4}>Sem produtos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} title="Editar produto" onClose={() => setEditOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditOpen(false)} disabled={busy}>Cancelar</button>
            <button className="btn" form="form-edit" disabled={busy}>Guardar</button>
          </>
        }>
        <form id="form-edit" onSubmit={async (e) => {
          e.preventDefault();
          if (!editId) return;
          setBusy(true);
          try{
            const payload = { ...edit } as any;
            if (editFile && editFile.size){
              const up = new FormData(); up.append('file', editFile);
              const ur = await fetch('/api/upload', { method: 'POST', body: up });
              if (!ur.ok) throw new Error('Falha no upload da imagem');
              const uj = await ur.json();
              payload.imagem = uj.path;
            }
            const res = await fetch(`/api/products/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Falha ao atualizar produto');
            await mutate('/api/products');
            setEditOpen(false);
            setEditId(null);
            setNotice({ text: 'Produto actualizado.', kind: 'success' });
            setTimeout(()=>setNotice(null), 3000);
          }catch(err: any){
            setNotice({ text: err?.message || 'Erro desconhecido', kind: 'error' });
            setTimeout(()=>setNotice(null), 3000);
          }finally{ setBusy(false); }
        }} className="grid gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Nome</label>
            <input value={edit.nome} onChange={e=>setEdit(s=>({...s, nome: e.target.value}))} required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Preço (€)</label>
              <input value={edit.preco} onChange={e=>setEdit(s=>({...s, preco: Number(e.target.value)}))} type="number" min="0" step="0.01" required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-400">Categoria</label>
              <select value={edit.categoria} onChange={e=>setEdit(s=>({...s, categoria: e.target.value}))} required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2">
                <option value="">Selecione uma categoria</option>
                {(catsData||[]).map((c:any)=> <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Imagem</label>
            <input type="file" accept="image/*" onChange={e=>setEditFile(e.currentTarget.files?.[0] || null)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
            {edit.imagem && <small className="muted">Imagem atual: {edit.imagem}</small>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Descrição</label>
            <textarea value={edit.descricao} onChange={e=>setEdit(s=>({...s, descricao: e.target.value}))} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 min-h-24" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
