"use client";
import { useState } from 'react';
import Modal from '@/components/Modal';
import type { Product } from '@/components/ProductCard';
import type { Category } from '@/lib/categories';
import useSWR, { mutate } from 'swr';
import { formatPriceEUR } from '@/lib/format';
import { useCart } from '@/components/CartContext';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ProductDetailClient({ product, isAdmin }: { product: Product; isAdmin: boolean }){
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState<Product>({ ...product });
  const [edit, setEdit] = useState({ ...product });
  const [file, setFile] = useState<File | null>(null);
  const { data: catsData } = useSWR<Category[]>('/api/categories', fetcher);
  const cats = catsData || [];

  async function submit(e: React.FormEvent){
    e.preventDefault(); if (!isAdmin) return;
    setBusy(true);
    try{
      const payload: any = { ...edit };
      if (file && file.size){
        const up = new FormData(); up.append('file', file);
        const ur = await fetch('/api/upload', { method: 'POST', body: up });
        if (!ur.ok) throw new Error('Falha no upload da imagem');
        const uj = await ur.json();
        payload.imagem = uj.path;
      }
      const res = await fetch(`/api/products/${product.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Falha ao actualizar produto');
      await mutate('/api/products');
      // update local view
      setCur(c => ({ ...c, ...payload }));
      setOpen(false);
    }finally{ setBusy(false); }
  }

  return (
    <div>
      <section className="hero">
        <h2 className="text-xl font-semibold mb-2">{cur.nome}</h2>
        <div className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.imagem} alt={cur.nome} className="w-full max-h-[400px] object-contain bg-slate-800" />
          <div className="card-body">
            <div className="text-slate-300 mb-2">{cur.descricao}</div>
            <div className="font-bold mb-3">{formatPriceEUR(cur.preco)}</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => add(cur.id)}>Adicionar ao carrinho</button>
              <a className="btn btn-ghost" href="/produtos">Voltar</a>
              {isAdmin && <button className="btn btn-ghost" onClick={()=>{ setEdit({ ...cur }); setFile(null); setOpen(true); }}>Editar</button>}
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
            <label className="text-slate-400">Imagem</label>
            <input type="file" accept="image/*" onChange={e=>setFile(e.currentTarget.files?.[0] || null)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
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
