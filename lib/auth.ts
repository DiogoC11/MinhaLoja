import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type User = {
  id: string;
  name: string;
  email: string;
  passHash: string; // scrypt hash base64
  salt: string;     // base64
  createdAt: number;
  isAdmin?: boolean; // optional admin flag
  isVerified?: boolean; // email verificado
  verifyToken?: string; // token de verificação pendente
  verifyTokenExpires?: number; // epoch ms
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'users.json');
const SESSION_COOKIE = 'session';
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

async function ensureDir(){ await fs.mkdir(DATA_DIR, { recursive: true }); }

export async function readUsers(): Promise<User[]>{
  await ensureDir();
  try{
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr as User[] : [];
  }catch(err: any){ if (err.code === 'ENOENT') return []; throw err; }
}

export async function writeUsers(list: User[]){
  await ensureDir();
  const tmp = FILE_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, FILE_PATH);
}

export function genUserId(email: string){
  const base = (email||'user').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const rand = Math.random().toString(36).slice(2,8);
  return `u-${base}-${rand}`;
}

export function genSalt(len=16){
  return crypto.randomBytes(len).toString('base64');
}

export async function hashPassword(password: string, salt: string){
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('base64'));
    });
  });
}

function hmacSign(payload: string){
  return crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

export function createSessionValue(userId: string){
  const data = { userId, ts: Date.now() };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = hmacSign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionValue(value: string): { userId: string } | null {
  const [payload, sig] = value.split('.') as [string,string];
  if (!payload || !sig) return null;
  const expected = hmacSign(payload);
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data && typeof data.userId === 'string') return { userId: data.userId };
    return null;
  } catch { return null; }
}

export async function getAuthUserFromCookies(){
  const c = cookies();
  const value = c.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const v = verifySessionValue(value);
  if (!v) return null;
  const users = await readUsers();
  return users.find(u=>u.id===v.userId) || null;
}

export function setSessionCookie(res: NextResponse, userId: string){
  const val = createSessionValue(userId);
  res.cookies.set(SESSION_COOKIE, val, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie(res: NextResponse){
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function requireAuth(request: Request){
  // This helper can be used inside route handlers if needed
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='));
  if (!match) return null;
  const value = match.split('=')[1];
  const v = verifySessionValue(value);
  if (!v) return null;
  const users = await readUsers();
  return users.find(u=>u.id===v.userId) || null;
}
