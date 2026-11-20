// Vercel Routing Middleware (Edge): শুধু /hatekhori অংশে পাসওয়ার্ড-কুকি যাচাই করে।
// মূল সাইট ও /nahw (যার নিজস্ব শিক্ষার্থী-অ্যাকাউন্ট আছে) এতে আটকায় না।
import { COOKIE, tokenFor, safeEqual, configured, readCookie } from './lib/hatekhori-auth.js';
import LOGIN_HTML from './courses/hatekhori/login-page.js';

function loginPage(status, error) {
  return new Response(LOGIN_HTML.replace('{{ERROR_CLASS}}', error ? 'show' : ''), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const env = process.env;
  if (!configured(env)) {
    return new Response('আরবি ভাষার হাতেখড়ি কোর্সটি এখনো চালু হয়নি (পাসওয়ার্ড সেট করা হয়নি)।', {
      status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const got = readCookie(request.headers.get('cookie'), COOKIE);
  if (got) {
    const want = await tokenFor(env.HATEKHORI_PASSWORD, env.COOKIE_SECRET);
    if (safeEqual(got, want)) {
      return new Response(null, { headers: { 'x-middleware-next': '1' } });
    }
  }
  return loginPage(401, url.searchParams.get('e') === '1');
}

export const config = { matcher: ['/hatekhori', '/hatekhori/:path*'] };
