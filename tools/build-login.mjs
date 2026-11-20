// courses/hatekhori/login.html থেকে login-page.js তৈরি করে (মিডলওয়্যার এটি ব্যবহার করে)।
// login.html বদলালে চালান:  node tools/build-login.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(new URL('../courses/hatekhori/login.html', import.meta.url), 'utf8');
writeFileSync(new URL('../courses/hatekhori/login-page.js', import.meta.url),
  '// স্বয়ংক্রিয়ভাবে তৈরি — সরাসরি বদলাবেন না; login.html বদলে `node tools/build-login.mjs` চালান।\nexport default ' + JSON.stringify(html) + ';\n');
console.log('login-page.js তৈরি হয়েছে');
