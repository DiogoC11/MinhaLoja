import { NextResponse } from 'next/server';
import { genSalt, hashPassword, readUsers, writeUsers, genUserId } from '@/lib/auth';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';

export async function POST(request: Request){
  const bodyReq = await request.json();
  const name = String(bodyReq.name || '').trim();
  const email = String(bodyReq.email || '').trim().toLowerCase();
  const password = String(bodyReq.password || '');
  if (!name || !email || password.length < 6){
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  const users = await readUsers();
  if (users.some(u=>u.email === email)){
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  }
  const salt = genSalt();
  const passHash = await hashPassword(password, salt);
  const verifyToken = crypto.randomBytes(24).toString('base64url');
  const verifyTokenExpires = Date.now() + 1000 * 60 * 60 * 48; // 48h
  const user = { id: genUserId(email), name, email, passHash, salt, createdAt: Date.now(), isAdmin: false, isVerified: false, verifyToken, verifyTokenExpires };
  users.push(user);
  await writeUsers(users);
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/auth/verify?token=${verifyToken}`;
  const subject = 'Verifique o seu e-mail';
  const emailBody = `Olá ${name},\n\nClique para verificar: ${link}\n\nEste link expira em 48 horas.`;
  await sendMail(email, subject, emailBody);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, verifyLink: link, message: 'Registo criado. Verifique o seu e-mail para ativar a conta.' }, { status: 201 });
}
