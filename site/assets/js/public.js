// প্রকাশ্য পাতা (হোম, সকল কোর্স, আমাদের সম্পর্কে, যোগাযোগ, কমিউনিটি, নীতিমালা)
import { sb, $, $$, bn, esc, money, posterHTML, paintHeader, wireNav, waLink } from './lms.js';

const S = window.SITE || {};
paintHeader();
wireNav();

const STATUS = { soon: ['শীঘ্রই', 'mb-badge mb-badge--soon'], open: ['ভর্তি চলছে', 'mb-badge'], closed: ['ভর্তি বন্ধ', 'mb-badge mb-badge--soon'] };
const initial = (name) => (String(name || '').replace(/^(মুহাম্মাদ|মোহাম্মদ|মুহাম্মদ)\s+/, '').trim()[0] || '؟');

// ---------- কোর্স ----------
async function loadCourses() {
  const r = await sb.rpc('lms_public_courses');
  if (!r.error) return r.data || [];
  // site.sql চালানোর আগে: দরস-সংখ্যা ছাড়া
  const { data } = await sb.from('lms_courses').select('slug,title,subtitle,level,price,old_price,poster_url,status,sort').neq('status', 'draft').order('sort');
  return data || [];
}

function courseCard(c) {
  const [label, cls] = STATUS[c.status] || STATUS.open;
  const url = `/course?c=${encodeURIComponent(c.slug)}`;
  const meta = [];
  if (c.chapters) meta.push(`${bn(c.chapters)} অধ্যায়`);
  if (c.lessons) meta.push(`${bn(c.lessons)} দরস`);
  meta.push('রেকর্ডেড কোর্স');
  const discount = c.old_price && c.price && c.old_price > c.price ? Math.round((100 * (c.old_price - c.price)) / c.old_price) : 0;
  return `<article class="mb-course${c.status === 'soon' ? ' mb-course--soon' : ''}">
    <a class="mb-course__media" href="${url}" tabindex="-1" aria-hidden="true">${posterHTML(c)}<em class="${cls}">${label}</em>
      ${discount ? `<em class="mb-off">${bn(discount)}% ছাড়</em>` : ''}</a>
    <div class="mb-course__body">
      ${c.level ? `<p class="mb-course__level">${esc(c.level)}</p>` : ''}
      <h3 class="mb-course__title"><a href="${url}">${esc(c.title)}</a></h3>
      ${c.subtitle ? `<p class="mb-course__excerpt">${esc(c.subtitle)}</p>` : ''}
      <p class="mb-course__meta">${meta.join(' · ')}</p>
      <div class="mb-course__foot">
        <span>${c.price ? `<span class="mb-price">${money(c.price)}</span>` : ''} ${c.old_price && c.old_price !== c.price ? `<del class="mb-price-old">${money(c.old_price)}</del>` : ''}</span>
        <a class="mb-btn mb-btn--sm${c.status === 'open' ? '' : ' mb-btn--ghost'}" href="${url}">${c.status === 'open' ? 'বিস্তারিত ও ভর্তি' : 'বিস্তারিত'}</a>
      </div>
    </div></article>`;
}

async function paintCourses() {
  const grids = $$('[data-courses]');
  const stats = $$('[data-stat]');
  if (!grids.length && !stats.length) return;
  const list = await loadCourses();
  grids.forEach((g) => {
    const n = Number(g.dataset.courses) || 0;
    const items = n ? list.slice(0, n) : list;
    g.innerHTML = items.length ? items.map(courseCard).join('') : '<p class="mb-empty">শিগগিরই নতুন কোর্স আসছে।</p>';
  });
  const total = list.reduce((a, c) => a + Number(c.lessons || 0), 0);
  stats.forEach((el) => {
    if (el.dataset.stat === 'courses' && list.length) el.textContent = bn(list.length);
    if (el.dataset.stat === 'lessons' && total) el.textContent = bn(Math.floor(total / 10) * 10) + '+';
  });
}

// ---------- শিক্ষকমণ্ডলী ----------
async function paintTeachers() {
  const box = $('[data-teachers]'); if (!box) return;
  const { data, error } = await sb.from('lms_teachers').select('name,role,bio,photo_url').eq('published', true).order('sort');
  const list = !error && data?.length ? data : (S.teachers || []);
  box.classList.toggle('is-single', list.length === 1);
  box.innerHTML = list.map((t) => `<article class="mb-tcard">
    ${t.photo_url ? `<img class="mb-tcard__photo" src="${esc(t.photo_url)}" alt="" loading="lazy">` : `<div class="mb-tcard__photo mb-tcard__photo--empty" aria-hidden="true"><span>${esc(initial(t.name))}</span></div>`}
    <div class="mb-tcard__body"><h3>${esc(t.name)}</h3>${t.role ? `<p class="mb-tcard__role">${esc(t.role)}</p>` : ''}
    ${t.bio ? `<p class="mb-tcard__bio">${esc(t.bio)}</p>` : ''}</div></article>`).join('');
}

