// দরস প্লেয়ার: ভিডিও + লেখা (সুরক্ষিত ফ্রেমে) + ফাইল + কুইজ + অগ্রগতি
import { sb, $, $$, esc, bn, qs, toast, trErr, paintHeader, wireNav, youtubeEmbed, fileUrl, fmtSize } from './lms.js';
import { outlineHTML } from './lms-outline.js';

const app = $('#lx-app');
const id = qs('id');
wireNav();
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = bn(new Date().getFullYear())));

// ফ্রেমের ভেতরের মূল নকশা — কোর্সের নিজস্ব CSS এর পরে যোগ হয়
const FRAME_BASE = `
html{font-size:17px}body{margin:0;padding:2px 2px 8px;font-family:'Hind Siliguri','Noto Sans Bengali',sans-serif;color:#2B1D16;line-height:1.8;background:transparent}
h1,h2,h3{font-family:'Noto Serif Bengali',serif;line-height:1.4}h1{font-size:1.7rem}h2{font-size:1.35rem}
img,video,svg{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #DCCBAA;padding:6px 10px}
[dir=rtl],.ar,[lang=ar]{font-family:'Amiri',serif}
blockquote{margin:12px 0;padding:8px 16px;border-inline-start:3px solid #B89C6B;background:#FBF6EC}
a{color:#7A1F2B}`;

const BRIDGE = `(function(){
  var last=0;function send(){var h=Math.ceil(document.documentElement.scrollHeight);if(Math.abs(h-last)>2){last=h;parent.postMessage({type:'lx-h',h:h},'*')}}
  if(window.ResizeObserver)new ResizeObserver(send).observe(document.body);window.addEventListener('load',send);setInterval(send,800);
  window.LMS={report:function(p){parent.postMessage({type:'lx-score',pct:Math.max(0,Math.min(100,Math.round(+p||0)))},'*')}};
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;e.preventDefault();var t=document.getElementById(a.getAttribute('href').slice(1));if(t)t.scrollIntoView({behavior:'smooth'})});
})();`;

