import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureDir(){ await fs.mkdir(UPLOAD_DIR, { recursive: true }); }

function safeExt(filename: string, contentType?: string){
  const extFromName = path.extname(filename || '').toLowerCase();
  if (extFromName) return extFromName;
  if (!contentType) return '.bin';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/webp') return '.webp';
  return '.bin';
}

function genName(base = 'file'){
  const rand = Math.random().toString(36).slice(2,10);
  return `${base}-${Date.now()}-${rand}`;
}

export async function POST(request: Request){
  try{
    await ensureDir();
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Ficheiro não enviado' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Ficheiro demasiado grande (máx 5MB)' }, { status: 413 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = safeExt(file.name, file.type);
    const name = genName('img') + ext;
    const abs = path.join(UPLOAD_DIR, name);
    await fs.writeFile(abs, buffer);
    const urlPath = '/uploads/' + name;
    return NextResponse.json({ path: urlPath }, { status: 201 });
  }catch(err: any){
    return NextResponse.json({ error: err?.message || 'Erro no upload' }, { status: 500 });
  }
}
