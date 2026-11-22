// কোর্সের পাতা: বিবরণ, পাঠ্যসূচি, ভর্তি/চালিয়ে যাওয়া
import { sb, $, esc, bn, money, qs, sanitize, toast, trErr, getProfile, paintHeader, posterHTML, wireNav, fileUrl, fmtSize } from './lms.js';
import { outlineHTML } from './lms-outline.js';

const S = window.SITE || {};
const app = $('#lx-app');
const slug = qs('c');
wireNav();
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = bn(new Date().getFullYear())));

async function render() {
  paintHeader();
  if (!slug) { app.innerHTML = '<p class="lx-error">কোর্স পাওয়া যায়নি।</p>'; return; }
  const { data, error } = await sb.rpc('lms_get_course', { p_slug: slug });
  if (error || !data) { app.innerHTML = `<p class="lx-error">${esc(error ? trErr(error) : 'কোর্স পাওয়া যায়নি।')}</p>`; return; }
  const c = data.course;
  document.title = c.title + ' — আল-লিসানুল মুবীন';
  const profile = await getProfile();
  const total = data.lessons.length, done = data.lessons.filter((l) => l.completed).length;
  const pct = total ? Math.round((100 * done) / total) : 0;

  app.innerHTML = `
  <section class="lx-hero">
    <div class="lx-hero__media">${posterHTML(c)}</div>
    <div class="lx-hero__info">
      ${c.level ? `<p class="mb-course__level">${esc(c.level)}</p>` : ''}
      <h1 class="lx-h1">${esc(c.title)}</h1>
      ${c.subtitle ? `<p class="mb-hero__text" style="text-align:start;margin:0">${esc(c.subtitle)}</p>` : ''}
      <p class="lx-muted" style="margin:0">${bn(data.chapters.length)} অধ্যায় · ${bn(total)} দরস${c.certificate ? ' · সার্টিফিকেট' : ''}</p>
      ${c.price ? `<p style="margin:0"><span class="mb-price">${money(c.price)}</span> ${c.old_price && c.old_price !== c.price ? `<del class="mb-price-old">${money(c.old_price)}</del>` : ''}</p>` : ''}
      <div id="lx-action"></div>
    </div>
  </section>
  ${c.description ? `<section class="lx-card" style="margin-top:36px"><h2>কোর্স পরিচিতি</h2><div class="lx-prose">${sanitize(c.description)}</div></section>` : ''}
  ${data.materials.length ? `<section class="lx-card"><h2>কোর্সের উপকরণ</h2><ul class="lx-files">${data.materials.map((f) => `<li><span>${esc(f.name)} <small class="lx-muted">${fmtSize(f.size)}</small></span><button class="mb-btn mb-btn--sm mb-btn--ghost" type="button" data-file="${esc(f.path)}">ডাউনলোড</button></li>`).join('')}</ul></section>` : ''}
  <section class="lx-card"><h2>পাঠ্যসূচি</h2>${total ? outlineHTML(data) : '<p class="lx-muted">দরস শীঘ্রই যোগ হবে।</p>'}</section>`;

  app.querySelectorAll('[data-file]').forEach((b) => b.addEventListener('click', async () => {
    try { location.href = await fileUrl(b.dataset.file); } catch (e) { toast(trErr(e), 'err'); }
  }));

  const act = $('#lx-action');
  const firstOpen = data.lessons.find((l) => l.state === 'ok' && !l.completed) || data.lessons.find((l) => l.state === 'ok');
  if (data.enrollment === 'active' || data.is_admin) {
    act.innerHTML = `<div class="lx-bar"><i style="width:${pct}%"></i></div><p class="lx-muted" style="margin:6px 0 14px">${bn(done)} / ${bn(total)} দরস সম্পন্ন</p>
      <div class="lx-row">${firstOpen ? `<a class="mb-btn" href="/lesson?id=${firstOpen.id}">${done ? 'চালিয়ে যান' : 'শুরু করুন'}</a>` : ''}
      ${c.certificate && total && done === total ? `<a class="mb-btn mb-btn--ghost" href="/certificate?c=${esc(c.slug)}">সার্টিফিকেট নিন</a>` : ''}</div>`;
  } else if (data.enrollment === 'pending') {
    act.innerHTML = '<p class="lx-note">আপনার ভর্তির আবেদন পাওয়া গেছে — পেমেন্ট যাচাইয়ের পর কোর্স চালু হবে, ইনশাআল্লাহ।</p>';
  } else if (c.status === 'soon') {
    act.innerHTML = `<p class="lx-note">কোর্সটি শীঘ্রই চালু হবে।</p>${S.whatsapp ? `<a class="mb-btn mb-btn--ghost" href="https://wa.me/${S.whatsapp}?text=${encodeURIComponent(`আসসালামু আলাইকুম। "${c.title}" কোর্স চালু হলে আমাকে জানাবেন।\nআমার নাম: `)}" rel="noopener">আগ্রহী তালিকায় নাম দিন</a>` : ''}`;
  } else if (c.status !== 'open') {
    act.innerHTML = '<p class="lx-note">এই কোর্সে এখন ভর্তি বন্ধ।</p>';
  } else if (!profile) {
    act.innerHTML = `<p style="margin:0 0 10px">ভর্তি হতে আগে অ্যাকাউন্ট খুলুন বা প্রবেশ করুন।</p><a class="mb-btn" href="/learn?next=${encodeURIComponent('/course?c=' + c.slug)}">প্রবেশ / অ্যাকাউন্ট খুলুন</a>`;
  } else {
    act.innerHTML = `<button class="mb-btn" id="lx-enroll" type="button">ভর্তি হোন</button>`;
    $('#lx-enroll').addEventListener('click', () => enrollForm(c, profile));
  }
  if (firstOpen && data.enrollment !== 'active' && data.lessons.some((l) => l.is_preview)) {
    act.insertAdjacentHTML('beforeend', `<p style="margin:12px 0 0"><a href="/lesson?id=${data.lessons.find((l) => l.is_preview).id}">বিনামূল্যে প্রথম দরস দেখুন →</a></p>`);
  }
}