// ---------- শিক্ষার্থীদের অভিব্যক্তি ----------
async function paintReviews() {
  const box = $('[data-testimonials]'); if (!box) return;
  const { data, error } = await sb.from('lms_testimonials').select('name,course_title,body,rating').eq('approved', true).order('sort').order('created_at', { ascending: false }).limit(9);
  if (error || !data?.length) {
    box.innerHTML = `<div class="mb-reviews__empty"><span class="mb-quote" aria-hidden="true">❝</span>
      <p>প্রথম ব্যাচের শিক্ষার্থীদের অভিজ্ঞতা শিগগিরই এখানে দেখা যাবে।</p>
      <p class="mb-muted">ভর্তি থাকা শিক্ষার্থীরা “আমার কোর্স” পাতা থেকে নিজের মতামত লিখতে পারেন।</p>
      <a class="mb-btn mb-btn--sm mb-btn--ghost" href="/learn#review">মতামত লিখুন</a></div>`;
    return;
  }
  box.innerHTML = data.map((r) => `<figure class="mb-review">
    <span class="mb-quote" aria-hidden="true">❝</span>
    ${r.rating ? `<p class="mb-stars" aria-label="${bn(r.rating)} তারা">${'★'.repeat(r.rating)}<span>${'★'.repeat(5 - r.rating)}</span></p>` : ''}
    <blockquote>${esc(r.body)}</blockquote>
    <figcaption><b>${esc(r.name)}</b>${r.course_title ? `<span>${esc(r.course_title)}</span>` : ''}</figcaption></figure>`).join('');
}

// ---------- যোগাযোগ ও কমিউনিটি ----------
function paintContact() {
  $$('[data-wa-link]').forEach((a) => {
    if (!S.whatsapp) { a.closest('[data-hide-empty]')?.setAttribute('hidden', ''); return; }
    a.href = waLink(a.dataset.waLink || ''); a.target = '_blank'; a.rel = 'noopener';
  });
  $$('[data-wa-number]').forEach((el) => (el.textContent = S.whatsapp ? '+' + bn(S.whatsapp) : ''));
  $$('[data-email-link]').forEach((a) => { if (!S.email) a.hidden = true; else a.href = 'mailto:' + S.email; });
  $$('[data-email]').forEach((el) => (el.textContent = S.email || ''));
  $$('[data-pay]').forEach((el) => { const v = S[el.dataset.pay]; el.textContent = v ? bn(v) : '—'; });

  const box = $('[data-community]'); if (!box) return;
  const C = S.community || {};
  const items = [
    ['whatsapp', 'WhatsApp গ্রুপ', 'দরসের ঘোষণা, লাইভ ক্লাসের লিংক ও প্রশ্নোত্তর'],
    ['telegram', 'টেলিগ্রাম চ্যানেল', 'নোট, শিট ও গুরুত্বপূর্ণ ঘোষণা'],
    ['facebook', 'ফেসবুক গ্রুপ', 'শিক্ষার্থীদের আলোচনা ও পারস্পরিক সহায়তা'],
    ['youtube', 'ইউটিউব চ্যানেল', 'বিনামূল্যের ভিডিও দরস ও আলোচনা'],
  ].filter(([k]) => C[k]);
  box.innerHTML = items.length
    ? items.map(([k, t, d]) => `<a class="mb-ccard" href="${esc(C[k])}" target="_blank" rel="noopener"><b>${t}</b><span>${d}</span><i aria-hidden="true">→</i></a>`).join('')
    : `<div class="mb-reviews__empty"><p>কমিউনিটির গ্রুপগুলোর লিংক শিগগিরই এখানে যোগ হবে।</p>
       ${S.whatsapp ? `<a class="mb-btn mb-btn--sm" href="${waLink('আসসালামু আলাইকুম। শিক্ষার্থী কমিউনিটিতে যোগ দিতে চাই।')}" target="_blank" rel="noopener">WhatsApp-এ যোগাযোগ করুন</a>` : ''}</div>`;
}

paintCourses();
paintTeachers();
paintReviews();
paintContact();
