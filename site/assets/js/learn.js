// শিক্ষার্থীর পাতা: প্রবেশ / নিবন্ধন / পাসওয়ার্ড / আমার কোর্স
import { sb, $, $$, esc, bn, toast, trErr, getProfile, paintHeader, posterHTML, wireNav, qs } from './lms.js';

const app = $('#lx-app');
wireNav();
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = bn(new Date().getFullYear())));

let recovery = location.hash.includes('type=recovery');
sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; render(); } });

function next() { const n = qs('next'); return n && n.startsWith('/') && !n.startsWith('//') ? n : null; }

async function render() {
  paintHeader();
  if (recovery) return renderNewPassword();
  const profile = await getProfile();
  if (!profile) return renderAuth();
  if (next()) { location.replace(next()); return; }
  renderDashboard(profile);
}

// ---------- প্রবেশ / নিবন্ধন ----------
function renderAuth(tab = 'in') {
  app.innerHTML = `
  <div class="lx-narrow">
    <h1 class="lx-h1 lx-center">শিক্ষার্থী প্রবেশ</h1>
    <p class="lx-sub lx-center">একটি অ্যাকাউন্টেই সব কোর্স — ভর্তির পর এখান থেকেই শিখবেন।</p>
    <div class="lx-tabs" role="tablist">
      <button role="tab" data-tab="in" aria-selected="${tab === 'in'}">প্রবেশ</button>
      <button role="tab" data-tab="up" aria-selected="${tab === 'up'}">নতুন অ্যাকাউন্ট</button>
      <button role="tab" data-tab="reset" aria-selected="${tab === 'reset'}">পাসওয়ার্ড ভুলে গেছি</button>
    </div>
    <div class="lx-card">${tab === 'in' ? formIn() : tab === 'up' ? formUp() : formReset()}</div>
  </div>`;
  $$('[data-tab]', app).forEach((b) => b.addEventListener('click', () => renderAuth(b.dataset.tab)));
  const f = $('form', app);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', f); btn.disabled = true;
    try {
      const v = (n) => f.elements[n]?.value.trim();
      if (tab === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email: v('email'), password: f.elements.password.value });
        if (error) throw error;
        render();
      } else if (tab === 'up') {
        if (f.elements.password.value.length < 6) throw new Error('Password should be at least 6');
        const { data, error } = await sb.auth.signUp({
          email: v('email'), password: f.elements.password.value,
          options: { data: { full_name: v('name') }, emailRedirectTo: location.origin + '/learn' + (next() ? '?next=' + encodeURIComponent(next()) : '') },
        });
        if (error) throw error;
        if (data.session) return render();
        $('.lx-card', app).innerHTML = `<h2>ইমেইল নিশ্চিত করুন</h2><p><b>${esc(v('email'))}</b>-এ একটি লিংক পাঠানো হয়েছে। লিংকে ক্লিক করলে অ্যাকাউন্ট চালু হবে, তারপর এখানে প্রবেশ করুন।</p><p class="lx-muted">ইনবক্সে না পেলে Spam/Promotions ফোল্ডার দেখুন।</p>`;
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(v('email'), { redirectTo: location.origin + '/learn' });
        if (error) throw error;
        $('.lx-card', app).innerHTML = '<h2>লিংক পাঠানো হয়েছে</h2><p>ইমেইলে পাঠানো লিংকে ক্লিক করে নতুন পাসওয়ার্ড দিন।</p>';
      }
    } catch (err) { toast(trErr(err), 'err'); btn.disabled = false; }
  });
}
const fEmail = '<div class="mb-field"><label for="a-email">ইমেইল</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>';
const formIn = () => `<form class="lx-form">${fEmail}
  <div class="mb-field"><label for="a-pass">পাসওয়ার্ড</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required></div>
  <button class="mb-btn" type="submit">প্রবেশ করুন</button></form>`;
const formUp = () => `<form class="lx-form">
  <div class="mb-field"><label for="a-name">পূর্ণ নাম</label><input id="a-name" name="name" type="text" autocomplete="name" required><small>সার্টিফিকেটে এই নাম ছাপা হবে।</small></div>
  ${fEmail}
  <div class="mb-field"><label for="a-pass">পাসওয়ার্ড (অন্তত ৬ অক্ষর)</label><input id="a-pass" name="password" type="password" autocomplete="new-password" minlength="6" required></div>
  <button class="mb-btn" type="submit">অ্যাকাউন্ট খুলুন</button></form>`;
