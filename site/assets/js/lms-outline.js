// কোর্সের অধ্যায় ও দরসের তালিকা (কোর্স পাতা ও দরস প্লেয়ার দুটোই ব্যবহার করে)
import { esc, bn } from './lms.js';

const ICON = {
  done: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  dot: '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
};

export function outlineHTML(data, currentId) {
  const byCh = new Map();
  data.lessons.forEach((l) => { const k = l.chapter_id || '_'; if (!byCh.has(k)) byCh.set(k, []); byCh.get(k).push(l); });
  const chapters = [...data.chapters.filter((c) => byCh.has(c.id)), ...(byCh.has('_') ? [{ id: '_', title: 'অন্যান্য দরস' }] : [])];
  let n = 0;
  return `<ul class="lx-outline">${chapters.map((ch) => `
    <li class="lx-outline__ch">${esc(ch.title)}</li>
    ${byCh.get(ch.id).map((l) => {
      n++;
      const icon = l.completed ? `<span class="lx-ico is-done" title="সম্পন্ন">${ICON.done}</span>`
        : l.state === 'ok' ? `<span class="lx-ico">${l.has_video ? ICON.play : ICON.dot}</span>`
        : `<span class="lx-ico is-lock" title="বন্ধ">${ICON.lock}</span>`;
      const tag = l.is_preview && data.enrollment !== 'active' ? '<span class="lx-pill">বিনামূল্যে দেখুন</span>'
        : l.has_quiz ? '<span class="lx-pill">টেস্ট</span>' : l.duration_min ? `<small class="lx-muted">${bn(l.duration_min)} মিনিট</small>` : '<span></span>';
      const inner = `${icon}<span>${bn(n)}. ${esc(l.title)}</span>${tag}`;
      return `<li class="lx-outline__ls${l.id === currentId ? ' is-current' : ''}">${l.state === 'ok'
        ? `<a href="/lesson?id=${l.id}"${l.id === currentId ? ' aria-current="page"' : ''}>${inner}</a>` : `<span aria-disabled="true">${inner}</span>`}</li>`;
    }).join('')}`).join('')}</ul>`;
}
