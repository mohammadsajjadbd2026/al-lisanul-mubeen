(function () {
  var S = window.SITE || {};
  var bn = function (s) {
    return String(s).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; });
  };

  // ---- মোবাইল মেনু ----
  var btn = document.querySelector('.mb-nav-toggle');
  var nav = document.getElementById('mb-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.classList.toggle('is-open', !open);
    });
  }

  // ---- config থেকে মান বসানো ----
  function fill(sel, value, fallback) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = value ? value : fallback;
      if (!value) el.classList.add('is-placeholder');
    });
  }
  fill('[data-pay="bkash"]', S.bkash && bn(S.bkash), '[শীঘ্রই যোগ হবে]');
  fill('[data-pay="nagad"]', S.nagad && bn(S.nagad), '[শীঘ্রই যোগ হবে]');
  fill('[data-pay="bank"]', S.bank, '[শীঘ্রই যোগ হবে]');

  var C = S.courses || {};
  Object.keys(C).forEach(function (key) {
    var c = C[key];
    fill('[data-price="' + key + '"]', c.price && ('৳ ' + bn(c.price)), '৳ [দাম]');
    document.querySelectorAll('[data-course-url="' + key + '"]').forEach(function (a) {
      if (c.url) a.href = c.url; else a.hidden = true;
    });
  });

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = bn(new Date().getFullYear());
  });

  // ---- ভর্তি ফর্ম ----
  var form = document.getElementById('enroll-form');
  if (!form) return;

  var params = new URLSearchParams(location.search);
  var pre = params.get('course');
  var courseSel = form.querySelector('#f-course');
  if (pre && courseSel.querySelector('option[value="' + pre + '"]')) courseSel.value = pre;

  var out = document.getElementById('enroll-result');
  var msgBox = document.getElementById('enroll-message');
  var wa = document.getElementById('send-wa');
  var tg = document.getElementById('send-tg');
  var copyBtn = document.getElementById('copy-msg');
  var copyNote = document.getElementById('copy-note');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var v = function (id) { return form.querySelector(id).value.trim(); };
    var course = C[v('#f-course')] || {};
    var text =
      'আসসালামু আলাইকুম। আমি ভর্তি হতে চাই।\n' +
      'কোর্স: ' + (course.title || v('#f-course')) + '\n' +
      'নাম: ' + v('#f-name') + '\n' +
      'মোবাইল/WhatsApp: ' + v('#f-phone') + '\n' +
      'পেমেন্ট মাধ্যম: ' + v('#f-method') + '\n' +
      'যে নম্বর/হিসাব থেকে পাঠিয়েছি: ' + v('#f-sender') + '\n' +
      'ট্রানজেকশন আইডি (TrxID): ' + v('#f-trx') + '\n' +
      'পাঠানো টাকা: ' + v('#f-amount');

    msgBox.textContent = text;
    out.hidden = false;

    if (S.whatsapp) {
      wa.href = 'https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(text);
      wa.hidden = false;
    } else { wa.hidden = true; }
    if (S.telegram) {
      tg.href = 'https://t.me/' + S.telegram;
      tg.hidden = false;
    } else { tg.hidden = true; }
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  copyBtn.addEventListener('click', function () {
    var t = msgBox.textContent;
    var done = function () { copyNote.textContent = 'কপি হয়েছে ✓'; };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(done, function () { copyNote.textContent = 'লেখাটি নির্বাচন করে কপি করুন।'; });
    } else {
      copyNote.textContent = 'লেখাটি নির্বাচন করে কপি করুন।';
    }
  });
})();
