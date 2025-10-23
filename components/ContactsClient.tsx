"use client";
import { useState } from 'react';
import Modal from '@/components/Modal';
import type { Contacts } from '@/lib/contacts';

export default function ContactsClient({ contacts, isAdmin }: { contacts: Contacts; isAdmin: boolean }){
  const [cur, setCur] = useState<Contacts>({ ...contacts });
  const [edit, setEdit] = useState({ ...contacts });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(e: React.FormEvent){
    e.preventDefault(); if (!isAdmin) return;
    setBusy(true);
    try{
      const res = await fetch('/api/contacts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
      if (!res.ok) throw new Error('Falha ao guardar contactos');
      const c = await res.json();
      setCur(c);
      setOpen(false);
      setNotice('Guardado com sucesso.');
      setTimeout(()=> setNotice(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold mb-2">Contactos</h2>
        <div className="grid gap-2">
          <div><span className="muted">Email:</span> {cur.email || <span className="muted">—</span>}</div>
          <div><span className="muted">Instagram:</span> {cur.instagram ? <a className="text-blue-400 underline" href={cur.instagram} target="_blank" rel="noreferrer">{cur.instagram}</a> : <span className="muted">—</span>}</div>
          <div><span className="muted">Facebook:</span> {cur.facebook ? <a className="text-blue-400 underline" href={cur.facebook} target="_blank" rel="noreferrer">{cur.facebook}</a> : <span className="muted">—</span>}</div>
          <div><span className="muted">Telefone:</span> {cur.telefone || <span className="muted">—</span>}</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <a className="btn btn-ghost" href="/">Voltar</a>
          {isAdmin && <button className="btn" onClick={()=>{ setEdit({...cur}); setOpen(true); }}>Editar</button>}
        </div>
        {notice && <div className="mt-2 text-green-400 text-sm">{notice}</div>}
      </div>

      <Modal open={open} title="Editar contactos" onClose={()=> setOpen(false)}
        footer={<>
          <button className="btn btn-ghost" onClick={()=> setOpen(false)} disabled={busy}>Cancelar</button>
          <button className="btn" form="form-edit-contacts" disabled={busy}>Guardar</button>
        </>}>
        <form id="form-edit-contacts" onSubmit={save} className="grid gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Email</label>
            <input value={edit.email} onChange={e=>setEdit(s=>({...s, email: e.target.value}))} type="email" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Instagram</label>
            <input value={edit.instagram} onChange={e=>setEdit(s=>({...s, instagram: e.target.value}))} placeholder="https://instagram.com/..." className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Facebook</label>
            <input value={edit.facebook} onChange={e=>setEdit(s=>({...s, facebook: e.target.value}))} placeholder="https://facebook.com/..." className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-400">Telefone</label>
            <input value={edit.telefone} onChange={e=>setEdit(s=>({...s, telefone: e.target.value}))} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
