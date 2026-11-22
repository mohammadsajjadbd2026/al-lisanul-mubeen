// সার্টিফিকেট তৈরি/দেখা এবং যে কেউ কোড দিয়ে যাচাই করতে পারে
import { sb, $, esc, bn, qs, trErr, paintHeader, wireNav, fmtDate } from './lms.js';

const app = $('#lx-app');
wireNav(); paintHeader();
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = bn(new Date().getFullYear())));

function certHTML(x) {
  const link = `${location.origin}/verify?code=${encodeURIComponent(x.code)}`;
  return `<div class="lx-cert">
    <img class="lx-cert__logo" src="/assets/img/logo.svg" alt="আল-লিসানুল মুবীন">
    <p class="lx-cert__meta" style="letter-spacing:.08em">সনদপত্র · شهادة إتمام</p>
    <p style="margin:8px 0 0">এই মর্মে প্রত্যয়ন করা যাচ্ছে যে</p>
    <p class="lx-cert__name">${esc(x.name)}</p>
    <p style="margin:0">সফলভাবে সম্পন্ন করেছেন</p>
    <p class="lx-cert__course">${esc(x.course)}</p>
    <p class="lx-cert__meta">তারিখ: ${fmtDate(x.issued_at)} · সনদ নং: ${esc(x.code)}</p>
    <p class="lx-cert__meta" style="margin-top:18px">শিক্ষক: মুহাম্মাদ সাজ্জাদ ইউনুস</p>
    <p class="lx-cert__meta" style="font-size:13px">যাচাই: ${esc(link)}</p>
  </div>`;
}

async function certificate() {
  const slug = qs('c');
  const { data: c, error: e1 } = await sb.rpc('lms_get_course', { p_slug: slug || '' });
  if (e1 || !c) { app.innerHTML = '<p class="lx-error">কোর্স পাওয়া যায়নি।</p>'; return; }
  const { data, error } = await sb.rpc('lms_claim_certificate', { p_course: c.course.id });
  if (error) {
    app.innerHTML = `<div class="lx-narrow lx-center"><h1 class="lx-h1">সার্টিফিকেট</h1><p class="lx-note">${esc(trErr(error))}</p>
      <a class="mb-btn mb-btn--ghost" href="/course?c=${esc(slug)}">কোর্সের পাতায় ফিরুন</a></div>`;
    return;
  }
  app.innerHTML = `${certHTML(data)}
    <div class="lx-row lx-noprint" style="justify-content:center;margin-top:24px">
      <button class="mb-btn" type="button" onclick="window.print()">প্রিন্ট / PDF হিসেবে সংরক্ষণ</button>
      <a class="mb-btn mb-btn--ghost" href="/verify?code=${encodeURIComponent(data.code)}">যাচাইয়ের লিংক</a>
    </div>
    <p class="lx-muted lx-center lx-noprint">নাম ভুল থাকলে "আমার কোর্স" পাতা থেকে নাম ঠিক করে নিন — নতুন নাম পরের সার্টিফিকেটে যাবে; এটির জন্য শিক্ষকের সাথে যোগাযোগ করুন।</p>`;
}

async function verify() {
  const code = qs('code') || '';
  app.innerHTML = `<div class="lx-narrow"><h1 class="lx-h1 lx-center">সার্টিফিকেট যাচাই</h1>
    <form class="lx-form lx-card" id="vf"><div class="mb-field"><label for="v-code">সনদ নম্বর</label><input id="v-code" value="${esc(code)}" autocapitalize="characters" spellcheck="false" required></div>
    <button class="mb-btn" type="submit">যাচাই করুন</button></form></div><div id="vr" style="margin-top:28px"></div>`;
  const run = async (c) => {
    const { data, error } = await sb.rpc('lms_verify_certificate', { p_code: c.trim() });
    $('#vr').innerHTML = error ? `<p class="lx-error">${esc(trErr(error))}</p>`
      : !data ? '<p class="lx-error lx-narrow">এই নম্বরে কোনো সার্টিফিকেট পাওয়া যায়নি।</p>'
      : `<p class="lx-result is-pass lx-narrow lx-center">✓ সার্টিফিকেটটি সঠিক</p>${certHTML(data)}`;
  };
  $('#vf').addEventListener('submit', (e) => { e.preventDefault(); run($('#v-code').value); });
  if (code) run(code);
}

if (app.dataset.mode === 'verify') verify(); else certificate();
