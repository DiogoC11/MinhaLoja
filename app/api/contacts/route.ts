import { NextResponse } from 'next/server';
import { readContacts, writeContacts, type Contacts } from '@/lib/contacts';
import { requireAuth } from '@/lib/auth';

export async function GET(){
  const c = await readContacts();
  return NextResponse.json(c);
}

export async function PUT(request: Request){
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const current = await readContacts();
  const updated: Contacts = {
    email: body.email != null ? String(body.email) : current.email,
    instagram: body.instagram != null ? String(body.instagram) : current.instagram,
    facebook: body.facebook != null ? String(body.facebook) : current.facebook,
    telefone: body.telefone != null ? String(body.telefone) : current.telefone,
    updatedAt: Date.now(),
  };
  await writeContacts(updated);
  return NextResponse.json(updated);
}
