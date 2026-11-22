// ম্যানেজমেন্ট ড্যাশবোর্ড: কোর্স, পাঠ্যক্রম, দরস (ভিডিও/লেখা/ফাইল/কুইজ), ভর্তি আবেদন, শিক্ষার্থী, আমদানি
import { sb, $, $$, esc, bn, money, toast, trErr, getProfile, paintHeader, wireNav, youtubeId, youtubeEmbed, publicUrl, fmtSize, fmtDate, posterHTML } from './lms.js';
import { makeEditor } from './editor.js';

const app = $('#lx-app');
wireNav();
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = bn(new Date().getFullYear())));

const STATUS = { draft: 'খসড়া (লুকানো)', soon: 'শীঘ্রই', open: 'ভর্তি চলছে', closed: 'ভর্তি বন্ধ' };
const COMPLETION = { manual: '“সম্পন্ন” বোতাম চাপলে', quiz: 'দরসের টেস্টে পাশ করলে', embedded: 'দরসের ভেতরের অনুশীলনে পাশ করলে' };
let courses = [];
let students = null;

// ---------- কাঠামো ----------
async function boot() {
  paintHeader();
  const p = await getProfile();
  if (!p) { app.innerHTML = '<div class="lx-narrow lx-center"><h1 class="lx-h1">ম্যানেজমেন্ট ড্যাশবোর্ড</h1><p class="lx-note">আগে প্রবেশ করুন।</p><a class="mb-btn" href="/learn?next=/admin">প্রবেশ</a></div>'; return; }
  if (!p.is_admin) { app.innerHTML = '<div class="lx-narrow lx-center"><h1 class="lx-h1">ম্যানেজমেন্ট ড্যাশবোর্ড</h1><p class="lx-error">এই পাতা শুধু শিক্ষকের জন্য।</p></div>'; return; }
  app.innerHTML = `<div class="lx-admin">
    <nav class="lx-admin__nav" aria-label="ড্যাশবোর্ড মেনু">
      <button type="button" data-go="courses">কোর্সসমূহ</button>
      <button type="button" data-go="requests">ভর্তি আবেদন <span class="lx-pill lx-count" id="lx-req-n" hidden></span></button>
      <button type="button" data-go="students">শিক্ষার্থী</button>
      <button type="button" data-go="site">শিক্ষক ও মতামত <span class="lx-pill lx-count" id="lx-rev-n" hidden></span></button>
      <button type="button" data-go="import">পুরোনো কোর্স আমদানি</button>
    </nav>
    <section id="lx-view" aria-live="polite"></section></div>`;
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  window.addEventListener('hashchange', route);
  refreshRequests();
  refreshReviews();
  route();
}
function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
async function route() {
  const [view, arg] = (location.hash.slice(1) || 'courses').split('/');
  $$('[data-go]').forEach((b) => b.toggleAttribute('aria-current', false));
  const nav = { course: 'courses', lesson: 'courses' }[view] || view;
  $(`[data-go="${nav}"]`)?.setAttribute('aria-current', 'page');
  const v = $('#lx-view'); v.innerHTML = '<p class="lx-loading">লোড হচ্ছে…</p>';
  try {
    if (view === 'courses') await viewCourses();
    else if (view === 'course') await viewCourse(arg);
    else if (view === 'lesson') await viewLesson(arg);
    else if (view === 'requests') await viewRequests();
    else if (view === 'students') await viewStudents();
    else if (view === 'site') await viewSite();
    else if (view === 'import') await viewImport();
    else await viewCourses();
  } catch (e) { v.innerHTML = `<p class="lx-error">${esc(trErr(e))}</p>`; console.error(e); }
  window.scrollTo(0, 0);
}
const view = () => $('#lx-view');
async function must(q) { const { data, error } = await q; if (error) throw error; return data; }
async function loadCourses() { courses = await must(sb.from('lms_courses').select('*').order('sort').order('created_at')); return courses; }

// ---------- কোর্সের তালিকা ----------
async function viewCourses() {
  await loadCourses();
  const counts = await must(sb.from('lms_lessons').select('course_id'));
  const n = (id) => counts.filter((x) => x.course_id === id).length;
  view().innerHTML = `
    <div class="lx-row" style="margin-bottom:18px"><h1 class="lx-h1" style="margin:0">কোর্সসমূহ</h1><span class="lx-spacer"></span>
      <button class="mb-btn" type="button" id="lx-new">+ নতুন কোর্স</button></div>
    ${!courses.length ? '<p class="lx-empty">এখনো কোনো কোর্স নেই। “নতুন কোর্স” চাপুন, অথবা “পুরোনো কোর্স আমদানি” থেকে হাতেখড়ি ও নাহু নিয়ে আসুন।</p>' : `
    <div class="lx-courses">${courses.map((c) => `
      <article class="lx-ccard"><div class="lx-ccard__img">${posterHTML(c)}</div><div class="lx-ccard__body">
        <h3>${esc(c.title)}</h3>
        <p class="lx-muted" style="margin:0">${bn(n(c.id))} দরস · ${money(c.price) || 'দাম নেই'}</p>
        <span class="lx-pill ${c.status === 'open' ? 'is-ok' : c.status === 'draft' ? '' : 'is-wait'}">${STATUS[c.status]}</span>
        <div class="lx-ccard__foot"><a class="mb-btn mb-btn--sm" href="#course/${c.id}">সম্পাদনা</a>
          ${c.status !== 'draft' ? `<a class="mb-btn mb-btn--sm mb-btn--ghost" href="/course?c=${esc(c.slug)}" target="_blank" rel="noopener">সাইটে দেখুন</a>` : ''}</div>
      </div></article>`).join('')}</div>`}`;
  $('#lx-new').addEventListener('click', newCourse);
}

async function newCourse() {
  const title = prompt('নতুন কোর্সের নাম:'); if (!title) return;
  let slug = prompt('ঠিকানার জন্য ইংরেজি ছোট নাম (শুধু a-z, 0-9, -), যেমন: sarfer-sohoj-path', '');
  slug = (slug || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) return toast('ইংরেজি ছোট নাম লাগবে।', 'err');
  const { data, error } = await sb.from('lms_courses').insert({ title, slug, status: 'draft', sort: courses.length + 1 }).select().single();
  if (error) return toast(error.code === '23505' ? 'এই ছোট নাম আগে ব্যবহার হয়েছে।' : trErr(error), 'err');
  location.hash = 'course/' + data.id;
}

