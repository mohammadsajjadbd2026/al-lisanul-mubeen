// Serves one lesson's HTML only to a signed-in, approved student whose previous lesson is passed (>= 70%).
// Uses the student's own Supabase token: Row Level Security limits every query to that student's rows,
// so no secret key is stored on Vercel.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PASS = 70;
const root = process.cwd();
let cfgCache = null;
async function cfg() {
  if (!cfgCache) cfgCache = JSON.parse(await readFile(path.join(root, 'courses', 'nahw', 'config.json'), 'utf8'));
  return cfgCache;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const id = String(req.query.id || '');
  if (!/^c\d+d\d+$/.test(id)) return res.status(400).send('bad lesson id');
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).send('sign in required');

  const { supabase_url: url, supabase_anon_key: anon } = await cfg();
  const h = { apikey: anon, Authorization: auth };
  const get = (p) => fetch(`${url}/rest/v1/${p}`, { headers: h });

  const user = await fetch(`${url}/auth/v1/user`, { headers: h });
  if (!user.ok) return res.status(401).send('sign in required');
  const { id: uid } = await user.json();

  const [pr, lr, gr] = await Promise.all([
    get(`profiles?select=approved,is_admin&id=eq.${uid}`),
    get('lessons?select=id,ord&order=ord'),
    get('progress?select=lesson_id,best_score'),
  ]);
  if (!pr.ok || !lr.ok || !gr.ok) return res.status(502).send('database error');
  const profile = (await pr.json())[0];
  if (!profile || !(profile.approved || profile.is_admin)) return res.status(403).send('pending approval');

  if (!profile.is_admin) {
    const order = (await lr.json()).map((r) => r.id);
    const i = order.indexOf(id);
    if (i < 0) return res.status(404).send('no such lesson');
    if (i > 0) {
      const best = Object.fromEntries((await gr.json()).map((r) => [r.lesson_id, r.best_score]));
      if ((best[order[i - 1]] || 0) < PASS) return res.status(423).send('locked');
    }
  }

  try {
    const html = await readFile(path.join(root, 'courses', 'nahw', 'lessons', `${id}.html`), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch {
    return res.status(404).send('no such lesson');
  }
}
