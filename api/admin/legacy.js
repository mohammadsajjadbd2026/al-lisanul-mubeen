// পুরোনো কোর্সের দরসগুলো (JSON) শুধু অ্যাডমিনকে দেয় — আমদানির জন্য।
// ব্যবহারকারীর নিজের Supabase টোকেন দিয়ে যাচাই: profiles.is_admin = true হতে হবে।
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ALLOWED = new Set(['hatekhori', 'nahw']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const key = String(req.query.course || '');
  if (!ALLOWED.has(key)) return res.status(400).send('unknown course');
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).send('sign in required');

  const cfg = JSON.parse(await readFile(path.join(root, 'courses', 'nahw', 'config.json'), 'utf8'));
  const h = { apikey: cfg.supabase_anon_key, Authorization: auth };
  const u = await fetch(`${cfg.supabase_url}/auth/v1/user`, { headers: h });
  if (!u.ok) return res.status(401).send('sign in required');
  const { id } = await u.json();
  const p = await fetch(`${cfg.supabase_url}/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(id)}`, { headers: h });
  const rows = p.ok ? await p.json() : [];
  if (!rows[0] || rows[0].is_admin !== true) return res.status(403).send('admin only');

  const json = await readFile(path.join(root, 'courses', 'legacy', `${key}.json`), 'utf8');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(json);
}