function enrollForm(c, profile) {
  const pay = [['বিকাশ', S.bkash], ['নগদ', S.nagad], ['ব্যাংক', S.bank]].filter((x) => x[1]);
  $('#lx-action').innerHTML = `
  <div class="lx-card">
    <h3>১. ফি পাঠান: ${money(c.price) || ''}</h3>
    <ul class="mb-paylist">${pay.map(([k, v]) => `<li><b>${k}${k !== 'ব্যাংক' ? ' (Send Money)' : ''}</b><span>${esc(bn(v))}</span></li>`).join('')}</ul>
    <h3 style="margin-top:18px">২. তথ্য দিন</h3>
    <form class="lx-form" id="lx-ef">
      <div class="lx-grid2">
        <div class="mb-field"><label for="e-m">পেমেন্ট মাধ্যম</label><select id="e-m" required>${pay.map(([k]) => `<option>${k}</option>`).join('')}</select></div>
        <div class="mb-field"><label for="e-a">পাঠানো টাকা</label><input id="e-a" inputmode="numeric" required value="${c.price ? esc(c.price) : ''}"></div>
        <div class="mb-field"><label for="e-s">যে নম্বর/হিসাব থেকে পাঠিয়েছেন</label><input id="e-s" inputmode="tel" required></div>
        <div class="mb-field"><label for="e-t">ট্রানজেকশন আইডি (TrxID)</label><input id="e-t" autocapitalize="characters" spellcheck="false" required></div>
        <div class="mb-field"><label for="e-p">আপনার মোবাইল / WhatsApp</label><input id="e-p" inputmode="tel" autocomplete="tel" required></div>
      </div>
      <button class="mb-btn" type="submit">আবেদন জমা দিন</button>
    </form>
  </div>`;
  $('#lx-ef').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#lx-ef button'); b.disabled = true;
    const v = (id) => $(id).value.trim();
    const { error } = await sb.rpc('lms_request_enrollment', {
      p_course: c.id, p_method: v('#e-m'), p_sender: v('#e-s'), p_trx: v('#e-t'), p_amount: v('#e-a'), p_phone: v('#e-p'), p_note: null,
    });
    if (error) { b.disabled = false; return toast(trErr(error), 'err'); }
    const msg = `আসসালামু আলাইকুম। "${c.title}" কোর্সে ভর্তির আবেদন করেছি।\nনাম: ${profile.full_name || ''}\nইমেইল: ${profile.email}\nমাধ্যম: ${v('#e-m')}\nTrxID: ${v('#e-t')}\nটাকা: ${v('#e-a')}`;
    $('#lx-action').innerHTML = `<p class="lx-note">আবেদন জমা হয়েছে। পেমেন্ট যাচাইয়ের পর কোর্স চালু হবে, ইনশাআল্লাহ।</p>
      ${S.whatsapp ? `<a class="mb-btn mb-btn--ghost" href="https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}" rel="noopener">WhatsApp-এ জানিয়ে দিন (দ্রুত যাচাই)</a>` : ''}`;
  });
}

render();