const formReset = () => `<form class="lx-form">${fEmail}<button class="mb-btn" type="submit">রিসেট লিংক পাঠান</button></form>`;

function renderNewPassword() {
  app.innerHTML = `<div class="lx-narrow"><h1 class="lx-h1">নতুন পাসওয়ার্ড</h1><div class="lx-card"><form class="lx-form">
    <div class="mb-field"><label for="n-pass">নতুন পাসওয়ার্ড</label><input id="n-pass" type="password" minlength="6" autocomplete="new-password" required></div>
    <button class="mb-btn" type="submit">সংরক্ষণ করুন</button></form></div></div>`;
  $('form', app).addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: $('#n-pass').value });
    if (error) return toast(trErr(error), 'err');
    recovery = false; history.replaceState(null, '', '/learn'); toast('পাসওয়ার্ড বদলানো হয়েছে।'); render();
  });
}

// ---------- আমার কোর্স ----------
async function renderDashboard(p) {
  app.innerHTML = `
    <div class="lx-row" style="margin-bottom:8px"><h1 class="lx-h1" style="margin:0">আসসালামু আলাইকুম, ${esc(p.full_name || p.email)}</h1><span class="lx-spacer"></span>
      ${p.is_admin ? '<a class="mb-btn mb-btn--sm" href="/admin">ম্যানেজমেন্ট ড্যাশবোর্ড</a>' : ''}
      <button class="mb-btn mb-btn--sm mb-btn--ghost" id="lx-out" type="button">বের হোন</button></div>
    <p class="lx-sub">${esc(p.email)} · <button class="lx-link" id="lx-name" type="button">সার্টিফিকেটের নাম ঠিক করুন</button></p>
    <h2 class="mb-h2" style="text-align:start;font-size:28px;margin:12px 0 18px">আমার কোর্স</h2>
    <div id="lx-mine"><p class="lx-loading">লোড হচ্ছে…</p></div>
    <h2 class="mb-h2" style="text-align:start;font-size:28px;margin:44px 0 18px">সব কোর্স</h2>
    <div id="lx-all"><p class="lx-loading">লোড হচ্ছে…</p></div>
    <div id="review"></div>`;
  $('#lx-out').addEventListener('click', async () => { await sb.auth.signOut(); render(); });
  $('#lx-name').addEventListener('click', async () => {
    const name = prompt('সার্টিফিকেটে যে নাম ছাপা হবে:', p.full_name || '');
    if (!name) return;
    const { error } = await sb.rpc('lms_set_my_name', { p_name: name });
    if (error) return toast(trErr(error), 'err');
    toast('নাম সংরক্ষিত হয়েছে।'); render();
  });

  const [{ data: mine, error: e1 }, { data: all, error: e2 }] = await Promise.all([
    sb.rpc('lms_my_courses'),
    sb.from('lms_courses').select('slug,title,subtitle,poster_url,status,price,old_price').neq('status', 'draft').order('sort'),
  ]);
  if (e1 || e2) { $('#lx-mine').innerHTML = `<p class="lx-error">${esc(trErr(e1 || e2))}</p>`; return; }
  const mineSlugs = new Set((mine || []).map((c) => c.slug));
  $('#lx-mine').innerHTML = !mine.length
    ? '<p class="lx-empty">এখনো কোনো কোর্সে ভর্তি হননি। নিচের তালিকা থেকে কোর্স বেছে ভর্তির আবেদন করুন।</p>'
    : `<div class="lx-courses">${mine.map((c) => {
        const pct = c.total ? Math.round((100 * c.done) / c.total) : 0;
        const st = c.status === 'active' ? '' : c.status === 'pending' ? '<span class="lx-pill is-wait">পেমেন্ট যাচাই চলছে</span>' : '<span class="lx-pill is-bad">আবেদন গৃহীত হয়নি</span>';
        return `<article class="lx-ccard"><div class="lx-ccard__img">${posterHTML(c)}</div><div class="lx-ccard__body">
          <h3>${esc(c.title)}</h3>${st}
          ${c.status === 'active' ? `<div class="lx-bar" aria-label="অগ্রগতি ${bn(pct)}%"><i style="width:${pct}%"></i></div><p class="lx-muted" style="margin:0">${bn(c.done)} / ${bn(c.total)} দরস সম্পন্ন</p>` : ''}
          <div class="lx-ccard__foot"><a class="mb-btn mb-btn--sm" href="/course?c=${esc(c.slug)}">${c.status === 'active' ? (c.done ? 'চালিয়ে যান' : 'শুরু করুন') : 'বিস্তারিত'}</a>
          ${c.certificate ? `<a class="mb-btn mb-btn--sm mb-btn--ghost" href="/certificate?c=${esc(c.slug)}">সার্টিফিকেট</a>` : ''}</div></div></article>`;
      }).join('')}</div>`;
  const rest = (all || []).filter((c) => !mineSlugs.has(c.slug));
  $('#lx-all').innerHTML = !rest.length ? '<p class="lx-muted">আপনি সব কোর্সেই আছেন।</p>' : `<div class="lx-courses">${rest.map((c) => `
    <article class="lx-ccard"><div class="lx-ccard__img">${posterHTML(c)}</div><div class="lx-ccard__body">
      <h3>${esc(c.title)}</h3>${c.subtitle ? `<p class="lx-muted" style="margin:0">${esc(c.subtitle)}</p>` : ''}
      <div class="lx-ccard__foot">${c.status === 'soon' ? '<span class="lx-pill">শীঘ্রই</span>' : ''}<a class="mb-btn mb-btn--sm mb-btn--ghost" href="/course?c=${esc(c.slug)}">বিস্তারিত</a></div>
    </div></article>`).join('')}</div>`;
  reviewBox(p, (mine || []).filter((c) => c.status === 'active'));
}

