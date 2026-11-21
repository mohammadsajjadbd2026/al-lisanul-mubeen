// Serves a paid course's HTML only to a signed-in student whose enrollment for that course is "approved"
// (or to an admin). Uses the student's own Supabase token: Row Level Security limits every query to that
// student's rows, so no secret key is stored on Vercel.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const FILES = { hatekhori: 'courses/hatekhori/content.html' };
const root = process.cwd();
let cfgCache = null;
async function cfg() {
  if (!cfgCache) cfgCache = JSON.parse(await readFile(path.join(root, 'courses', 'nahw', 'config.json'), 'utf8'));
  return cfgCache;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const course = String(req.query.c || '');
  if (!Object.hasOwn(FILES, course)) return res.status(404).send('no such course');
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).send('sign in required');

  const { supabase_url: url, supabase_anon_key: anon } = await cfg();
  const h = { apikey: anon, Authorization: auth };
  const user = await fetch(`${url}/auth/v1/user`, { headers: h });
  if (!user.ok) return res.status(401).send('sign in required');
  const { id: uid } = await user.json();

  const [er, pr] = await Promise.all([
    fetch(`${url}/rest/v1/enrollments?select=status&user_id=eq.${uid}&course=eq.${course}`, { headers: h }),
    fetch(`${url}/rest/v1/profiles?select=is_admin&id=eq.${uid}`, { headers: h }),
  ]);
  if (!er.ok || !pr.ok) return res.status(502).send('database error');
  const enrolled = (await er.json())[0];
  const profile = (await pr.json())[0];
  if (!(profile && profile.is_admin) && !(enrolled && enrolled.status === 'approved')) return res.status(403).send('not approved');

  try {
    const html = await readFile(path.join(root, FILES[course]), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch {
    return res.status(404).send('no such course');
  }
}
