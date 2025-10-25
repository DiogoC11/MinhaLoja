"use client";
import useSWR, { mutate } from 'swr';
import { useMemo, useRef, useState } from 'react';
import type { Category } from '@/lib/categories';
import type { Product } from '@/lib/fsdb';
import Modal from '@/components/Modal';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminCategoriesPage(){
  const { data } = useSWR<Category[]>('/api/categories', fetcher);
  const list = data || [];
  const { data: productsData } = useSWR<Product[]>('/api/products', fetcher);
  const products = productsData || [];
  const countByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products){
      const key = (p.categoria || '');
      m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
  }, [products]);
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Delete modal state
  const [delOpen, setDelOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  // Drag-to-scroll for categories list (mirror of products list)
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ down: false, startX: 0, startY: 0, sx: 0, sy: 0, moved: false, pid: 0, axis: '' as '' | 'x' | 'y' });
  const [dragging, setDragging] = useState(false);

  const onListPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // only left click
    // Ignore drags starting on interactive elements or table header
    const el = e.target as HTMLElement;
    if (el.closest('thead, button, a, input, select, textarea')) return;
    dragRef.current.down = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.sx = listRef.current?.scrollLeft || 0;
    dragRef.current.sy = listRef.current?.scrollTop || 0;
    dragRef.current.moved = false;
    dragRef.current.pid = e.pointerId;
    dragRef.current.axis = '';
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
  };
  const onListPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.down) return;
    const el = listRef.current; if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.axis) {
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
    }
    if (dragRef.current.axis === 'x') {
      if (!dragging) setDragging(true);
      el.scrollLeft = dragRef.current.sx - dx;
      if (Math.abs(dx) > 2) dragRef.current.moved = true;
      e.preventDefault(); // avoid text selection while dragging horizontally
    } else if (dragRef.current.axis === 'y') {
      // allow native vertical scroll
    }
  };
  const onListPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.down) return;
    dragRef.current.down = false;
    try { (e.currentTarget as any).releasePointerCapture?.(dragRef.current.pid); } catch {}
    setDragging(false);
    dragRef.current.axis = '';
    dragRef.current.moved = false; // clear so the next click works
  };

  async function createCat(){
    const n = nome.trim(); if (!n) return;
    setBusy(true);
    try{
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: n }) });
      if (!res.ok) throw new Error('Falha ao criar categoria');
      setNome('');
      await mutate('/api/categories');
      setNotice({ text: 'Categoria criada.', kind: 'success' });
      setTimeout(() => setNotice(null), 3000);
    }catch(err: any){
      setNotice({ text: err?.message || 'Erro desconhecido', kind: 'error' });
      setTimeout(() => setNotice(null), 3000);
    }finally{ setBusy(false); }
  }

  function openEdit(id: string){
    const current = list.find(c => c.id === id);
    setEditId(id);
    setEditName(current?.nome || '');
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent){
    e.preventDefault();
    if (!editId) return;
    const novo = editName.trim();
    if (!novo) { return; }
    setBusy(true);
    try{
      const res = await fetch(`/api/categories/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novo }) });
      if (!res.ok) throw new Error('Falha ao renomear categoria');
      await mutate('/api/categories');
      setEditOpen(false);
      setEditId(null);
      setNotice({ text: 'Categoria renomeada.', kind: 'success' });
    }catch(err: any){
      setNotice({ text: err?.message || 'Erro desconhecido', kind: 'error' });
      setTimeout(() => setNotice(null), 3000);
    }
    finally{ setBusy(false); }
  }

  function openDelete(id: string){
    setDelId(id);
    setDelOpen(true);
  }

  async function confirmDelete(){
    if (!delId) return;
    setBusy(true);
    try{
      const res = await fetch(`/api/categories/${delId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao apagar categoria');
      await mutate('/api/categories');
      setDelOpen(false);
      setDelId(null);
      setNotice({ text: 'Categoria apagada.', kind: 'success' });
      setTimeout(() => setNotice(null), 3000);
    }catch(err: any){
      setNotice({ text: err?.message || 'Erro desconhecido', kind: 'error' });
      setTimeout(() => setNotice(null), 3000);
    }
    finally{ setBusy(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Adicionar Categoria</h2>
      {notice && (
        <div
          className={
            `mb-3 text-sm rounded px-3 py-2 border ` +
            (notice.kind === 'success'
              ? 'text-green-200 bg-green-900/50 border-green-700'
              : 'text-red-200 bg-red-900/50 border-red-700')
          }
        >
          {notice.text}
        </div>
      )}
      <div className="card p-4 mb-4 flex flex-wrap gap-2 items-end min-w-0">
        <div className="flex-1 min-w-0">
          <label className="text-slate-400 block mb-1">Nova categoria</label>
          <input value={nome} onChange={e=>setNome(e.target.value)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 w-full max-w-full" placeholder="Ex.: Roupas" />
        </div>
        <button className="btn block sm:inline-flex w-auto max-w-full px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2 leading-tight break-words text-center sm:whitespace-nowrap" onClick={createCat} disabled={busy || !nome.trim()}>Adicionar</button>
      </div>

      <div className="card p-0 mt-4">
        <div
          ref={listRef}
          className={`overflow-hidden overflow-x-auto overflow-y-auto max-h-[60vh] rounded-t-xl ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
          onPointerDown={onListPointerDown}
          onPointerMove={onListPointerMove}
          onPointerUp={onListPointerEnd}
          onPointerCancel={onListPointerEnd}
          onPointerLeave={onListPointerEnd}
          onClickCapture={(e) => {
            if (dragRef.current.moved) {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current.moved = false;
            }
          }}
        >
        <table className="w-full">
          <thead className="sticky top-0 z-[1] text-left bg-slate-800 rounded-tl-xl">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Produtos</th>
              <th className="px-3 py-2 w-[150px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-t border-slate-700">
                <td className="px-3 py-2">{c.nome}</td>
                <td className="px-3 py-2">{countByCategory.get(c.nome) || 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-blue-400 text-slate-900 font-semibold hover:bg-blue-500 transition-colors transition-transform duration-150 ease-out hover:-translate-y-0.5"
                      title="Renomear"
                      aria-label="Renomear"
                      onClick={()=>openEdit(c.id)}
                      disabled={busy}
                    >
                      {/* Ícone lápis */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.714 0l-1.157 1.157 3.714 3.714 1.157-1.157a2.625 2.625 0 0 0 0-3.714z" />
                        <path d="M19.513 8.199 15.8 4.486 4.034 16.251a5.25 5.25 0 0 0-1.32 2.165l-.746 2.238a.75.75 0 0 0 .95.95l2.238-.746a5.25 5.25 0 0 0 2.165-1.32L19.513 8.2z" />
                      </svg>
                    </button>
                    <button
                      className="px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/60 transition-colors transition-transform duration-150 ease-out hover:-translate-y-0.5"
                      title="Apagar"
                      aria-label="Apagar"
                      onClick={()=>openDelete(c.id)}
                      disabled={busy}
                    >
                      {/* Ícone lixo */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M9 3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75V6h3a.75.75 0 0 1 0 1.5h-.443l-1.007 11.08A2.25 2.25 0 0 1 14.311 21H9.689a2.25 2.25 0 0 1-2.238-2.42L6.443 7.5H6A.75.75 0 0 1 6 6h3V3.75zM10.5 6h3V4.5h-3V6z" />
                        <path d="M10 9.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75zm4 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={3}>Sem categorias. Adicione a primeira acima.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} title="Renomear categoria" onClose={()=>setEditOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={()=>setEditOpen(false)} disabled={busy}>Cancelar</button>
            <button className="btn" form="form-edit" disabled={busy}>Guardar</button>
          </>
        }>
        <form id="form-edit" onSubmit={submitEdit} className="flex flex-col gap-2">
          <label className="text-slate-400">Novo nome</label>
          <input value={editName} onChange={e=>setEditName(e.target.value)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Ex.: Roupas" autoFocus />
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={delOpen} title="Apagar categoria" onClose={()=>setDelOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={()=>setDelOpen(false)} disabled={busy}>Cancelar</button>
            <button className="btn" onClick={confirmDelete} disabled={busy}>Apagar</button>
          </>
        }>
        <p>Tem a certeza que pretende apagar esta categoria? Esta ação não pode ser anulada.</p>
      </Modal>
    </div>
  );
}