// ---------- শিক্ষার্থীর মতামত ----------
async function reviewBox(p, active) {
  const box = $('#review'); if (!box || !active.length) return;
  const { data: old, error } = await sb.from('lms_testimonials').select('name,course_title,body,rating,approved').eq('user_id', p.id).maybeSingle();
  if (error && error.code !== 'PGRST116') return; // টেবিল না থাকলে চুপচাপ
  const rating = old?.rating || 5;
  box.innerHTML = `<h2 class="mb-h2" style="text-align:start;font-size:28px;margin:44px 0 8px">আপনার মতামত</h2>
    <p class="lx-sub">কোর্সটি কেমন লাগছে? আপনার কয়েক লাইন অন্যদের সিদ্ধান্ত নিতে সাহায্য করবে। শিক্ষক দেখে নেওয়ার পর হোমপেজে দেখাবে।</p>
    ${old ? `<p><span class="lx-pill ${old.approved ? 'is-ok' : 'is-wait'}">${old.approved ? 'আপনার মতামত সাইটে দেখাচ্ছে' : 'আপনার মতামত শিক্ষকের অনুমোদনের অপেক্ষায়'}</span></p>` : ''}
    <form class="lx-card lx-form" id="rv-form"><div class="lx-grid2">
      <div class="mb-field"><label for="rv-name">নাম (যেভাবে দেখাবে)</label><input id="rv-name" required maxlength="80" value="${esc(old?.name || p.full_name || '')}"></div>
      <div class="mb-field"><label for="rv-course">কোর্স</label><select id="rv-course">${active.map((c) => `<option${old?.course_title === c.title ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div></div>
      <fieldset class="mb-field" style="border:0;padding:0;margin:0"><legend style="font-weight:600">রেটিং</legend><span class="lx-stars">
        ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rv-rating" id="rv-r${n}" value="${n}"${n === rating ? ' checked' : ''}><label for="rv-r${n}" title="${bn(n)} তারা">★</label>`).join('')}</span></fieldset>
      <div class="mb-field"><label for="rv-body">আপনার অভিজ্ঞতা</label><textarea id="rv-body" rows="4" required minlength="10" maxlength="1200">${esc(old?.body || '')}</textarea></div>
      <button class="mb-btn mb-btn--sm" type="submit">${old ? 'হালনাগাদ করুন' : 'মতামত পাঠান'}</button></form>`;
  if (location.hash === '#review') box.scrollIntoView();
  $('#rv-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error: err } = await sb.rpc('lms_submit_testimonial', {
      p_name: $('#rv-name').value, p_body: $('#rv-body').value, p_course: $('#rv-course').value,
      p_rating: Number($('input[name="rv-rating"]:checked')?.value || 5),
    });
    if (err) return toast(trErr(err), 'err');
    if (data !== 'ok') return toast(data === 'short' ? 'আরেকটু বিস্তারিত লিখুন।' : 'মতামত দিতে কোর্সে ভর্তি থাকতে হবে।', 'err');
    toast('ধন্যবাদ! শিক্ষক দেখে নেওয়ার পর সাইটে দেখাবে।'); reviewBox(p, active);
  });
}

render();