// ---------- একটি কোর্স: তথ্য + পাঠ্যক্রম + উপকরণ ----------
async function viewCourse(id, tab = sessionStorage.getItem('lx-ctab') || 'info') {
  const c = await must(sb.from('lms_courses').select('*').eq('id', id).single());
  view().innerHTML = `
    <p class="lx-crumb"><a href="#courses">কোর্সসমূহ</a></p>
    <div class="lx-row"><h1 class="lx-h1" style="margin:0">${esc(c.title)}</h1><span class="lx-spacer"></span>
      ${c.status !== 'draft' ? `<a class="mb-btn mb-btn--sm mb-btn--ghost" href="/course?c=${esc(c.slug)}" target="_blank" rel="noopener">সাইটে দেখুন</a>` : ''}</div>
    <div class="lx-tabs" role="tablist" style="margin-top:16px">
      <button role="tab" data-t="info" aria-selected="${tab === 'info'}">কোর্সের তথ্য</button>
      <button role="tab" data-t="cur" aria-selected="${tab === 'cur'}">পাঠ্যক্রম (অধ্যায় ও দরস)</button>
      <button role="tab" data-t="files" aria-selected="${tab === 'files'}">কোর্সের উপকরণ</button>
    </div><div id="lx-ctab"></div>`;
  $$('[data-t]').forEach((b) => b.addEventListener('click', () => { sessionStorage.setItem('lx-ctab', b.dataset.t); viewCourse(id, b.dataset.t); }));
  if (tab === 'info') courseInfo(c);
  else if (tab === 'cur') await curriculum(c);
  else await filesPanel($('#lx-ctab'), c.id, null);
}

