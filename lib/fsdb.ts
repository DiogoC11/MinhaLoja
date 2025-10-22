import { promises as fs } from 'fs';
import path from 'path';

export type Product = {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  imagem: string;
  categoria: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'products.json');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readProducts(): Promise<Product[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as Product[];
    return [];
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function writeProducts(list: Product[]) {
  await ensureDir();
  const tmp = FILE_PATH + '.tmp';
  const data = JSON.stringify(list, null, 2);
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, FILE_PATH);
}

export function genId(nome = 'item') {
  const base = (nome || 'item')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

export async function getProduct(id: string) {
  const list = await readProducts();
  return list.find(p => p.id === id) || null;
}
