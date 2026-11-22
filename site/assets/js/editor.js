// ছোট লেখা-সম্পাদক: শিরোনাম, মোটা, তালিকা, উদ্ধৃতি, আরবি অনুচ্ছেদ, লিংক, ছবি, HTML দেখা
import { sb, publicUrl, toast, trErr, esc } from './lms.js';

const BTNS = [
  ['h2', 'শিরোনাম', () => document.execCommand('formatBlock', false, 'h2')],
  ['h3', 'উপশিরোনাম', () => document.execCommand('formatBlock', false, 'h3')],
  ['p', 'সাধারণ', () => document.execCommand('formatBlock', false, 'p')],
  ['B', 'মোটা', () => document.execCommand('bold')],
  ['I', 'বাঁকা', () => document.execCommand('italic')],
  ['• তালিকা', 'তালিকা', () => document.execCommand('insertUnorderedList')],
  ['১. তালিকা', 'ক্রমিক তালিকা', () => document.execCommand('insertOrderedList')],
  ['“ ”', 'উদ্ধৃতি', () => document.execCommand('formatBlock', false, 'blockquote')],
  ['আরবি', 'আরবি অনুচ্ছেদ (ডান থেকে বাঁয়ে)', arabicBlock],
  ['লিংক', 'লিংক', () => { const u = prompt('লিংক (https://...)'); if (u && /^https?:\/\//.test(u)) document.execCommand('createLink', false, u); }],
  ['ছবি', 'ছবি', null],
  ['ফরম্যাট মুছুন', 'ফরম্যাট মুছুন', () => document.execCommand('removeFormat')],
];

function arabicBlock() {
  document.execCommand('formatBlock', false, 'p');
  const sel = getSelection(); if (!sel.rangeCount) return;
  let n = sel.anchorNode; while (n && n.nodeType !== 1) n = n.parentNode;
  const p = n && n.closest('p'); if (p) { p.setAttribute('dir', 'rtl'); p.setAttribute('lang', 'ar'); p.className = 'ar'; }
}

export function makeEditor(host, html = '', { imageFolder = 'images' } = {}) {
  host.innerHTML = `<div class="lx-editor">
    <div class="lx-editor__bar" role="toolbar" aria-label="লেখার সরঞ্জাম">
      ${BTNS.map(([t, label], i) => `<button type="button" data-i="${i}" title="${label}" aria-label="${label}">${t}</button>`).join('')}
      <button type="button" data-html aria-pressed="false" title="HTML দেখুন/লিখুন">HTML</button>
    </div>
    <div class="lx-editor__area" contenteditable="true" role="textbox" aria-multiline="true"></div>
    <textarea class="lx-code" hidden aria-label="HTML"></textarea>
    <input type="file" accept="image/*" hidden>
  </div>`;
  const area = host.querySelector('.lx-editor__area');
  const code = host.querySelector('textarea');
  const file = host.querySelector('input[type=file]');
  const htmlBtn = host.querySelector('[data-html]');
  area.innerHTML = html || '';
  let htmlMode = false;

  host.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
  host.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    if (htmlMode) return;
    area.focus();
    const fn = BTNS[+b.dataset.i][2];
    if (fn) fn(); else file.click();
  }));
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    const ext = (f.name.match(/\.[A-Za-z0-9]{1,5}$/) || ['.png'])[0].toLowerCase();
    const path = `${imageFolder}/${Date.now()}${ext}`;
    const { error } = await sb.storage.from('lms-public').upload(path, f, { contentType: f.type });
    file.value = '';
    if (error) return toast(trErr(error), 'err');
    area.focus();
    document.execCommand('insertHTML', false, `<img src="${esc(publicUrl(path))}" alt="">`);
  });
  htmlBtn.addEventListener('click', () => {
    htmlMode = !htmlMode;
    htmlBtn.setAttribute('aria-pressed', String(htmlMode));
    if (htmlMode) { code.value = area.innerHTML; code.hidden = false; area.hidden = true; code.focus(); }
    else { area.innerHTML = code.value; code.hidden = true; area.hidden = false; }
  });
  return { get: () => (htmlMode ? code.value : area.innerHTML).trim() };
}