function courseInfo(c) {
  const box = $('#lx-ctab');
  box.innerHTML = `<form class="lx-form" id="cf">
    <div class="lx-card"><h3>মূল তথ্য</h3>
      <div class="lx-grid2">
        <div class="mb-field"><label for="c-title">কোর্সের নাম</label><input id="c-title" required value="${esc(c.title)}"></div>
        <div class="mb-field"><label for="c-slug">ঠিকানার নাম (ইংরেজি)</label><input id="c-slug" required pattern="[a-z0-9-]+" value="${esc(c.slug)}"><small>সাইটে: /course?c=${esc(c.slug)}</small></div>
        <div class="mb-field"><label for="c-sub">এক লাইনের পরিচিতি</label><input id="c-sub" value="${esc(c.subtitle || '')}"></div>
        <div class="mb-field"><label for="c-level">স্তর</label><input id="c-level" placeholder="যেমন: প্রথম ধাপ · একদম শুরু থেকে" value="${esc(c.level || '')}"></div>
        <div class="mb-field"><label for="c-price">দাম (টাকা)</label><input id="c-price" type="number" min="0" value="${c.price ?? ''}"></div>
        <div class="mb-field"><label for="c-old">আগের দাম (কেটে দেখাবে)</label><input id="c-old" type="number" min="0" value="${c.old_price ?? ''}"></div>
        <div class="mb-field"><label for="c-status">অবস্থা</label><select id="c-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${c.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="mb-field"><label for="c-sort">তালিকায় ক্রম</label><input id="c-sort" type="number" value="${c.sort}"></div>
      </div></div>
    <div class="lx-card"><h3>পোস্টার</h3>
      <div class="lx-row"><div class="lx-poster-prev" id="c-prev">${posterHTML(c)}</div>
        <div><input type="file" id="c-poster" accept="image/*"><p class="lx-muted" style="margin:6px 0 0">১৬:৯ মাপের ছবি ভালো দেখায় (যেমন ১২৮০×৭২০)।</p>
        ${c.poster_url ? '<button class="lx-link" type="button" id="c-nopost">পোস্টার সরান</button>' : ''}</div></div></div>
    <div class="lx-card"><h3>কোর্সের বিবরণ</h3><div id="c-desc"></div></div>
    <div class="lx-card"><h3>নিয়ম</h3>
      <div class="lx-grid2">
        <div class="mb-field"><label for="c-pass">পাশ নম্বর (%)</label><input id="c-pass" type="number" min="0" max="100" value="${c.pass_mark}"></div>
      </div>
      <label class="lx-check"><input type="checkbox" id="c-seq"${c.sequential ? ' checked' : ''}> আগের দরস শেষ না করলে পরের দরস বন্ধ থাকবে</label>
      <label class="lx-check"><input type="checkbox" id="c-cert"${c.certificate ? ' checked' : ''}> সব দরস শেষে সার্টিফিকেট দেওয়া হবে</label>
      <details class="lx-adv"><summary>উন্নত: দরসের নিজস্ব নকশা (CSS/JS)</summary>
        <p class="lx-muted">এই নকশা ও স্ক্রিপ্ট প্রতিটি দরসের লেখার ফ্রেমে চলে। অনুশীলনের নম্বর জমা দিতে স্ক্রিপ্টে <code>LMS.report(নম্বর)</code> ডাকুন।</p>
        <div class="mb-field"><label for="c-css">CSS</label><textarea id="c-css" class="lx-code">${esc(c.theme_css || '')}</textarea></div>
        <div class="mb-field"><label for="c-js">JavaScript</label><textarea id="c-js" class="lx-code">${esc(c.theme_js || '')}</textarea></div>
      </details></div>
    <div class="lx-row"><button class="mb-btn" type="submit">সংরক্ষণ করুন</button><span class="lx-spacer"></span>
      <button class="mb-btn mb-btn--sm lx-btn-danger" type="button" id="c-del">কোর্স মুছুন</button></div>
  </form>`;
  const ed = makeEditor($('#c-desc'), c.description, { imageFolder: 'courses/' + c.id });
  let posterUrl = c.poster_url;
  $('#c-poster').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const path = `posters/${c.id}-${Date.now()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await sb.storage.from('lms-public').upload(path, f, { contentType: f.type, upsert: true });
    if (error) return toast(trErr(error), 'err');
    posterUrl = publicUrl(path);
    $('#c-prev').innerHTML = `<img src="${esc(posterUrl)}" alt="">`;
    toast('পোস্টার আপলোড হয়েছে — সংরক্ষণ চাপুন।');
  });
  $('#c-nopost')?.addEventListener('click', () => { posterUrl = null; $('#c-prev').innerHTML = posterHTML({ ...c, poster_url: null }); });
  $('#cf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Number(v));
    const row = {
      title: $('#c-title').value.trim(), slug: $('#c-slug').value.trim(), subtitle: $('#c-sub').value.trim() || null,
      level: $('#c-level').value.trim() || null, price: num($('#c-price').value), old_price: num($('#c-old').value),
      status: $('#c-status').value, sort: num($('#c-sort').value) || 0, pass_mark: num($('#c-pass').value) ?? 70,
      sequential: $('#c-seq').checked, certificate: $('#c-cert').checked, poster_url: posterUrl,
      description: ed.get() || null, theme_css: $('#c-css').value || null, theme_js: $('#c-js').value || null,
    };
    const { error } = await sb.from('lms_courses').update(row).eq('id', c.id);
    if (error) return toast(error.code === '23505' ? 'এই ঠিকানার নাম আগে ব্যবহার হয়েছে।' : trErr(error), 'err');
    toast('সংরক্ষিত হয়েছে।'); viewCourse(c.id, 'info');
  });
  $('#c-del').addEventListener('click', async () => {
    if (prompt(`সাবধান: "${c.title}" কোর্স, এর সব দরস, কুইজ, শিক্ষার্থীর ভর্তি ও অগ্রগতি চিরতরে মুছে যাবে।\nনিশ্চিত হলে নিচে "মুছুন" লিখুন:`) !== 'মুছুন') return;
    const { error } = await sb.from('lms_courses').delete().eq('id', c.id);
    if (error) return toast(trErr(error), 'err');
    toast('কোর্স মুছে ফেলা হয়েছে।'); location.hash = 'courses';
  });
}

// ---------- পাঠ্যক্রম ----------
async function curriculum(c) {
  const box = $('#lx-ctab');
  const [chs, ls, qz] = await Promise.all([
    must(sb.from('lms_chapters').select('*').eq('course_id', c.id).order('sort').order('created_at')),
    must(sb.from('lms_lessons').select('id,title,chapter_id,sort,published,is_preview,youtube_id,completion').eq('course_id', c.id).order('sort').order('created_at')),
    must(sb.from('lms_quiz').select('lesson_id')),
  ]);
  const hasQ = new Set(qz.map((q) => q.lesson_id));
  const groups = [...chs.map((ch) => ({ ch, items: ls.filter((l) => l.chapter_id === ch.id) })), { ch: null, items: ls.filter((l) => !l.chapter_id) }];
  box.innerHTML = `
    <div class="lx-row" style="margin-bottom:14px"><p class="lx-muted" style="margin:0">${bn(chs.length)} অধ্যায় · ${bn(ls.length)} দরস (${bn(ls.filter((l) => l.published).length)} প্রকাশিত)</p><span class="lx-spacer"></span>
      <button class="mb-btn mb-btn--sm" type="button" id="add-ch">+ অধ্যায়</button></div>
    <div class="lx-cur">${groups.filter((g) => g.ch || g.items.length).map((g, gi) => `
      <div class="lx-cur__ch">
        <strong>${g.ch ? esc(g.ch.title) : 'অধ্যায় ছাড়া দরস'}</strong><span class="lx-spacer"></span>
        ${g.ch ? `<button class="lx-icon-btn" type="button" data-chup="${g.ch.id}" aria-label="অধ্যায় ওপরে" title="ওপরে">↑</button>
        <button class="lx-icon-btn" type="button" data-chdown="${g.ch.id}" aria-label="অধ্যায় নিচে" title="নিচে">↓</button>
        <button class="lx-icon-btn" type="button" data-chren="${g.ch.id}">নাম</button>
        <button class="lx-icon-btn" type="button" data-chdel="${g.ch.id}">মুছুন</button>` : ''}
        <button class="mb-btn mb-btn--sm" type="button" data-addls="${g.ch ? g.ch.id : ''}">+ দরস</button>
      </div>
      ${g.items.map((l) => `<div class="lx-cur__ls">
        <span class="lx-t"><a href="#lesson/${l.id}">${esc(l.title)}</a><br><small>${[
          l.published ? 'প্রকাশিত' : 'খসড়া', l.youtube_id ? 'ভিডিও' : '', hasQ.has(l.id) ? 'টেস্ট' : '', l.is_preview ? 'ফ্রি প্রিভিউ' : '',
        ].filter(Boolean).join(' · ')}</small></span>
        <button class="lx-icon-btn" type="button" data-lsup="${l.id}" aria-label="দরস ওপরে" title="ওপরে">↑</button>
        <button class="lx-icon-btn" type="button" data-lsdown="${l.id}" aria-label="দরস নিচে" title="নিচে">↓</button>
        <a class="mb-btn mb-btn--sm mb-btn--ghost" href="#lesson/${l.id}">সম্পাদনা</a>
      </div>`).join('') || '<div class="lx-cur__ls lx-muted">এই অধ্যায়ে এখনো দরস নেই।</div>'}`).join('') || '<p class="lx-empty" style="margin:0">প্রথমে একটি অধ্যায় যোগ করুন।</p>'}</div>`;

  const reload = () => viewCourse(c.id, 'cur');
  $('#add-ch').addEventListener('click', async () => {
    const t = prompt('অধ্যায়ের নাম:'); if (!t) return;
    const { error } = await sb.from('lms_chapters').insert({ course_id: c.id, title: t, sort: (chs.at(-1)?.sort || 0) + 1 });
    if (error) return toast(trErr(error), 'err'); reload();
  });
  $$('[data-chren]', box).forEach((b) => b.addEventListener('click', async () => {
    const ch = chs.find((x) => x.id === b.dataset.chren); const t = prompt('অধ্যায়ের নতুন নাম:', ch.title); if (!t) return;
    await sb.from('lms_chapters').update({ title: t }).eq('id', ch.id); reload();
  }));
  $$('[data-chdel]', box).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('অধ্যায়টি মুছবেন? এর দরসগুলো মুছবে না — “অধ্যায় ছাড়া দরস”-এ চলে যাবে।')) return;
    await sb.from('lms_chapters').delete().eq('id', b.dataset.chdel); reload();
  }));
  const swap = async (table, list, idx, dir) => {
    const j = idx + dir; if (idx < 0 || j < 0 || j >= list.length) return;
    // ক্রম নতুন করে ১,২,৩... দিয়ে লেখা — সমান sort থাকলেও কাজ করে
    const arr = [...list]; [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await Promise.all(arr.map((x, i) => sb.from(table).update({ sort: i + 1 }).eq('id', x.id)));
    reload();
  };
  $$('[data-chup],[data-chdown]', box).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.chup || b.dataset.chdown; swap('lms_chapters', chs, chs.findIndex((x) => x.id === id), b.dataset.chup ? -1 : 1);
  }));
  $$('[data-lsup],[data-lsdown]', box).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.lsup || b.dataset.lsdown; const l = ls.find((x) => x.id === id);
    const sib = ls.filter((x) => x.chapter_id === l.chapter_id);
    swap('lms_lessons', sib, sib.findIndex((x) => x.id === id), b.dataset.lsup ? -1 : 1);
  }));
  $$('[data-addls]', box).forEach((b) => b.addEventListener('click', async () => {
    const t = prompt('দরসের নাম:'); if (!t) return;
    const chId = b.dataset.addls || null;
    const sort = Math.max(0, ...ls.filter((x) => x.chapter_id === chId).map((x) => x.sort)) + 1;
    const { data, error } = await sb.from('lms_lessons').insert({ course_id: c.id, chapter_id: chId, title: t, sort }).select('id').single();
    if (error) return toast(trErr(error), 'err');
    location.hash = 'lesson/' + data.id;
  }));
}

// ---------- ফাইল (কোর্সের বা দরসের) ----------
async function filesPanel(box, courseId, lessonId) {
  let q = sb.from('lms_files').select('*').eq('course_id', courseId).order('sort').order('created_at');
  q = lessonId ? q.eq('lesson_id', lessonId) : q.is('lesson_id', null);
  const files = await must(q);
  box.innerHTML = `<div class="lx-card"><h3>${lessonId ? 'দরসের ফাইল' : 'পুরো কোর্সের উপকরণ'}</h3>
    <p class="lx-muted">PDF, Word, ছবি, অডিও, স্লাইড — যেকোনো ফাইল (সর্বোচ্চ ৫০ MB)। শুধু ভর্তি হওয়া শিক্ষার্থীরা পাবে।</p>
    ${files.length ? `<ul class="lx-files">${files.map((f) => `<li><span>${esc(f.name)} <small class="lx-muted">${fmtSize(f.size)}</small></span>
      <span class="lx-row"><button class="lx-icon-btn" type="button" data-ren="${f.id}">নাম</button><button class="lx-icon-btn" type="button" data-del="${f.id}">মুছুন</button></span></li>`).join('')}</ul>` : '<p class="lx-muted">এখনো কোনো ফাইল নেই।</p>'}
    <div class="mb-field" style="margin-top:12px"><label for="up-${lessonId || 'c'}">ফাইল যোগ করুন</label><input type="file" id="up-${lessonId || 'c'}" multiple></div>
    <p class="lx-muted" data-upmsg></p></div>`;
  const input = $('input[type=file]', box);
  input.addEventListener('change', async () => {
    const msg = $('[data-upmsg]', box);
    for (const [i, f] of [...input.files].entries()) {
      msg.textContent = `আপলোড হচ্ছে: ${f.name} (${bn(i + 1)}/${bn(input.files.length)})…`;
      // ফাইলের পথে শুধু ইংরেজি অক্ষর (Supabase-এর নিয়ম); শিক্ষার্থীরা বাংলা নামই দেখবে
      const ext = (f.name.match(/\.[A-Za-z0-9]{1,8}$/) || [''])[0].toLowerCase();
      const safe = (f.name.replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file') + ext;
      const path = `${courseId}/${lessonId || 'course'}/${Date.now()}-${safe}`;
      const { error } = await sb.storage.from('lms-files').upload(path, f, { contentType: f.type || 'application/octet-stream' });
      if (error) { toast(f.name + ': ' + trErr(error), 'err'); continue; }
      await sb.from('lms_files').insert({ course_id: courseId, lesson_id: lessonId, name: f.name, path, mime: f.type, size: f.size, sort: files.length + i + 1 });
    }
    toast('ফাইল যোগ হয়েছে।'); filesPanel(box, courseId, lessonId);
  });
  $$('[data-del]', box).forEach((b) => b.addEventListener('click', async () => {
    const f = files.find((x) => x.id === b.dataset.del);
    if (!confirm(`"${f.name}" মুছবেন? শিক্ষার্থীরা আর পাবে না।`)) return;
    await sb.storage.from('lms-files').remove([f.path]);
    await sb.from('lms_files').delete().eq('id', f.id);
    filesPanel(box, courseId, lessonId);
  }));
  $$('[data-ren]', box).forEach((b) => b.addEventListener('click', async () => {
    const f = files.find((x) => x.id === b.dataset.ren); const t = prompt('শিক্ষার্থীরা যে নাম দেখবে:', f.name); if (!t) return;
    await sb.from('lms_files').update({ name: t }).eq('id', f.id); filesPanel(box, courseId, lessonId);
  }));
}

// ---------- দরস সম্পাদনা ----------
async function viewLesson(id) {
  const l = await must(sb.from('lms_lessons').select('*').eq('id', id).single());
  const [c, chs, quiz] = await Promise.all([
    must(sb.from('lms_courses').select('id,title,slug').eq('id', l.course_id).single()),
    must(sb.from('lms_chapters').select('id,title').eq('course_id', l.course_id).order('sort').order('created_at')),
    must(sb.from('lms_quiz').select('*').eq('lesson_id', id).order('sort')),
  ]);
  view().innerHTML = `
    <p class="lx-crumb"><a href="#courses">কোর্সসমূহ</a> › <a href="#course/${c.id}" data-cur>${esc(c.title)}</a></p>
    <h1 class="lx-h1">দরস: ${esc(l.title)}</h1>
    <form class="lx-form" id="lf">
      <div class="lx-card"><h3>মূল তথ্য</h3><div class="lx-grid2">
        <div class="mb-field"><label for="l-title">দরসের নাম</label><input id="l-title" required value="${esc(l.title)}"></div>
        <div class="mb-field"><label for="l-ch">অধ্যায়</label><select id="l-ch"><option value="">— অধ্যায় ছাড়া —</option>${chs.map((ch) => `<option value="${ch.id}"${ch.id === l.chapter_id ? ' selected' : ''}>${esc(ch.title)}</option>`).join('')}</select></div>
        <div class="mb-field"><label for="l-dur">সময় (মিনিট)</label><input id="l-dur" type="number" min="0" value="${l.duration_min ?? ''}"></div>
        <div class="mb-field"><label for="l-comp">দরস সম্পন্ন হবে</label><select id="l-comp">${Object.entries(COMPLETION).map(([k, v]) => `<option value="${k}"${l.completion === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>
      <label class="lx-check"><input type="checkbox" id="l-pub"${l.published ? ' checked' : ''}> প্রকাশিত (শিক্ষার্থীরা দেখতে পাবে)</label>
      <label class="lx-check"><input type="checkbox" id="l-prev"${l.is_preview ? ' checked' : ''}> ফ্রি প্রিভিউ — ভর্তি ছাড়াই যে কেউ দেখতে পারবে</label></div>

      <div class="lx-card"><h3>ভিডিও (YouTube)</h3>
        <div class="mb-field"><label for="l-yt">YouTube লিংক</label><input id="l-yt" placeholder="https://youtu.be/... বা https://www.youtube.com/watch?v=..." value="${l.youtube_id ? 'https://youtu.be/' + esc(l.youtube_id) : ''}">
        <small>YouTube-এ ভিডিও আপলোডের সময় Visibility: <b>Unlisted</b> দিন, তারপর Share লিংকটি এখানে দিন। খালি রাখলে ভিডিও থাকবে না।</small></div>
        <div id="l-ytprev"></div></div>

      <div class="lx-card"><h3>দরসের লেখা</h3><div id="l-body"></div></div>

      <div class="lx-card"><div class="lx-row"><h3 style="margin:0">দরসের টেস্ট</h3><span class="lx-spacer"></span><button class="mb-btn mb-btn--sm" type="button" id="q-add">+ প্রশ্ন</button></div>
        <p class="lx-muted">বহুনির্বাচনী প্রশ্ন। সঠিক উত্তরের পাশের গোল বোতামটি বেছে দিন। টেস্ট থাকলে “দরস সম্পন্ন হবে” ঘরে “দরসের টেস্টে পাশ করলে” দিন।</p>
        <div id="q-list"></div></div>

      <div class="lx-row" style="position:sticky;bottom:0;background:var(--mb-bg);padding:12px 0;border-top:1px solid var(--mb-rule);z-index:5">
        <button class="mb-btn" type="submit">সংরক্ষণ করুন</button>
        <a class="mb-btn mb-btn--ghost" href="/lesson?id=${l.id}" target="_blank" rel="noopener">শিক্ষার্থীর চোখে দেখুন</a>
        <span class="lx-spacer"></span><button class="mb-btn mb-btn--sm lx-btn-danger" type="button" id="l-del">দরস মুছুন</button></div>
    </form>
    <div id="l-files" style="margin-top:18px"></div>`;
  $('[data-cur]').addEventListener('click', () => sessionStorage.setItem('lx-ctab', 'cur'));

  const ed = makeEditor($('#l-body'), l.body_html, { imageFolder: 'lessons/' + l.id });
  const ytPrev = () => { const v = youtubeId($('#l-yt').value); $('#l-ytprev').innerHTML = v ? youtubeEmbed(v) : ($('#l-yt').value.trim() ? '<p class="lx-error">লিংকটি চেনা যাচ্ছে না।</p>' : ''); };
  $('#l-yt').addEventListener('change', ytPrev); ytPrev();

  // কুইজ সম্পাদক
  let qs = quiz.map((q) => ({ question: q.question, options: [...q.options], correct: q.correct, explanation: q.explanation || '' }));
  const paintQ = () => {
    $('#q-list').innerHTML = qs.length ? qs.map((q, i) => `<div class="lx-qedit" data-qi="${i}">
      <div class="lx-row"><b>প্রশ্ন ${bn(i + 1)}</b><span class="lx-spacer"></span>
        <button class="lx-icon-btn" type="button" data-qup="${i}" aria-label="ওপরে">↑</button><button class="lx-icon-btn" type="button" data-qdel="${i}">মুছুন</button></div>
      <div class="mb-field"><label for="qq-${i}">প্রশ্ন</label><input id="qq-${i}" data-f="question" value="${esc(q.question)}"></div>
      ${q.options.map((o, j) => `<div class="lx-qopt"><input type="radio" name="qc-${i}" value="${j}"${q.correct === j ? ' checked' : ''} aria-label="সঠিক উত্তর ${bn(j + 1)}" title="সঠিক উত্তর">
        <input type="text" data-opt="${j}" value="${esc(o)}" placeholder="উত্তর ${bn(j + 1)}" aria-label="উত্তর ${bn(j + 1)}" style="font:inherit;padding:9px 12px;border:1px solid var(--mb-rule);background:#fff">
        ${q.options.length > 2 ? `<button class="lx-icon-btn" type="button" data-odel="${j}" aria-label="উত্তর মুছুন">×</button>` : ''}</div>`).join('')}
      ${q.options.length < 8 ? '<button class="lx-link" type="button" data-oadd>+ আরেকটি উত্তর</button>' : ''}
      <div class="mb-field"><label for="qe-${i}">ব্যাখ্যা (উত্তর দেওয়ার পর দেখাবে — ঐচ্ছিক)</label><input id="qe-${i}" data-f="explanation" value="${esc(q.explanation)}"></div>
    </div>`).join('') : '<p class="lx-muted">এই দরসে টেস্ট নেই।</p>';
    $$('.lx-qedit').forEach((el) => {
      const i = +el.dataset.qi, q = qs[i];
      $$('[data-f]', el).forEach((inp) => inp.addEventListener('input', () => { q[inp.dataset.f] = inp.value; }));
      $$('[data-opt]', el).forEach((inp) => inp.addEventListener('input', () => { q.options[+inp.dataset.opt] = inp.value; }));
      $$(`input[name="qc-${i}"]`, el).forEach((r) => r.addEventListener('change', () => { q.correct = +r.value; }));
      $$('[data-odel]', el).forEach((b) => b.addEventListener('click', () => { const j = +b.dataset.odel; q.options.splice(j, 1); if (q.correct >= q.options.length || q.correct === j) q.correct = 0; paintQ(); }));
      $('[data-oadd]', el)?.addEventListener('click', () => { q.options.push(''); paintQ(); });
      $('[data-qdel]', el).addEventListener('click', () => { qs.splice(i, 1); paintQ(); });
      $('[data-qup]', el).addEventListener('click', () => { if (i) { [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]]; paintQ(); } });
    });
  };
  paintQ();
  $('#q-add').addEventListener('click', () => { qs.push({ question: '', options: ['', ''], correct: 0, explanation: '' }); paintQ(); $('.lx-qedit:last-child input')?.focus(); });

  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ytRaw = $('#l-yt').value.trim(); const yt = ytRaw ? youtubeId(ytRaw) : null;
    if (ytRaw && !yt) return toast('YouTube লিংকটি চেনা যাচ্ছে না।', 'err');
    const clean = qs.map((q) => ({ ...q, question: q.question.trim(), options: q.options.map((o) => o.trim()) }));
    const bad = clean.findIndex((q) => !q.question || q.options.some((o) => !o));
    if (bad >= 0) return toast(`প্রশ্ন ${bn(bad + 1)}: প্রশ্ন বা কোনো উত্তর খালি আছে।`, 'err');
    let completion = $('#l-comp').value;
    if (completion === 'quiz' && !clean.length) return toast('“টেস্টে পাশ করলে” বেছেছেন, কিন্তু কোনো প্রশ্ন নেই।', 'err');
    const row = {
      title: $('#l-title').value.trim(), chapter_id: $('#l-ch').value || null, duration_min: $('#l-dur').value ? +$('#l-dur').value : null,
      completion, published: $('#l-pub').checked, is_preview: $('#l-prev').checked, youtube_id: yt, body_html: ed.get() || null,
    };
    const btn = $('#lf button[type=submit]'); btn.disabled = true;
    try {
      await must(sb.from('lms_lessons').update(row).eq('id', l.id));
      await must(sb.from('lms_quiz').delete().eq('lesson_id', l.id));
      if (clean.length) await must(sb.from('lms_quiz').insert(clean.map((q, i) => ({ lesson_id: l.id, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation.trim() || null, sort: i + 1 }))));
      toast('দরস সংরক্ষিত হয়েছে।');
    } catch (err) { toast(trErr(err), 'err'); }
    btn.disabled = false;
  });
  $('#l-del').addEventListener('click', async () => {
    if (!confirm(`"${l.title}" দরস, এর টেস্ট, ফাইল ও শিক্ষার্থীদের অগ্রগতি মুছে যাবে। মুছবেন?`)) return;
    const files = await must(sb.from('lms_files').select('path').eq('lesson_id', l.id));
    if (files.length) await sb.storage.from('lms-files').remove(files.map((f) => f.path));
    await sb.from('lms_lessons').delete().eq('id', l.id);
    sessionStorage.setItem('lx-ctab', 'cur'); location.hash = 'course/' + c.id;
  });
  filesPanel($('#l-files'), l.course_id, l.id);
}

