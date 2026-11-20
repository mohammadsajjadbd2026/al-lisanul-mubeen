// পাসওয়ার্ড-পাহারার সাধারণ কোড (মিডলওয়্যার ও api দুটোই ব্যবহার করে)
export const COOKIE = 'hk_auth';
export const PATH = '/hatekhori';
export const MAX_AGE = 60 * 60 * 24 * 30; // ৩০ দিন

const enc = new TextEncoder();
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// কুকির মান = পাসওয়ার্ডের HMAC; পাসওয়ার্ড বদলালে পুরোনো কুকি আপনাআপনি বাতিল
export function tokenFor(password, secret) { return hmacHex(secret, 'hatekhori-v1:' + password); }

// সময়-নিরপেক্ষ তুলনা
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}
export function configured(env) {
  return Boolean(env.HATEKHORI_PASSWORD && env.COOKIE_SECRET && env.COOKIE_SECRET.length >= 32);
}
export function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
