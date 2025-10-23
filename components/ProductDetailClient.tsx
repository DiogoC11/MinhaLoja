"use client";
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import type { Product } from '@/lib/fsdb';
import type { Category } from '@/lib/categories';
import useSWR, { mutate } from 'swr';
import { formatPriceEUR } from '@/lib/format';
import { useCart } from '@/components/CartContext';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ProductDetailClient({ product, isAdmin }: { product: Product; isAdmin: boolean }){
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [cur, setCur] = useState<Product>({ ...product });
  const [edit, setEdit] = useState({ ...product });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(()=>{
    return () => { previews.forEach(u=>URL.revokeObjectURL(u)); };
  }, [previews]);
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const cats = catsData || [];
  const imgs = useMemo(() => (cur.imagens && cur.imagens.length ? cur.imagens : [cur.imagem]).slice(0, 10), [cur]);
  const [imgIdx, setImgIdx] = useState(0);
  const prev = () => setImgIdx(i => (i - 1 + imgs.length) % imgs.length);
  const next = () => setImgIdx(i => (i + 1) % imgs.length);

  async function submit(e: React.FormEvent){
    e.preventDefault(); if (!isAdmin) return;
    setBusy(true);
    try{
      const payload: any = { ...edit };
      if (files.length){
        const uploaded: string[] = [];
        for (const f of files){
          const up = new FormData(); up.append('file', f);
          const ur = await fetch('/api/upload', { method: 'POST', body: up });
          if (!ur.ok) throw new Error('Falha no upload da imagem');
          const uj = await ur.json(); uploaded.push(uj.path);
        }
        payload.imagens = uploaded;
        payload.imagem = uploaded[0] || payload.imagem;
      }
      const res = await fetch(`/api/products/${product.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Falha ao actualizar produto');
      await mutate('/api/products');
      // update local view
      setCur(c => ({ ...c, ...payload }));
      setOpen(false);
    }finally{ setBusy(false); }
  }

  async function confirmDelete(){
    if (!isAdmin) return;
    setBusyDelete(true);
    try{
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao eliminar produto');
      await mutate('/api/products');
      // Voltar à lista de produtos após apagar
      location.href = '/produtos';
    } finally {
      setBusyDelete(false);
      setOpenDelete(false);
    }
  }

  return (
    <div>
      <section className="hero">
        <h2 className="text-xl font-semibold mb-2">{cur.nome}</h2>
        <div className="card overflow-hidden">
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgs[imgIdx]} alt={cur.nome} className="w-full max-h-[400px] object-contain bg-slate-800" />
            {imgs.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Imagem anterior"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próxima imagem"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  {imgs.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Ir para imagem ${i + 1}`}
                      onClick={() => setImgIdx(i)}
                      className={`w-2.5 h-2.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="card-body">
            <div className="text-slate-300 mb-2">{cur.descricao}</div>
            <div className="font-bold mb-3">{formatPriceEUR(cur.preco)}</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => add(cur.id)}>Adicionar ao carrinho</button>
              <a className="btn btn-ghost" href="/produtos">Voltar</a>
              {isAdmin && (
                <>
                  <button className="btn btn-ghost" onClick={()=>{ setEdit({ ...cur }); setFiles([]); setPreviews([]); setOpen(true); }}>Editar</button>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={()=> setOpenDelete(true)}>Eliminar</button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal open={open} title="Editar produto" onClose={()=>setOpen(false)}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</button>
          <button className="btn" form="form-edit-product" disabled={busy}>Guardar</button>
        </>}>
        <form id="form-edit-product" onSubmit={submit} className="grid gap-3">
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
                {cats.map((c:any)=> <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Imagens</label>
            <input type="file" accept="image/*" multiple onChange={e=>{
              const list = Array.from(e.currentTarget.files||[]) as File[];
              setFiles(list);
              const urls = list.map(f=>URL.createObjectURL(f));
              setPreviews(prev => { prev.forEach(u=>URL.revokeObjectURL(u)); return urls; });
            }} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
            {previews.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`preview ${i+1}`} className="w-16 h-16 object-contain rounded bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {(edit.imagens && edit.imagens.length ? edit.imagens : [edit.imagem]).filter(Boolean).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src!} alt={`atual ${i+1}`} className="w-16 h-16 object-contain rounded bg-slate-800" />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Descrição</label>
            <textarea value={edit.descricao} onChange={e=>setEdit(s=>({...s, descricao: e.target.value}))} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 min-h-24" />
          </div>
        </form>
      </Modal>

      {/* Modal de confirmação de eliminação */}
      <Modal open={openDelete} title="Eliminar produto" onClose={()=>!busyDelete && setOpenDelete(false)}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setOpenDelete(false)} disabled={busyDelete}>Cancelar</button>
          <button className="btn bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={busyDelete}>Eliminar</button>
        </>}>
        <p>Tem a certeza que quer eliminar o produto <span className="font-semibold">{cur.nome}</span>? Esta ação é irreversível.</p>
      </Modal>
    </div>
  );
}