// ---------- ভর্তি আবেদন ----------
async function getStudents(force) { if (!students || force) students = await must(sb.rpc('lms_admin_students')); return students; }
async function refreshRequests() {
  try {
    const st = await getStudents(true);
    const n = st.reduce((a, s) => a + s.enrollments.filter((e) => e.status === 'pending').length, 0);
    const el = $('#lx-req-n'); el.textContent = bn(n); el.hidden = !n; el.className = 'lx-pill lx-count is-wait';
  } catch { /* ignore */ }
}
async function setEnrollment(uid, courseId, status) {
  const row = { status, ...(status === 'active' ? { activated_at: new Date().toISOString() } : {}) };
  const { error } = await sb.from('lms_enrollments').update(row).eq('user_id', uid).eq('course_id', courseId);
  if (error) throw error;
}
async function viewRequests() {
  await loadCourses();
  const st = await getStudents(true);
  const cname = (id) => courses.find((c) => c.id === id)?.title || '—';
  const rows = st.flatMap((s) => s.enrollments.filter((e) => e.status === 'pending').map((e) => ({ s, e })));
  view().innerHTML = `<h1 class="lx-h1">ভর্তি আবেদন</h1>
    <p class="lx-sub">বিকাশ/নগদ/ব্যাংকের হিসাবে টাকা এসেছে কি না TrxID মিলিয়ে দেখুন, তারপর “চালু করুন” চাপুন।</p>
    ${!rows.length ? '<p class="lx-empty">নতুন কোনো আবেদন নেই।</p>' : `<div class="lx-table-wrap"><table class="lx-table"><thead><tr>
      <th>শিক্ষার্থী</th><th>কোর্স</th><th>মাধ্যম</th><th>প্রেরক</th><th>TrxID</th><th>টাকা</th><th>মোবাইল</th><th>তারিখ</th><th></th></tr></thead><tbody>
      ${rows.map(({ s, e }, i) => `<tr><td>${esc(s.name || '')}<br><small class="lx-muted">${esc(s.email)}</small></td><td>${esc(cname(e.course_id))}</td>
        <td>${esc(e.pay_method || '')}</td><td>${esc(e.pay_sender || '')}</td><td><b>${esc(e.pay_trx || '')}</b></td><td>${esc(e.pay_amount || '')}</td>
        <td>${esc(e.phone || '')}</td><td>${fmtDate(e.created_at)}</td>
        <td><div class="lx-row" style="flex-wrap:nowrap"><button class="mb-btn mb-btn--sm" type="button" data-ok="${i}">চালু করুন</button><button class="mb-btn mb-btn--sm lx-btn-danger" type="button" data-no="${i}">বাতিল</button></div></td></tr>`).join('')}
      </tbody></table></div>`}`;
  $$('[data-ok],[data-no]').forEach((b) => b.addEventListener('click', async () => {
    const { s, e } = rows[+(b.dataset.ok ?? b.dataset.no)];
    if (b.dataset.no !== undefined && !confirm(`${s.name || s.email}-এর আবেদন বাতিল করবেন?`)) return;
    try { await setEnrollment(s.id, e.course_id, b.dataset.ok !== undefined ? 'active' : 'rejected'); toast(b.dataset.ok !== undefined ? 'কোর্স চালু হয়েছে।' : 'আবেদন বাতিল হয়েছে।'); }
    catch (err) { return toast(trErr(err), 'err'); }
    refreshRequests(); viewRequests();
  }));
}

