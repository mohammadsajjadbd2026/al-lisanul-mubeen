/*
 * সাইটের সব পরিবর্তনযোগ্য তথ্য এই একটি ফাইলে।
 * নম্বর/লিংক বদলাতে শুধু এখানে লিখে সেভ করুন — পুরো সাইটে বদলে যাবে।
 */
window.SITE = {
  name: 'আল-লিসানুল মুবীন',

  // ডেটাবেস (Supabase) — publishable key প্রকাশ্য রাখা নিরাপদ; সুরক্ষা ডেটাবেসের নিয়মে (RLS)
  supabase: {
    url: 'https://svnoseimqutashoyqesn.supabase.co',
    anon: 'sb_publishable_ptlOFq8xwgs2Wg-DzUsHyA_BGpwZRXD',
    anonKey: 'sb_publishable_ptlOFq8xwgs2Wg-DzUsHyA_BGpwZRXD'
  },

  // পেমেন্টের তথ্য (খালি থাকলে সাইটে "[শীঘ্রই যোগ হবে]" দেখাবে)
  bkash: '01890435248',        // যেমন: '01XXXXXXXXX' (Personal — Send Money)
  nagad: '01890435248',        // যেমন: '01XXXXXXXXX'
  bank: '',         // যেমন: 'ইসলামী ব্যাংক, হিসাব নং ..., শাখা ...'

  // ভর্তির তথ্য যেখানে আসবে
  whatsapp: '966558873289',     // দেশের কোডসহ, + ছাড়া — যেমন: '8801XXXXXXXXX' বা '9665XXXXXXXX'
  telegram: '',     // ইউজারনেম, @ ছাড়া — যেমন: 'sajjadyunus'

  // কোর্সসমূহ
  courses: {
    hatekhori: {
      title: 'আরবি ভাষার হাতেখড়ি',
      price: '2500',     // এখনকার (ছাড়ের) দাম
      oldPrice: '3000',  // আসল দাম — কেটে দেখাবে; ছাড় না থাকলে খালি রাখুন
      url: '/course?c=arabi-bhashar-hatekhori',
      open: true
    },
    nahw: {
      title: 'নাহুর সহজ পাঠ',
      price: '',      // দাম ঠিক করে লিখুন, যেমন '3000'
      oldPrice: '',
      url: '/course?c=nahwer-sohoj-path',
      open: true
    },
    sarf: { title: 'সরফের সহজ পাঠ', price: '', url: '', open: false }
  }
};
