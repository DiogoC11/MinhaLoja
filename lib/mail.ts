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

/**
 * Try to send an email via SMTP if environment variables are configured.
 * Falls back to writing into data/_outbox/emails.json in development.
 */
export async function sendMail(to: string, subject: string, body: string){
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user || 'no-reply@example.com';
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE) : (port === 465);

  if (host && user && pass){
    try{
  // Use dynamic require to avoid type/deps at build time if not configured
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      await transporter.sendMail({ from, to, subject, text: body });
      return { ok: true, transport: 'smtp' } as const;
    }catch(err){
      // Fallback to outbox on any error
      await queueEmail(to, subject, body);
      return { ok: true, transport: 'outbox', error: String(err) } as const;
    }
  }
  await queueEmail(to, subject, body);
  return { ok: true, transport: 'outbox' } as const;
}
