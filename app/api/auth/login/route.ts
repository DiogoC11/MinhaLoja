import { NextResponse } from 'next/server';
import { hashPassword, readUsers, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request){
  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const users = await readUsers();
  const user = users.find(u=>u.email===email);
  if (!user) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passHash) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email });
  setSessionCookie(res, user.id);
  return res;
}