// ---------- শিক্ষার্থী ----------
async function viewStudents() {
  await loadCourses();
  const st = await getStudents(true);
  const cname = (id) => courses.find((c) => c.id === id)?.title || '—';
  const pill = { active: 'is-ok', pending: 'is-wait', rejected: 'is-bad' };
  const word = { active: 'চালু', pending: 'অপেক্ষমাণ', rejected: 'বাতিল' };
  view().innerHTML = `<div class="lx-row"><h1 class="lx-h1" style="margin:0">শিক্ষার্থী</h1><span class="lx-spacer"></span>
      <input type="search" id="s-q" placeholder="নাম বা ইমেইল খুঁজুন" aria-label="শিক্ষার্থী খুঁজুন" style="font:inherit;padding:10px 14px;border:1px solid var(--mb-rule);min-width:240px"></div>
    <p class="lx-sub">মোট ${bn(st.length)} জন। কাউকে সরাসরি কোর্সে যোগ করতে “কোর্স যোগ” চাপুন।</p>
    <div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>নাম</th><th>ইমেইল</th><th>যোগদান</th><th>কোর্স ও অগ্রগতি</th><th></th></tr></thead>
    <tbody id="s-body"></tbody></table></div>`;
  const paint = () => {
    const q = $('#s-q').value.trim().toLowerCase();
    const list = st.filter((s) => !q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
    $('#s-body').innerHTML = list.map((s) => `<tr><td>${esc(s.name || '—')}${s.is_admin ? ' <span class="lx-pill">শিক্ষক</span>' : ''}</td><td>${esc(s.email)}</td><td>${fmtDate(s.created_at)}</td>
      <td>${s.enrollments.map((e) => `<div style="margin-bottom:6px">${esc(cname(e.course_id))} <span class="lx-pill ${pill[e.status]}">${word[e.status]}</span>
        ${e.status === 'active' ? ` <small class="lx-muted">${bn(e.done)}/${bn(e.total)}</small>` : ''}
        <select data-set="${s.id}|${e.course_id}" aria-label="অবস্থা বদলান" style="font:inherit;font-size:13px;padding:2px 4px;margin-inline-start:6px"><option value="">বদলান…</option><option value="active">চালু</option><option value="pending">অপেক্ষমাণ</option><option value="rejected">বাতিল</option></select></div>`).join('') || '<span class="lx-muted">—</span>'}</td>
      <td><button class="mb-btn mb-btn--sm mb-btn--ghost" type="button" data-add="${s.id}">কোর্স যোগ</button></td></tr>`).join('') || '<tr><td colspan="5" class="lx-muted">কেউ নেই।</td></tr>';
    $$('[data-set]').forEach((sel) => sel.addEventListener('change', async () => {
      if (!sel.value) return; const [uid, cid] = sel.dataset.set.split('|');
      try { await setEnrollment(uid, cid, sel.value); toast('বদলানো হয়েছে।'); } catch (err) { return toast(trErr(err), 'err'); }
      refreshRequests(); viewStudents();
    }));
    $$('[data-add]').forEach((b) => b.addEventListener('click', () => addToCourse(st.find((s) => s.id === b.dataset.add))));
  };
  $('#s-q').addEventListener('input', paint); paint();
}
function addToCourse(s) {
  const dlg = document.createElement('dialog'); dlg.className = 'lx-dialog';
  dlg.innerHTML = `<form method="dialog" class="lx-form"><h3 style="margin:0;font-family:var(--mb-serif)">${esc(s.name || s.email)} — কোর্সে যোগ</h3>
    <div class="mb-field"><label for="d-c">কোর্স</label><select id="d-c">${courses.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div>
    <div class="lx-row"><button class="mb-btn" value="ok">চালু করে যোগ করুন</button><button class="mb-btn mb-btn--ghost" value="cancel">বাদ দিন</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal();
  dlg.addEventListener('close', async () => {
    const cid = $('#d-c', dlg).value; dlg.remove();
    if (dlg.returnValue !== 'ok') return;
    const { error } = await sb.from('lms_enrollments').upsert({ user_id: s.id, course_id: cid, status: 'active', activated_at: new Date().toISOString(), note: 'শিক্ষক যোগ করেছেন' });
    if (error) return toast(trErr(error), 'err');
    toast('কোর্সে যোগ হয়েছে।'); viewStudents();
  });
}

// ---------- শিক্ষকমণ্ডলী ও শিক্ষার্থীদের মতামত ----------
const SITE_SQL_MSG = '<p class="lx-error">শিক্ষক ও মতামতের টেবিল এখনো তৈরি হয়নি। Supabase → SQL Editor-এ <code>supabase/site.sql</code> ফাইলটি একবার চালান।</p>';
async function refreshReviews() {
  const { count, error } = await sb.from('lms_testimonials').select('id', { count: 'exact', head: true }).eq('approved', false);
  const el = $('#lx-rev-n'); if (!el) return;
  el.hidden = error || !count; if (count) el.textContent = bn(count);
}
async function viewSite() {
  const [t, r] = await Promise.all([
    sb.from('lms_teachers').select('*').order('sort').order('created_at'),
    sb.from('lms_testimonials').select('*').order('approved').order('created_at', { ascending: false }),
  ]);
  if (t.error || r.error) { view().innerHTML = '<h1 class="lx-h1">শিক্ষক ও মতামত</h1>' + SITE_SQL_MSG; return; }
  const teachers = t.data, reviews = r.data;
  view().innerHTML = `<h1 class="lx-h1">শিক্ষকমণ্ডলী</h1>
    <p class="lx-muted">হোমপেজ ও “আমাদের সম্পর্কে” পাতায় এই ক্রমে দেখাবে।</p>
    <div id="lx-teachers">${teachers.map(teacherForm).join('')}</div>
    <button class="mb-btn mb-btn--sm" type="button" id="t-add">+ নতুন শিক্ষক</button>
    <h1 class="lx-h1" style="margin-top:48px">শিক্ষার্থীদের মতামত</h1>
    <p class="lx-muted">শিক্ষার্থীরা “আমার কোর্স” পাতা থেকে মতামত পাঠায়। অনুমোদন দিলে হোমপেজে দেখাবে। WhatsApp-এ পাওয়া আসল মতামতও এখানে নিজে যোগ করতে পারেন।</p>
    <div id="lx-reviews">${reviews.length ? reviews.map(reviewRow).join('') : '<p class="lx-empty">এখনো কোনো মতামত আসেনি।</p>'}</div>
    <details class="lx-card" style="margin-top:18px"><summary><b>+ নিজে মতামত যোগ করুন</b></summary>
      <form class="lx-form" id="r-new" style="margin-top:14px"><div class="lx-grid2">
        <div class="mb-field"><label for="rn-name">শিক্ষার্থীর নাম</label><input id="rn-name" required></div>
        <div class="mb-field"><label for="rn-course">কোর্স</label><input id="rn-course" list="rn-courses"><datalist id="rn-courses">${courses.map((c) => `<option value="${esc(c.title)}">`).join('')}</datalist></div>
        <div class="mb-field"><label for="rn-rating">রেটিং</label><select id="rn-rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${bn(n)} তারা</option>`).join('')}</select></div></div>
        <div class="mb-field"><label for="rn-body">মতামত</label><textarea id="rn-body" rows="4" required minlength="10"></textarea></div>
        <button class="mb-btn mb-btn--sm" type="submit">যোগ ও অনুমোদন</button></form></details>`;
  if (!courses.length) await loadCourses();

  $('#t-add').addEventListener('click', async () => {
    const { error } = await sb.from('lms_teachers').insert({ name: 'নতুন শিক্ষক', sort: teachers.length + 1, published: false });
    if (error) return toast(trErr(error), 'err');
    viewSite();
  });
  $$('[data-teacher]').forEach((f) => {
    const id = f.dataset.teacher; let photo = teachers.find((x) => x.id === id).photo_url;
    $('[data-photo]', f).addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const path = `teachers/${id}-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const { error } = await sb.storage.from('lms-public').upload(path, file, { contentType: file.type, upsert: true });
      if (error) return toast(trErr(error), 'err');
      photo = publicUrl(path); $('[data-prev]', f).innerHTML = `<img src="${esc(photo)}" alt="">`;
      toast('ছবি আপলোড হয়েছে — সংরক্ষণ চাপুন।');
    });
    $('[data-nophoto]', f)?.addEventListener('click', () => { photo = null; $('[data-prev]', f).innerHTML = '<span>ছবি নেই</span>'; });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (n) => f.elements[n].value.trim();
      const { error } = await sb.from('lms_teachers').update({
        name: v('name'), role: v('role') || null, bio: v('bio') || null, sort: Number(v('sort')) || 0,
        published: f.elements.published.checked, photo_url: photo,
      }).eq('id', id);
      if (error) return toast(trErr(error), 'err');
      toast('সংরক্ষিত হয়েছে।');
    });
    $('[data-tdel]', f).addEventListener('click', async () => {
      if (!confirm('এই শিক্ষককে তালিকা থেকে মুছবেন?')) return;
      const { error } = await sb.from('lms_teachers').delete().eq('id', id);
      if (error) return toast(trErr(error), 'err');
      viewSite();
    });
  });

  $$('[data-review]').forEach((row) => {
    const id = row.dataset.review;
    $('[data-approve]', row)?.addEventListener('click', async (e) => {
      const on = e.target.dataset.approve === '1';
      const { error } = await sb.from('lms_testimonials').update({ approved: on }).eq('id', id);
      if (error) return toast(trErr(error), 'err');
      toast(on ? 'অনুমোদিত — হোমপেজে দেখাবে।' : 'লুকানো হয়েছে।'); refreshReviews(); viewSite();
    });
    $('[data-rdel]', row).addEventListener('click', async () => {
      if (!confirm('মতামতটি মুছবেন?')) return;
      const { error } = await sb.from('lms_testimonials').delete().eq('id', id);
      if (error) return toast(trErr(error), 'err');
      refreshReviews(); viewSite();
    });
  });

  $('#r-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('lms_testimonials').insert({
      name: $('#rn-name').value.trim(), course_title: $('#rn-course').value.trim() || null,
      rating: Number($('#rn-rating').value), body: $('#rn-body').value.trim(), approved: true,
    });
    if (error) return toast(trErr(error), 'err');
    toast('মতামত যোগ হয়েছে।'); viewSite();
  });
}
function teacherForm(t) {
  return `<form class="lx-card lx-form" data-teacher="${t.id}">
    <div class="lx-row" style="align-items:flex-start">
      <div class="lx-tphoto" data-prev>${t.photo_url ? `<img src="${esc(t.photo_url)}" alt="">` : '<span>ছবি নেই</span>'}</div>
      <div style="flex:1;min-width:240px" class="lx-form">
        <div class="lx-grid2">
          <div class="mb-field"><label>নাম</label><input name="name" required value="${esc(t.name)}"></div>
          <div class="mb-field"><label>পদবি / দায়িত্ব</label><input name="role" placeholder="যেমন: নাহু ও সরফের শিক্ষক" value="${esc(t.role || '')}"></div>
        </div>
        <div class="mb-field"><label>পরিচিতি</label><textarea name="bio" rows="3">${esc(t.bio || '')}</textarea></div>
        <div class="lx-row">
          <label class="mb-field" style="max-width:120px"><span>ক্রম</span><input name="sort" type="number" value="${t.sort}"></label>
          <label class="lx-check"><input type="checkbox" name="published"${t.published ? ' checked' : ''}> সাইটে দেখাবে</label>
          <label class="mb-btn mb-btn--sm mb-btn--ghost" style="cursor:pointer">ছবি বদলান<input type="file" accept="image/*" data-photo hidden></label>
          ${t.photo_url ? '<button class="lx-link" type="button" data-nophoto>ছবি সরান</button>' : ''}
        </div>
      </div></div>
    <div class="lx-row"><button class="mb-btn mb-btn--sm" type="submit">সংরক্ষণ</button><span class="lx-spacer"></span>
      <button class="mb-btn mb-btn--sm lx-btn-danger" type="button" data-tdel>মুছুন</button></div></form>`;
}
function reviewRow(r) {
  return `<div class="lx-card lx-review" data-review="${r.id}">
    <div class="lx-row"><b>${esc(r.name)}</b>${r.course_title ? `<span class="lx-muted">· ${esc(r.course_title)}</span>` : ''}
      ${r.rating ? `<span class="mb-stars">${'★'.repeat(r.rating)}</span>` : ''}<span class="lx-spacer"></span>
      <span class="lx-pill ${r.approved ? 'is-ok' : 'is-wait'}">${r.approved ? 'সাইটে দেখাচ্ছে' : 'অনুমোদনের অপেক্ষায়'}</span></div>
    <p style="margin:10px 0">${esc(r.body)}</p>
    <div class="lx-row"><span class="lx-muted" style="font-size:14px">${fmtDate(r.created_at)}${r.user_id ? '' : ' · শিক্ষক যোগ করেছেন'}</span><span class="lx-spacer"></span>
      ${r.approved ? '<button class="mb-btn mb-btn--sm mb-btn--ghost" type="button" data-approve="0">লুকান</button>' : '<button class="mb-btn mb-btn--sm" type="button" data-approve="1">অনুমোদন দিন</button>'}
      <button class="mb-btn mb-btn--sm lx-btn-danger" type="button" data-rdel>মুছুন</button></div></div>`;
}

