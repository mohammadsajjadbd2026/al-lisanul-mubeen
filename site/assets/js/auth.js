// সব পাতার জন্য সাধারণ Supabase সহায়ক (account, admin, hatekhori)
(function () {
  var C = (window.SITE && window.SITE.supabase) || {};
  var sb = window.supabase && C.url ? window.supabase.createClient(C.url, C.anon) : null;
  var COURSES = { hatekhori: 'আরবি ভাষার হাতেখড়ি', nahw: 'নাহুর সহজ পাঠ' };
  var STATUS = { pending: 'অনুমোদনের অপেক্ষায় ⏳', approved: 'অনুমোদিত ✅', rejected: 'বাতিল ❌' };
  async function session() { if (!sb) return null; var r = await sb.auth.getSession(); return r.data.session; }
  async function profile(uid) {
    var r = await sb.from('profiles').select('full_name,email,is_admin').eq('id', uid).maybeSingle();
    return r.data || { is_admin: false };
  }
  var ERR = {
    'Invalid login credentials': 'ইমেইল বা পাসওয়ার্ড মেলেনি।',
    'Email not confirmed': 'ইমেইল এখনো নিশ্চিত করা হয়নি। ইনবক্সের লিংকে চাপ দিন।',
    'User already registered': 'এই ইমেইলে আগেই নিবন্ধন করা আছে। প্রবেশ করুন।'
  };
  window.MB = { sb: sb, COURSES: COURSES, STATUS: STATUS, session: session, profile: profile, tr: function (m) { return ERR[m] || m; } };
})();
