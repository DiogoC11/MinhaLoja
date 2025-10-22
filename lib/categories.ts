import { promises as fs } from 'fs';
import path from 'path';

export type Category = {
  id: string;
  nome: string;
  createdAt: number;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'categories.json');

async function ensureDir(){ await fs.mkdir(DATA_DIR, { recursive: true }); }

export async function readCategories(): Promise<Category[]>{
  await ensureDir();
  try{
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr as Category[] : [];
  }catch(err: any){ if (err.code === 'ENOENT') return []; throw err; }
}

export async function writeCategories(list: Category[]){
  await ensureDir();
  const tmp = FILE_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, FILE_PATH);
}

export function genCategoryId(nome: string){
  const base = (nome||'categoria')
    .toLowerCase()
    .normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g,'-')
    .replace(/[^a-z0-9-]/g,'')
    .replace(/(^-|-$)/g,'');
  const rand = Math.random().toString(36).slice(2,8);
  return `cat-${base||'item'}-${rand}`;
}

export async function getCategory(id: string){
  const list = await readCategories();
  return list.find(c=>c.id===id) || null;
}
