import { NextResponse } from 'next/server';
import { readUsers, writeUsers } from '@/lib/auth';

export async function GET(request: Request){
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!token) return NextResponse.redirect(url.origin + '/login?verified=0');
  const users = await readUsers();
  const idx = users.findIndex(u => u.verifyToken === token);
  if (idx === -1) return NextResponse.redirect(url.origin + '/login?verified=0');
  const u = users[idx];
  if (!u.verifyTokenExpires || Date.now() > u.verifyTokenExpires){
    // expirado
    users[idx] = { ...u, verifyToken: undefined, verifyTokenExpires: undefined } as any;
    await writeUsers(users);
    return NextResponse.redirect(url.origin + '/login?verified=0');
  }
  users[idx] = { ...u, isVerified: true, verifyToken: undefined, verifyTokenExpires: undefined } as any;
  await writeUsers(users);
  return NextResponse.redirect(url.origin + '/login?verified=1');
}
