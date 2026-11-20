// আরবি ভাষার হাতেখড়ি: পাসওয়ার্ড যাচাই করে কুকি দেয় (কুকি শুধু /hatekhori-এর জন্য)
import { COOKIE, PATH, MAX_AGE, tokenFor, safeEqual, configured } from '../../lib/hatekhori-auth.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  const chunks = []; for await (const c of req) chunks.push(c);
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 303; res.setHeader('location', PATH + '/'); return res.end(); }
  const env = process.env;
  if (!configured(env)) { res.statusCode = 503; res.setHeader('content-type', 'text/plain; charset=utf-8'); return res.end('কোর্সটি এখনো চালু হয়নি।'); }

  const body = await readBody(req);
  const given = String(body.password || '');
  // দুই দিকেরই HMAC নিয়ে তুলনা — দৈর্ঘ্য সমান থাকে, সময়-নিরপেক্ষ
  const [a, b] = await Promise.all([tokenFor(given, env.COOKIE_SECRET), tokenFor(env.HATEKHORI_PASSWORD, env.COOKIE_SECRET)]);
  if (!safeEqual(a, b)) {
    await new Promise(r => setTimeout(r, 400)); // বারবার চেষ্টাকে একটু ধীর করা
    res.statusCode = 303; res.setHeader('location', PATH + '/?e=1'); return res.end();
  }
  res.setHeader('set-cookie', `${COOKIE}=${b}; Path=${PATH}; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  res.statusCode = 303; res.setHeader('location', PATH + '/'); res.end();
}
