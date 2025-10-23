import { NextResponse } from 'next/server';
import { readUsers, writeUsers } from '@/lib/auth';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';

export async function POST(request: Request){
  const { email: rawEmail } = await request.json().catch(()=>({ email: '' }));
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: true }); // não revelar existência
  const users = await readUsers();
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return NextResponse.json({ ok: true });
  const u = users[idx];
  if (u.isVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  const verifyToken = crypto.randomBytes(24).toString('base64url');
  const verifyTokenExpires = Date.now() + 1000 * 60 * 60 * 48; // 48h
  users[idx] = { ...u, verifyToken, verifyTokenExpires } as any;
  await writeUsers(users);
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/auth/verify?token=${verifyToken}`;
  const subject = 'Verifique o seu e-mail (novo link)';
  const body = `Olá,\n\nSegue um novo link de verificação: ${link}\n\nEste link expira em 48 horas.`;
  await sendMail(email, subject, body);
  return NextResponse.json({ ok: true, verifyLink: link });
}