// ---------- পুরোনো কোর্স আমদানি ----------
const LEGACY = [
  { key: 'hatekhori', title: 'আরবি ভাষার হাতেখড়ি', note: '১০ অধ্যায়ের সব দরস অনুশীলনসহ আসবে। আগের ব্যবস্থায় যারা হাতেখড়িতে আবেদন করেছিল বা অনুমোদন পেয়েছিল, তারাও চলে আসবে।' },
  { key: 'nahw', title: 'নাহুর সহজ পাঠ', note: '৩৬টি দরস নিজস্ব অনুশীলনসহ আসবে। আগের অনুমোদিত/আবেদনকারী শিক্ষার্থী ও তাদের অগ্রগতিও চলে আসবে।' },
];
async function viewImport() {
  await loadCourses();
  view().innerHTML = `<h1 class="lx-h1">পুরোনো কোর্স আমদানি</h1>
    <p class="lx-sub">আগের আলাদা ব্যবস্থার কোর্স নতুন ড্যাশবোর্ডে আনুন। আমদানির পর সব দরস এখান থেকেই সম্পাদনা করা যাবে। একই কোর্স আবার আমদানি করলে দরসের লেখা হালনাগাদ হবে, নতুন কপি তৈরি হবে না।</p>
    ${LEGACY.map((x) => { const ex = courses.find((c) => c.legacy_key === x.key); return `<div class="lx-card"><h3>${x.title}</h3><p>${x.note}</p>
      ${ex ? `<p class="lx-pill is-ok">আমদানি হয়েছে</p> ` : ''}<div class="lx-row"><button class="mb-btn" type="button" data-imp="${x.key}">${ex ? 'আবার আমদানি (হালনাগাদ)' : 'আমদানি করুন'}</button>
      ${ex ? `<a class="mb-btn mb-btn--ghost" href="#course/${ex.id}">কোর্স দেখুন</a>` : ''}</div><p class="lx-muted" data-log="${x.key}"></p></div>`; }).join('')}`;
  $$('[data-imp]').forEach((b) => b.addEventListener('click', () => importLegacy(b.dataset.imp, b)));
}
async function importLegacy(key, btn) {
  const log = $(`[data-log="${key}"]`); const say = (t) => { log.textContent = t; };
  btn.disabled = true;
  try {
    say('পুরোনো কোর্সের তথ্য আনা হচ্ছে…');
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch('/api/admin/legacy?course=' + key, { headers: { Authorization: 'Bearer ' + session.access_token } });
    if (!r.ok) throw new Error('তথ্য আনা যায়নি (' + r.status + ')');
    const pkg = await r.json();
    say('কোর্স তৈরি হচ্ছে…');
    let course = (await must(sb.from('lms_courses').select('id').eq('legacy_key', key))).at(0);
    if (!course) course = await must(sb.from('lms_courses').insert({ ...pkg.course, legacy_key: key }).select('id').single());
    else await must(sb.from('lms_courses').update({ theme_css: pkg.course.theme_css, theme_js: pkg.course.theme_js }).eq('id', course.id));
    const oldCh = await must(sb.from('lms_chapters').select('id,legacy_key').eq('course_id', course.id));
    const oldLs = await must(sb.from('lms_lessons').select('id,legacy_key').eq('course_id', course.id));
    let n = 0, total = pkg.chapters.reduce((a, ch) => a + ch.lessons.length, 0);
    for (const [ci, ch] of pkg.chapters.entries()) {
      let chRow = oldCh.find((x) => x.legacy_key === ch.key);
      if (!chRow) chRow = await must(sb.from('lms_chapters').insert({ course_id: course.id, title: ch.title, sort: ci + 1, legacy_key: ch.key }).select('id').single());
      for (const [li, ls] of ch.lessons.entries()) {
        n++; say(`দরস আমদানি: ${bn(n)}/${bn(total)} — ${ls.title}`);
        const row = { course_id: course.id, chapter_id: chRow.id, title: ls.title, sort: li + 1, body_html: ls.body_html, completion: ls.completion, published: true, legacy_key: ls.key };
        const ex = oldLs.find((x) => x.legacy_key === ls.key);
        if (ex) await must(sb.from('lms_lessons').update({ body_html: ls.body_html, completion: ls.completion }).eq('id', ex.id));
        else await must(sb.from('lms_lessons').insert(row));
      }
    }
    say('পুরোনো ভর্তি ও অগ্রগতি আনা হচ্ছে…');
    const res = await must(sb.rpc('lms_admin_migrate', { p_key: key, p_course: course.id }));
    say(`সম্পন্ন: ${bn(total)} দরস, ${bn(res.enrollments)}টি ভর্তি${key === 'nahw' ? `, ${bn(res.progress)}টি অগ্রগতির রেকর্ড` : ''}।`);
    toast('আমদানি সম্পন্ন হয়েছে।');
    setTimeout(viewImport, 1800);
  } catch (e) { say(''); toast(trErr(e), 'err'); btn.disabled = false; }
}

boot();
