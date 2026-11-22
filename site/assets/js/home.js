// হোমপেজ: ড্যাশবোর্ডের কোর্সগুলো দেখানো (ডেটাবেস না পেলে আগের তালিকাই থাকে)
import { sb, esc, money, posterHTML, paintHeader } from './lms.js';

paintHeader();
const grid = document.querySelector('#courses .mb-courses');
const STATUS = { soon: ['শীঘ্রই', 'mb-badge mb-badge--soon'], open: ['ভর্তি চলছে', 'mb-badge'], closed: ['ভর্তি বন্ধ', 'mb-badge mb-badge--soon'] };

(async () => {
  const { data, error } = await sb.from('lms_courses').select('slug,title,subtitle,level,price,old_price,poster_url,status').neq('status', 'draft').order('sort');
  if (error || !data || !data.length || !grid) return;
  grid.innerHTML = data.map((c) => {
    const [label, cls] = STATUS[c.status] || STATUS.open;
    const url = `/course?c=${encodeURIComponent(c.slug)}`;
    return `<article class="mb-course${c.status === 'soon' ? ' mb-course--soon' : ''}">
      <a class="mb-course__media" href="${url}" tabindex="-1" aria-hidden="true">${posterHTML(c)}<em class="${cls}">${label}</em></a>
      <div class="mb-course__body">
        ${c.level ? `<p class="mb-course__level">${esc(c.level)}</p>` : ''}
        <h3 class="mb-course__title"><a href="${url}">${esc(c.title)}</a></h3>
        ${c.subtitle ? `<p class="mb-course__excerpt">${esc(c.subtitle)}</p>` : ''}
        <div class="mb-course__foot">
          <span>${c.price ? `<span class="mb-price">${money(c.price)}</span>` : ''} ${c.old_price && c.old_price !== c.price ? `<del class="mb-price-old">${money(c.old_price)}</del>` : ''}</span>
          <a class="mb-btn mb-btn--sm${c.status === 'open' ? '' : ' mb-btn--ghost'}" href="${url}">${c.status === 'open' ? 'বিস্তারিত ও ভর্তি' : 'বিস্তারিত'}</a>
        </div>
      </div></article>`;
  }).join('');
})();
