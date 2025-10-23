import { promises as fs } from 'fs';
import path from 'path';

export type Contacts = {
  email: string;
  instagram: string;
  facebook: string;
  telefone: string;
  updatedAt: number;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'contacts.json');

async function ensureDir(){ await fs.mkdir(DATA_DIR, { recursive: true }); }

export async function readContacts(): Promise<Contacts>{
  await ensureDir();
  try{
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const obj = JSON.parse(raw);
    return {
      email: String(obj.email||''),
      instagram: String(obj.instagram||''),
      facebook: String(obj.facebook||''),
      telefone: String(obj.telefone||''),
      updatedAt: Number(obj.updatedAt||0),
    };
  }catch(err: any){ if (err.code === 'ENOENT') return { email:'', instagram:'', facebook:'', telefone:'', updatedAt: 0 }; throw err; }
}

export async function writeContacts(c: Contacts){
  await ensureDir();
  const tmp = FILE_PATH + '.tmp';
  const data = JSON.stringify(c, null, 2);
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, FILE_PATH);
}
