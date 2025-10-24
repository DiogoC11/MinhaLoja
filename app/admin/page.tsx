"use client";
import { useEffect, useState } from 'react';
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
  // Previews para criação
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createPreviews, setCreatePreviews] = useState<string[]>([]);
  useEffect(() => {
    // libertar URLs antigas
    return () => { createPreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [createPreviews]);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ nome: string; preco: number; categoria: string; imagem: string; imagens?: string[]; descricao: string }>({ nome: '', preco: 0, categoria: '', imagem: '', imagens: [], descricao: '' });
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);
  useEffect(() => {
    return () => { editPreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [editPreviews]);

  // Delete modal state
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delTarget, setDelTarget] = useState<{ id: string; nome: string } | null>(null);

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
      if (!createFiles.length) throw new Error('Selecione pelo menos uma imagem');
      const uploaded: string[] = [];
      for (const file of createFiles){
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
      e.currentTarget.reset();
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
            <label className="text-slate-400">Imagens (ficheiros)</label>
            <input name="imagensFiles" type="file" accept="image/*" multiple required className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2"
              onChange={(e)=>{
                const files = Array.from(e.currentTarget.files||[]) as File[];
                setCreateFiles(files);
                // previews
                const urls = files.map(f => URL.createObjectURL(f));
                setCreatePreviews(prev => { prev.forEach(u=>URL.revokeObjectURL(u)); return urls; });
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
              <th className="px-3 py-2 w-[140px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data||[]).map((p) => (
              <tr key={p.id} className="border-t border-slate-700">
                <td className="px-3 py-2">{p.nome}</td>
                <td className="px-3 py-2">{p.categoria}</td>
                <td className="px-3 py-2">{formatPriceEUR(p.preco)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost px-2 text-slate-300 hover:text-slate-400"
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => {
                        setEditId(p.id);
                        setEdit({ nome: p.nome, preco: p.preco, categoria: p.categoria, imagem: p.imagem, imagens: p.imagens||[], descricao: p.descricao });
                        setEditFiles([]);
                        setEditPreviews([]);
                        setEditOpen(true);
                      }}
                      disabled={busy}
                    >
                      {/* Lápis */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.714 0l-1.157 1.157 3.714 3.714 1.157-1.157a2.625 2.625 0 0 0 0-3.714z" />
                        <path d="M19.513 8.199 15.8 4.486 4.034 16.251a5.25 5.25 0 0 0-1.32 2.165l-.746 2.238a.75.75 0 0 0 .95.95l2.238-.746a5.25 5.25 0 0 0 2.165-1.32L19.513 8.2z" />
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost px-2 text-red-500 hover:text-red-600"
                      title="Remover"
                      aria-label="Remover"
                      onClick={() => { if (busy) return; setDelTarget({ id: p.id, nome: p.nome }); setDelOpen(true); }}
                      disabled={busy}
                    >
                      {/* Lixo */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M9 3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75V6h3a.75.75 0 0 1 0 1.5h-.443l-1.007 11.08A2.25 2.25 0 0 1 14.311 21H9.689a2.25 2.25 0 0 1-2.238-2.42L6.443 7.5H6A.75.75 0 0 1 6 6h3V3.75zM10.5 6h3V4.5h-3V6z" />
                        <path d="M10 9.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75zm4 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75z" />
                      </svg>
                    </button>
                  </div>
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
            // Validações de campos obrigatórios
            if (!edit.nome || !String(edit.nome).trim()) { setNotice({ text: 'O nome é obrigatório.', kind: 'error' }); setTimeout(()=>setNotice(null), 3000); return; }
            if (!isFinite(Number(edit.preco)) || Number(edit.preco) < 0) { setNotice({ text: 'O preço é inválido.', kind: 'error' }); setTimeout(()=>setNotice(null), 3000); return; }
            if (!edit.categoria || !String(edit.categoria).trim()) { setNotice({ text: 'A categoria é obrigatória.', kind: 'error' }); setTimeout(()=>setNotice(null), 3000); return; }
            const baseImgs = (edit.imagens && edit.imagens.length ? [...edit.imagens] : (edit.imagem ? [edit.imagem] : [])) as string[];
            if ((baseImgs.length + editFiles.length) === 0){ setNotice({ text: 'Adicione pelo menos uma imagem.', kind: 'error' }); setTimeout(()=>setNotice(null), 3000); return; }
            const payload = { ...edit } as any;
            if (editFiles.length){
              const uploaded: string[] = [];
              for (const f of editFiles){
                const up = new FormData(); up.append('file', f);
                const ur = await fetch('/api/upload', { method: 'POST', body: up });
                if (!ur.ok) throw new Error('Falha no upload da imagem');
                const uj = await ur.json(); uploaded.push(uj.path);
              }
              const base = Array.isArray(edit.imagens) && edit.imagens.length
                ? [...edit.imagens]
                : (edit.imagem ? [edit.imagem] : []);
              const merged = Array.from(new Set([...(base as string[]), ...uploaded]));
              payload.imagens = merged;
              // manter a principal atual se existir, senão primeira da lista
              payload.imagem = (base[0] || merged[0] || payload.imagem || '');
            } else if (Array.isArray(payload.imagens)) {
              // Garantir que a principal acompanha a 1ª imagem
              payload.imagem = payload.imagens[0] || '';
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
            <label className="text-slate-400">Imagens</label>
            <input type="file" multiple accept="image/*" onChange={(e)=>{
              const files = Array.from(e.currentTarget.files||[]) as File[];
              setEditFiles(files);
              const urls = files.map(f => URL.createObjectURL(f));
              setEditPreviews(prev => { prev.forEach(u=>URL.revokeObjectURL(u)); return urls; });
            }} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
            <div className="flex flex-wrap gap-2 mt-2">
              {(edit.imagens && edit.imagens.length ? edit.imagens : [edit.imagem]).filter(Boolean).map((src, i) => (
                <div key={`exist-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src!} alt={`atual ${i+1}`} className="w-16 h-16 object-contain rounded bg-slate-800" />
                  <button type="button" aria-label="Remover" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs"
                    onClick={() => {
                      setEdit(s => {
                        const imgs = (s.imagens && s.imagens.length ? [...s.imagens] : [s.imagem].filter(Boolean)) as string[];
                        imgs.splice(i, 1);
                        return { ...s, imagens: imgs, imagem: (imgs[0] || '') };
                      });
                    }}>🗑</button>
                </div>
              ))}
              {editPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`preview ${i+1}`} className="w-16 h-16 object-contain rounded bg-slate-800" />
                  <button type="button" aria-label="Remover" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs"
                    onClick={() => {
                      setEditFiles(fs => fs.filter((_, idx) => idx !== i));
                      setEditPreviews(prev => {
                        const url = prev[i]; try{ URL.revokeObjectURL(url); }catch{}
                        return prev.filter((_, idx) => idx !== i);
                      });
                    }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Descrição</label>
            <textarea value={edit.descricao} onChange={e=>setEdit(s=>({...s, descricao: e.target.value}))} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 min-h-24" required />
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={delOpen}
        title="Eliminar produto"
        onClose={() => !delBusy && setDelOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDelOpen(false)} disabled={delBusy}>Cancelar</button>
            <button
              className="btn bg-red-600 hover:bg-red-700"
              onClick={async ()=>{
                if (!delTarget) return;
                setDelBusy(true);
                try{
                  const r = await fetch(`/api/products/${delTarget.id}`, { method: 'DELETE' });
                  if (!r.ok) throw new Error('Falha ao remover');
                  await mutate('/api/products');
                  setNotice({ text: 'Produto removido.', kind: 'success' });
                  setTimeout(()=>setNotice(null), 2500);
                  setDelOpen(false);
                  setDelTarget(null);
                }catch(err: any){
                  setNotice({ text: err?.message || 'Erro ao remover', kind: 'error' });
                  setTimeout(()=>setNotice(null), 3000);
                }finally{ setDelBusy(false); }
              }}
              disabled={delBusy}
            >Eliminar</button>
          </>
        }
      >
        <p>
          Tem a certeza que quer eliminar o produto{' '}
          <span className="font-semibold">{delTarget?.nome}</span>? Esta ação é irreversível.
        </p>
      </Modal>
    </div>
  );
}
