"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Chaves do storage
const USERS_KEY = 'minha-loja:users';
const SESSION_KEY = 'minha-loja:session';

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}
function saveUsers(arr: any[]){ localStorage.setItem(USERS_KEY, JSON.stringify(arr)); }
function setSession(userId: string){ localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function currentSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }

function genUserId(email: string){
  return 'u-' + (email||'').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Math.random().toString(36).slice(2,8);
}
function genSalt(len=16){
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function sha256Base64(str: string){
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let bin = '';
  for (let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function hashPassword(password: string, salt: string){
  return sha256Base64(salt + ':' + password);
}

export default function LoginPage(){
  const router = useRouter();
  const [tab, setTab] = useState<'login'|'register'>('login');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r=>r.json()).then(({ user })=> setUser(user||null)).catch(()=>setUser(null));
  }, []);

  async function onLogin(form: HTMLFormElement){
    const fd = new FormData(form);
    const email = String(fd.get('email')||'').trim();
    const password = String(fd.get('password')||'');
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error((await res.json()).error || 'Falha ao entrar');
    const { id, name, email: em } = await res.json();
    setUser({ id, name, email: em });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:changed'));
    router.push('/');
  }

  async function onRegister(form: HTMLFormElement){
    const fd = new FormData(form);
    const name = String(fd.get('name')||'').trim();
    const email = String(fd.get('email')||'').trim();
    const password = String(fd.get('password')||'');
    const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password }) });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Falha ao criar conta');
    // Não autenticar automaticamente; instruir o utilizador a verificar o e-mail
    alert('Registo criado. Enviámos um e-mail de verificação. Por favor, verifique a sua caixa de correio para ativar a conta.');
    setTab('login');
  }

  async function onLogout(){
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:changed'));
  }

  if (user){
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div>
          <div className="toolbar">
            <h2 className="m-0">Minha conta</h2>
          </div>
          <div className="card p-6 max-w-md">
            <p>Autenticado como <strong>{user.name || user.email}</strong>.</p>
            <div className="flex gap-2 mt-4">
              <button className="btn" onClick={onLogout}>Sair</button>
              <Link href="/" className="btn btn-ghost">Voltar à Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-md">
        <div className="mb-4 flex rounded-xl p-1 bg-slate-800 border border-slate-700/60">
          <button className={`flex-1 py-2 rounded-lg ${tab==='login' ? 'bg-blue-500 text-slate-900 font-semibold' : 'text-slate-300 hover:text-white'}`} onClick={()=>setTab('login')}>Entrar</button>
          <button className={`flex-1 py-2 rounded-lg ${tab==='register' ? 'bg-blue-500 text-slate-900 font-semibold' : 'text-slate-300 hover:text-white'}`} onClick={()=>setTab('register')}>Criar conta</button>
        </div>

        {tab==='login' ? (
          <form className="card p-6 backdrop-blur bg-slate-900/60 border border-slate-700/70 shadow-xl" onSubmit={async (e)=>{
            e.preventDefault();
            try{ setLoading(true); await onLogin(e.currentTarget); } catch(err:any){ alert(err.message||'Falha ao entrar'); } finally{ setLoading(false); }
          }}>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-slate-300">E-mail</span>
                <input name="email" type="email" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="voce@exemplo.com" required />
              </label>
              <label className="grid gap-1 relative">
                <span className="text-slate-300">Palavra-passe</span>
                <input name="password" type={showPass?'text':'password'} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 pr-10" required />
                <button type="button" className="absolute right-2 bottom-2 text-slate-400 hover:text-white text-sm" onClick={()=>setShowPass(p=>!p)}>{showPass?'Ocultar':'Mostrar'}</button>
              </label>
              <div className="mt-2">
                <button className="btn w-full" type="submit" disabled={loading}>{loading? 'Entrando…' : 'Entrar'}</button>
              </div>
            </div>
          </form>
        ) : (
          <form className="card p-6 backdrop-blur bg-slate-900/60 border border-slate-700/70 shadow-xl" onSubmit={async (e)=>{
            e.preventDefault();
            try{ setLoading(true); await onRegister(e.currentTarget); } catch(err:any){ alert(err.message||'Falha ao criar conta'); } finally{ setLoading(false); }
          }}>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-slate-300">Nome</span>
                <input name="name" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="Seu nome" required />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-300">E-mail</span>
                <input name="email" type="email" className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2" placeholder="voce@exemplo.com" required />
              </label>
              <label className="grid gap-1 relative">
                <span className="text-slate-300">Palavra-passe</span>
                <input name="password" minLength={6} type={showPass?'text':'password'} className="border border-slate-600 rounded-md bg-slate-900 px-3 py-2 pr-10" required />
                <button type="button" className="absolute right-2 bottom-2 text-slate-400 hover:text-white text-sm" onClick={()=>setShowPass(p=>!p)}>{showPass?'Ocultar':'Mostrar'}</button>
              </label>
              <div className="mt-2">
                <button className="btn w-full" type="submit" disabled={loading}>{loading? 'Criando…' : 'Criar conta'}</button>
              </div>
            </div>
          </form>
        )}

        <p className="text-center text-slate-400 text-sm mt-4">Após criar conta, verifique o seu e‑mail para poder entrar.</p>
      </div>
    </div>
  );
}
