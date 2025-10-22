import { NextResponse } from 'next/server';
import { genSalt, hashPassword, readUsers, writeUsers, genUserId, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request){
  const body = await request.json();
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!name || !email || password.length < 6){
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  const users = await readUsers();
  if (users.some(u=>u.email === email)){
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  }
  const salt = genSalt();
  const passHash = await hashPassword(password, salt);
  const user = { id: genUserId(email), name, email, passHash, salt, createdAt: Date.now() };
  users.push(user);
  await writeUsers(users);
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  setSessionCookie(res, user.id);
  return res;
}
