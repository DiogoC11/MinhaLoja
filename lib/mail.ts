import { promises as fs } from 'fs';
import path from 'path';

const OUTBOX_DIR = path.join(process.cwd(), 'data', '_outbox');
const OUTBOX_FILE = path.join(OUTBOX_DIR, 'emails.json');

async function ensureOutbox(){ await fs.mkdir(OUTBOX_DIR, { recursive: true }); }

export async function queueEmail(to: string, subject: string, body: string){
  await ensureOutbox();
  let list: any[] = [];
  try{
    const raw = await fs.readFile(OUTBOX_FILE, 'utf8');
    list = JSON.parse(raw);
    if (!Array.isArray(list)) list = [];
  }catch{}
  const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), to, subject, body, createdAt: Date.now() };
  list.push(item);
  await fs.writeFile(OUTBOX_FILE, JSON.stringify(list, null, 2), 'utf8');
  return item;
}
