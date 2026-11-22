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
  email: '',        // যোগাযোগের ইমেইল — যেমন: 'info@example.com' (খালি থাকলে দেখাবে না)

  // কমিউনিটি পাতার লিংক (খালি থাকলে সেটি দেখাবে না)
  community: {
    whatsapp: '',   // WhatsApp গ্রুপের ইনভাইট লিংক — যেমন: 'https://chat.whatsapp.com/....'
    telegram: '',   // যেমন: 'https://t.me/....'
    facebook: '',   // যেমন: 'https://facebook.com/groups/....'
    youtube: ''     // যেমন: 'https://youtube.com/@....'
  },

  // শিক্ষকমণ্ডলী — ড্যাশবোর্ডে শিক্ষক যোগ না হওয়া পর্যন্ত এটি দেখাবে
  teachers: [
    {
      name: 'মুহাম্মাদ সাজ্জাদ ইউনুস',
      role: 'প্রতিষ্ঠাতা ও প্রধান শিক্ষক',
      bio: 'ইমাম মুহাম্মাদ ইবনে সাউদ ইসলামিক বিশ্ববিদ্যালয়, রিয়াদ থেকে শরীয়াহতে স্নাতক; বর্তমানে একই বিশ্ববিদ্যালয়ে ফিকহে মাস্টার্স। সৌদি বিচার মন্ত্রণালয়ের অধীনে অনুবাদক।'
    }
  ],

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
