/*
 * সাইটের সব পরিবর্তনযোগ্য তথ্য এই একটি ফাইলে।
 * নম্বর/লিংক বদলাতে শুধু এখানে লিখে সেভ করুন — পুরো সাইটে বদলে যাবে।
 */
window.SITE = {
  name: 'আল-লিসানুল মুবীন',

  // পেমেন্টের তথ্য (খালি থাকলে সাইটে "[শীঘ্রই যোগ হবে]" দেখাবে)
  bkash: '',        // যেমন: '01XXXXXXXXX' (Personal — Send Money)
  nagad: '',        // যেমন: '01XXXXXXXXX'
  bank: '',         // যেমন: 'ইসলামী ব্যাংক, হিসাব নং ..., শাখা ...'

  // ভর্তির তথ্য যেখানে আসবে
  whatsapp: '',     // দেশের কোডসহ, + ছাড়া — যেমন: '8801XXXXXXXXX' বা '9665XXXXXXXX'
  telegram: '',     // ইউজারনেম, @ ছাড়া — যেমন: 'sajjadyunus'

  // কোর্সসমূহ
  courses: {
    hatekhori: {
      title: 'আরবি ভাষার হাতেখড়ি',
      price: '',    // যেমন: '১৫০০' (খালি থাকলে "[দাম]" দেখাবে)
      url: 'https://arabi-bhashar-hatekhori.vercel.app',
      open: true
    },
    nahw: { title: 'নাহুর সহজ পাঠ', price: '', url: '', open: false },
    sarf: { title: 'সরফের সহজ পাঠ', price: '', url: '', open: false }
  }
};
