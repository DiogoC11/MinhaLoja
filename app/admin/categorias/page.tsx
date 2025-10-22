"use client";
import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import type { Category } from '@/lib/categories';
import Modal from '@/components/Modal';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminCategoriesPage(){
  const { data } = useSWR<Category[]>('/api/categories', fetcher);
  const list = data || [];
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
    }catch(err: any){
      setNotice({ text: err?.message || 'Erro desconhecido', kind: 'error' });
      setTimeout(() => setNotice(null), 3000);
    }
    finally{ setBusy(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Categorias</h2>
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
      <div className="card p-4 mb-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-slate-400 block mb-1">Nova categoria</label>
          <input value={nome} onChange={e=>setNome(e.target.value)} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 w-full" placeholder="Ex.: Roupas" />
        </div>
        <button className="btn" onClick={createCat} disabled={busy || !nome.trim()}>Adicionar</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-slate-800">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2 w-[220px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-t border-slate-700">
                <td className="px-3 py-2">{c.nome}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=>openEdit(c.id)} disabled={busy}>Renomear</button>
                    <button className="btn btn-ghost" onClick={()=>openDelete(c.id)} disabled={busy}>Apagar</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={2}>Sem categorias. Adicione a primeira acima.</td></tr>
            )}
          </tbody>
        </table>
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
