import { promises as fs } from 'fs';
import path from 'path';

export type OrderItem = { productId: string; qty: number; price: number };
export type Order = { id: string; createdAt: number; items: OrderItem[]; total: number };

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'orders.json');

async function ensureDir(){ await fs.mkdir(DATA_DIR, { recursive: true }); }

export async function readOrders(): Promise<Order[]>{
  await ensureDir();
  try{
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr as Order[] : [];
  }catch(err: any){ if (err.code === 'ENOENT') return []; throw err; }
}

export async function writeOrders(list: Order[]){
  await ensureDir();
  const tmp = FILE_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, FILE_PATH);
}