function frameDoc(lesson) {
  // @import (ফন্ট) নিয়মগুলো CSS-এর একদম শুরুতে থাকতে হয়
  const theme = lesson.course.theme_css || '';
  const imports = (theme.match(/@import[^;]+;/g) || []).join('\n');
  const css = (imports + '\n' + FRAME_BASE + '\n' + theme.replace(/@import[^;]+;/g, '')).replace(/<\/style/gi, '<\\/style');
  const js = (lesson.course.theme_js || '').replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Serif+Bengali:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap">
<style>${css}</style></head><body><main class="lx-body">${lesson.body_html || ''}</main>
<script>${BRIDGE}<\/script>${js ? `<script>${js}<\/script>` : ''}</body></html>`;
}

const STATE_MSG = {
  login: ['এই দরস দেখতে আগে প্রবেশ করুন।', (d) => `<a class="mb-btn" href="/learn?next=${encodeURIComponent(location.pathname + location.search)}">প্রবেশ করুন</a>`],
  not_enrolled: ['এই দরস কোর্সে ভর্তি হওয়া শিক্ষার্থীদের জন্য।', (d) => `<a class="mb-btn" href="/course?c=${esc(d.course_slug)}">কোর্সের পাতা ও ভর্তি</a>`],
  pending: ['আপনার ভর্তির আবেদন যাচাই চলছে — চালু হলে দরসগুলো খুলে যাবে।', (d) => `<a class="mb-btn mb-btn--ghost" href="/course?c=${esc(d.course_slug)}">কোর্সের পাতা</a>`],
  locked: ['আগের দরস শেষ করলে এই দরস খুলবে।', (d) => `<a class="mb-btn mb-btn--ghost" href="/course?c=${esc(d.course_slug)}">পাঠ্যসূচিতে ফিরুন</a>`],
  missing: ['দরসটি পাওয়া যায়নি।', () => '<a class="mb-btn mb-btn--ghost" href="/learn">আমার কোর্স</a>'],
};

let lesson, course;

async function render() {
  paintHeader();
  if (!id) return gate({ state: 'missing' });
  const { data, error } = await sb.rpc('lms_get_lesson', { p_lesson: id });
  if (error) { app.innerHTML = `<p class="lx-error">${esc(trErr(error))}</p>`; return; }
  if (data.state !== 'ok') return gate(data);
  lesson = data;
  document.title = lesson.title + ' — ' + lesson.course.title;
  const { data: cdata } = await sb.rpc('lms_get_course', { p_slug: lesson.course.slug });
  course = cdata;

  app.innerHTML = `
  <div class="lx-player">
    <article class="lx-player__main">
      <p class="lx-crumb"><a href="/course?c=${esc(lesson.course.slug)}">${esc(lesson.course.title)}</a>${lesson.chapter ? ' · ' + esc(lesson.chapter) : ''}</p>
      <h1 class="lx-h1">${esc(lesson.title)}</h1>
      ${lesson.youtube_id ? youtubeEmbed(lesson.youtube_id) : ''}
      ${lesson.body_html ? '<iframe class="lx-frame" id="lx-frame" title="দরসের লেখা" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe>' : ''}
      ${lesson.files.length ? `<section class="lx-card" style="margin-top:24px"><h2>দরসের উপকরণ</h2><ul class="lx-files">${lesson.files.map((f) => `<li><span>${esc(f.name)} <small class="lx-muted">${fmtSize(f.size)}</small></span><span class="lx-row"><button class="mb-btn mb-btn--sm mb-btn--ghost" type="button" data-open="${esc(f.path)}">খুলুন</button><button class="mb-btn mb-btn--sm" type="button" data-dl="${esc(f.path)}">ডাউনলোড</button></span></li>`).join('')}</ul></section>` : ''}
      ${lesson.quiz.length ? quizHTML() : ''}
      <div id="lx-status" style="margin-top:24px"></div>
      <div class="lx-nextprev">
        ${lesson.prev ? `<a class="mb-btn mb-btn--ghost" href="/lesson?id=${lesson.prev}">← আগের দরস</a>` : '<span></span>'}
        ${lesson.next ? `<a class="mb-btn" id="lx-next" href="/lesson?id=${lesson.next}">পরের দরস →</a>` : `<a class="mb-btn mb-btn--ghost" href="/course?c=${esc(lesson.course.slug)}">কোর্সের পাতা</a>`}
      </div>
    </article>
    <aside class="lx-player__side" aria-label="পাঠ্যসূচি">${course ? outlineHTML(course, lesson.id) : ''}</aside>
  </div>`;

  if (lesson.body_html) $('#lx-frame').srcdoc = frameDoc(lesson);
  $$('[data-dl],[data-open]', app).forEach((b) => b.addEventListener('click', async () => {
    try {
      const url = await fileUrl(b.dataset.dl || b.dataset.open, !!b.dataset.dl);
      if (b.dataset.dl) location.href = url; else window.open(url, '_blank', 'noopener');
    } catch (e) { toast(trErr(e), 'err'); }
  }));
  if (lesson.quiz.length) $('#lx-quiz').addEventListener('submit', submitQuiz);
  paintStatus();
  $('.lx-outline__ls.is-current')?.scrollIntoView({ block: 'center' });
}

function gate(d) {
  const [msg, act] = STATE_MSG[d.state] || STATE_MSG.missing;
  app.innerHTML = `<div class="lx-narrow lx-center"><h1 class="lx-h1">${esc(d.title || 'দরস')}</h1><p class="lx-note" style="margin:18px 0">${msg}</p>${act(d)}</div>`;
}

function paintStatus() {
  const p = lesson.progress || {};
  const box = $('#lx-status');
  if (p.completed) {
    box.innerHTML = `<p class="lx-result is-pass">এই দরস সম্পন্ন হয়েছে${lesson.completion !== 'manual' ? ` — সর্বোচ্চ নম্বর ${bn(p.best_score)}%` : ''}।</p>`;
    return;
  }
  if (lesson.completion === 'manual') {
    box.innerHTML = '<button class="mb-btn" type="button" id="lx-done">দরস সম্পন্ন হয়েছে ✓</button>';
    $('#lx-done').addEventListener('click', async () => {
      const { data, error } = await sb.rpc('lms_complete_lesson', { p_lesson: lesson.id });
      if (error) return toast(trErr(error), 'err');
      lesson.progress = data; toast('সম্পন্ন! পরের দরস খুলে গেছে।'); refreshOutline(); paintStatus();
    });
  } else if (lesson.completion === 'embedded') {
    box.innerHTML = `<p class="lx-note">দরসের অনুশীলনে অন্তত ${bn(lesson.course.pass_mark)}% পেলে দরসটি সম্পন্ন হবে${p.best_score ? ` (এখন পর্যন্ত সর্বোচ্চ ${bn(p.best_score)}%)` : ''}।</p>`;
  } else {
    box.innerHTML = `<p class="lx-note">নিচের টেস্টে অন্তত ${bn(lesson.course.pass_mark)}% পেলে দরসটি সম্পন্ন হবে।</p>`;
  }
}

async function refreshOutline() {
  const { data } = await sb.rpc('lms_get_course', { p_slug: lesson.course.slug });
  if (data) { course = data; $('.lx-player__side').innerHTML = outlineHTML(course, lesson.id); }
}

// ---------- কুইজ ----------
function quizHTML() {
  return `<section class="lx-card lx-quiz" style="margin-top:24px"><h2>দরসের টেস্ট</h2>
  <form id="lx-quiz"><ol>${lesson.quiz.map((q) => `<li class="lx-q" data-q="${q.id}">
    <p class="lx-q__t">${esc(q.question)}</p>
    ${q.options.map((o, i) => `<label class="lx-opt"><input type="radio" name="q-${q.id}" value="${i}" required> <span>${esc(o)}</span></label>`).join('')}
    <p class="lx-q__ex" hidden></p></li>`).join('')}</ol>
  <div class="lx-row" style="margin-top:18px"><button class="mb-btn" type="submit">জমা দিন</button></div>
  <div id="lx-qres"></div></form></section>`;
}

async function submitQuiz(e) {
  e.preventDefault();
  const answers = {};
  lesson.quiz.forEach((q) => { const c = $(`input[name="q-${q.id}"]:checked`); if (c) answers[q.id] = c.value; });
  const btn = $('#lx-quiz button[type=submit]'); btn.disabled = true;
  const { data, error } = await sb.rpc('lms_submit_quiz', { p_lesson: lesson.id, p_answers: answers });
  btn.disabled = false;
  if (error) return toast(trErr(error), 'err');
  lesson.quiz.forEach((q) => {
    const d = data.detail[q.id]; const li = $(`[data-q="${q.id}"]`);
    $$('label.lx-opt', li).forEach((lab, i) => { lab.classList.toggle('is-right', i === d.correct); lab.classList.toggle('is-wrong', String(i) === answers[q.id] && i !== d.correct); });
    const ex = $('.lx-q__ex', li); if (d.explanation) { ex.textContent = d.explanation; ex.hidden = false; }
  });
  $('#lx-qres').innerHTML = `<p class="lx-result ${data.passed ? 'is-pass' : 'is-fail'}">${bn(data.total)}টির মধ্যে ${bn(data.right)}টি সঠিক — ${bn(data.score)}%। ${data.passed ? 'মাশাআল্লাহ, উত্তীর্ণ!' : `উত্তীর্ণ হতে ${bn(data.pass_mark)}% লাগবে — আবার চেষ্টা করুন।`}</p>`;
  btn.textContent = 'আবার চেষ্টা করুন';
  lesson.progress = { best_score: data.best_score, completed: data.completed };
  paintStatus(); if (data.completed) refreshOutline();
}

// ---------- ফ্রেমের বার্তা ----------
window.addEventListener('message', async (e) => {
  const fr = $('#lx-frame');
  if (!fr || e.source !== fr.contentWindow || !e.data) return;
  if (e.data.type === 'lx-h') fr.style.height = Math.min(Math.max(+e.data.h || 0, 120), 60000) + 'px';
  if (e.data.type === 'lx-score' && lesson.completion === 'embedded') {
    const pct = +e.data.pct;
    if (lesson.progress && lesson.progress.best_score >= pct && lesson.progress.completed) return;
    const { data, error } = await sb.rpc('lms_report_score', { p_lesson: lesson.id, p_score: pct });
    if (error) return toast(trErr(error), 'err');
    const was = lesson.progress?.completed; lesson.progress = data; paintStatus();
    if (data.completed && !was) { toast('দরস সম্পন্ন! পরের দরস খুলে গেছে।'); refreshOutline(); }
  }
});

render();
