// আল-লিসানুল মুবীন — LMS-এর সাধারণ কোড (সব পাতা ব্যবহার করে)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const S = window.SITE || {};
export const sb = createClient(S.supabase.url, S.supabase.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------- ছোট সহায়ক ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const bn = (s) => String(s ?? '').replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => (n || n === 0) ? '৳ ' + bn(Number(n).toLocaleString('en-US')) : '';
export const qs = (k) => new URLSearchParams(location.search).get(k);
export const fmtDate = (d) => d ? bn(new Date(d).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })) : '';
export const fmtSize = (b) => !b ? '' : b < 1024 * 1024 ? bn(Math.round(b / 1024)) + ' KB' : bn((b / 1048576).toFixed(1)) + ' MB';

// YouTube লিংক থেকে ভিডিও-আইডি
export function youtubeId(input) {
  const s = String(input || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
    const m = u.pathname.match(/\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch { /* not a URL */ }
  return null;
}
export function youtubeEmbed(id) {
  return `<div class="lx-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0&modestbranding=1" title="ভিডিও দরস" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}

// অ্যাডমিনের লেখা HTML মূল পাতায় দেখানোর আগে স্ক্রিপ্ট ও ইভেন্ট সরিয়ে দেয়
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    });
  });
  return doc.body.firstChild.innerHTML;
}

// ছোট বার্তা
export function toast(msg, kind = 'ok') {
  let box = $('#lx-toast');
  if (!box) { box = document.createElement('div'); box.id = 'lx-toast'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  box.textContent = msg; box.className = 'lx-toast is-' + kind + ' is-on';
  clearTimeout(box._t); box._t = setTimeout(() => box.classList.remove('is-on'), 3600);
}

// সার্ভারের ইংরেজি ভুল-বার্তাকে বাংলায়
export function trErr(e) {
  const m = String(e?.message || e || '');
  const map = {
    'Invalid login credentials': 'ইমেইল বা পাসওয়ার্ড ভুল।',
    'Email not confirmed': 'ইমেইল এখনো নিশ্চিত করা হয়নি — ইনবক্সে পাঠানো লিংকে ক্লিক করুন।',
    'User already registered': 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে — প্রবেশ করুন।',
    'not signed in': 'আগে প্রবেশ করুন।',
    'lesson not available': 'এই দরসটি এখনো আপনার জন্য খোলা নয়।',
    'course not open': 'এই কোর্সে এখন ভর্তি চলছে না।',
    'course not complete': 'কোর্সের সব দরস এখনো শেষ হয়নি।',
    'not enrolled': 'আপনি এই কোর্সে ভর্তি নন।',
  };
  for (const k in map) if (m.includes(k)) return map[k];
  if (/Password should be at least/i.test(m)) return 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।';
  if (/rate limit/i.test(m)) return 'অল্প সময়ে অনেকবার চেষ্টা হয়েছে — একটু পরে আবার চেষ্টা করুন।';
  return m || 'কিছু একটা সমস্যা হয়েছে।';
}

// ---------- অ্যাকাউন্ট ----------
export async function getSession() { return (await sb.auth.getSession()).data.session; }
export async function getProfile() {
  const s = await getSession(); if (!s) return null;
  const { data } = await sb.from('profiles').select('id,full_name,email,is_admin').eq('id', s.user.id).maybeSingle();
  return data || { id: s.user.id, email: s.user.email, full_name: s.user.user_metadata?.full_name, is_admin: false };
}

// হেডারে প্রবেশ/অ্যাকাউন্ট বোতাম
export async function paintHeader() {
  const slot = $('[data-auth-slot]'); if (!slot) return;
  const p = await getProfile();
  if (!p) { slot.innerHTML = '<a class="mb-btn mb-btn--outline" href="/learn">প্রবেশ</a>'; return; }
  slot.innerHTML = (p.is_admin ? '<a class="mb-nav__login" href="/admin">ড্যাশবোর্ড</a>' : '') +
    '<a class="mb-btn mb-btn--outline" href="/learn">আমার কোর্স</a>';
}

// সুরক্ষিত ফাইলের ক্ষণস্থায়ী লিংক
export async function fileUrl(path, download = true) {
  const { data, error } = await sb.storage.from('lms-files').createSignedUrl(path, 60 * 30, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
export function publicUrl(path) { return sb.storage.from('lms-public').getPublicUrl(path).data.publicUrl; }

// কোর্সের ছবি না থাকলে আরবি হরফের পোস্টার
export function posterHTML(c, cls = '') {
  if (c.poster_url) return `<img class="${cls}" src="${esc(c.poster_url)}" alt="" loading="lazy">`;
  return `<span lang="ar" dir="rtl">${esc(c.slug === 'nahwer-sohoj-path' ? 'النَّحْو' : c.slug === 'sarfer-sohoj-path' ? 'الصَّرْف' : 'أ ب ت')}</span>`;
}

// পুরো পাতার ছোট মেনু (মোবাইল)
export function wireNav() {
  const btn = $('.mb-nav-toggle'), nav = $('#mb-nav');
  if (btn && nav) btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true'); nav.classList.toggle('is-open', !open);
  });
}
