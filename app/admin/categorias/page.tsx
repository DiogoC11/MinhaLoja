"use client";
import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import type { Category } from '@/lib/categories';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminCategoriesPage(){
  const { data } = useSWR<Category[]>('/api/categories', fetcher);
  const list = data || [];
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);

  async function createCat(){
    const n = nome.trim(); if (!n) return;
    setBusy(true);
    try{
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: n }) });
      if (!res.ok) throw new Error('Falha ao criar categoria');
      setNome('');
      await mutate('/api/categories');
      alert('Categoria criada.');
    }catch(err: any){
      alert(err.message || 'Erro desconhecido');
    }finally{ setBusy(false); }
  }

  async function updateCat(id: string){
    const current = list.find(c => c.id === id);
    const novo = prompt('Novo nome da categoria:', current?.nome || '');
    if (!novo || novo.trim() === current?.nome) return;
    setBusy(true);
    try{
      const res = await fetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novo.trim() }) });
      if (!res.ok) throw new Error('Falha ao renomear categoria');
      await mutate('/api/categories');
    }catch(err: any){ alert(err.message || 'Erro desconhecido'); }
    finally{ setBusy(false); }
  }

  async function deleteCat(id: string){
    if (!confirm('Tem a certeza que pretende apagar esta categoria?')) return;
    setBusy(true);
    try{
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao apagar categoria');
      await mutate('/api/categories');
    }catch(err: any){ alert(err.message || 'Erro desconhecido'); }
    finally{ setBusy(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Categorias</h2>
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
                    <button className="btn" onClick={()=>updateCat(c.id)} disabled={busy}>Renomear</button>
                    <button className="btn btn-ghost" onClick={()=>deleteCat(c.id)} disabled={busy}>Apagar</button>
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
    </div>
  );
}
