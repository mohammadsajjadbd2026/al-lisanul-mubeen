// আরবি ভাষার হাতেখড়ি: কুকি মুছে প্রবেশ-পাতায় ফেরত পাঠায়
import { COOKIE, PATH } from '../../lib/hatekhori-auth.js';
export default function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('set-cookie', `${COOKIE}=; Path=${PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  res.statusCode = 303; res.setHeader('location', PATH + '/'); res.end();
}
