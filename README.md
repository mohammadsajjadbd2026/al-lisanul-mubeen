# আল-লিসানুল মুবীন — আরবি কোর্সের সাইট

**লাইভ:** https://al-lisanul-mubeen.vercel.app

বাংলাভাষী শিক্ষার্থীদের জন্য আরবি ভাষা কোর্সের সাইট — পরিচিতি, ভর্তি, আর কোর্সগুলো একই ঠিকানায়।

| ঠিকানা | কী আছে | সুরক্ষা |
|---|---|---|
| `/` | হোমপেজ, কোর্স, পাঠ্যসূচি, শিক্ষার্থী প্রবেশ | খোলা |
| `/enroll` | ভর্তি ফর্ম (তথ্য WhatsApp-এ আসে) | খোলা |
| `/hatekhori` | আরবি ভাষার হাতেখড়ি — পুরো কোর্স | একটি পাসওয়ার্ড (৩০ দিন মনে রাখে) |
| `/nahw` | নাহুর সহজ পাঠ — পুরো কোর্স | শিক্ষার্থী-অ্যাকাউন্ট (Supabase) + অনুমোদন + ৭০% পেলে পরের দরস |
| — | সরফের সহজ পাঠ | শীঘ্রই (আগ্রহী তালিকা WhatsApp-এ) |

## পেমেন্ট নম্বর, দাম, WhatsApp — শুধু একটি ফাইল
`site/assets/js/config.js` — GitHub-এ ✏️ দিয়ে বদলে **Commit** করলেই ১-২ মিনিটে লাইভ।

## Vercel-এর Environment Variables (একবার সেট করতে হবে)
- `HATEKHORI_PASSWORD` — হাতেখড়ির শিক্ষার্থীদের পাসওয়ার্ড
- `COOKIE_SECRET` — ৩২+ অক্ষরের এলোমেলো লেখা

না থাকলে `/hatekhori` বন্ধ দেখায়; বাকি সাইট চলে। পাসওয়ার্ড বদলাতে: Settings → Environment Variables → Edit → Save → Deployments → Redeploy।

## নাহু কোর্সের শিক্ষার্থী অনুমোদন
Supabase → Table Editor → `profiles` → শিক্ষার্থীর সারিতে `approved` = true।
Supabase → Authentication → URL Configuration-এ `https://al-lisanul-mubeen.vercel.app/nahw/` যোগ থাকতে হবে (ইমেইল নিশ্চিতকরণ ও পাসওয়ার্ড রিসেটের জন্য)।

## কোর্সের লেখা হালনাগাদ
- হাতেখড়ি: `site/hatekhori/index.html` বদলান
- নাহু: দারস `courses/nahw/lessons/`-এ, কাঠামো `site/nahw/index.html`-এ; দারসের ক্রম Supabase-এর `lessons` টেবিলে (`courses/nahw/supabase/`)
- হাতেখড়ির প্রবেশ-পাতা: `courses/hatekhori/login.html` বদলে `node tools/build-login.mjs`

## ফাইল কাঠামো
```
site/                 প্রকাশ্য সাইট (index, enroll, hatekhori/, nahw/, assets/)
api/hatekhori/        login.js, logout.js
api/nahw/lesson.js    অনুমোদিত শিক্ষার্থীকে দারস পাঠায়
middleware.js         /hatekhori পাহারা দেয়
lib/hatekhori-auth.js
courses/              প্রকাশ্য নয় এমন ফাইল (নাহুর দারস, হাতেখড়ির প্রবেশ-পাতা)
tools/                লোগো ও প্রবেশ-পাতা তৈরির স্ক্রিপ্ট
```

## কমিটের নিয়ম
লেখক: `mohammadsajjadbd2026 <276113430+mohammadsajjadbd2026@users.noreply.github.com>` — অন্য ইমেইলে Vercel Hobby ডিপ্লয় আটকে দেয়।
