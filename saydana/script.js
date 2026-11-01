(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('lock', open);
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.classList.remove('lock'); }
  });

  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); if (document.getElementById('sheet').hidden) document.body.classList.remove('lock'); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1040) closeMenu(); });

  // Namangan vaqti (Asia/Tashkent) bo'yicha "hozir ochiq"
  function now() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { d: map[o.weekday], m: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }
  var t = now();
  var close = t.d >= 1 && t.d <= 5 ? 17 * 60 : t.d === 6 ? 16 * 60 : null;
  var isOpen = close !== null && t.m >= 8 * 60 && t.m < close;
  var st = document.getElementById('status');
  st.classList.add(isOpen ? 'open' : 'closed');
  st.lastChild.textContent = isOpen ? 'Hozir ochiq · ' + (close / 60) + ':00 gacha' : (t.d === 0 ? 'Yakshanba · kardiolog qabuli' : 'Hozir yopiq · ish vaqti 8:00 dan');
  document.querySelectorAll('#hours tr').forEach(function (tr) {
    if (tr.dataset.d.split(',').indexOf(String(t.d)) > -1) tr.classList.add('today');
  });

  var copy = document.getElementById('copy');
  copy.addEventListener('click', function () {
    var txt = "Namangan viloyati, Namangan shahri, Nodira ko'chasi, 1";
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      copy.textContent = 'Nusxalandi ✓';
    }).catch(function () { copy.textContent = txt; });
    setTimeout(function () { copy.textContent = 'Manzilni nusxalash'; }, 2500);
  });


  // Xarita ilovasini tanlash
  var LAT = 40.997889, LON = 71.666325, NAME = 'Saydana';
  var sheet = document.getElementById('sheet');
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  function setApp(id, href, show) { var a = document.getElementById(id); a.href = href; a.hidden = !show; }
  setApp('app-geo', 'geo:' + LAT + ',' + LON + '?q=' + LAT + ',' + LON + '(' + NAME + ')', isAndroid);
  setApp('app-apple', 'https://maps.apple.com/?ll=' + LAT + ',' + LON + '&q=' + NAME, isApple && !isAndroid);
  setApp('app-google', 'https://www.google.com/maps/search/?api=1&query=' + LAT + ',' + LON, true);
  setApp('app-yandex', 'https://yandex.com/maps/?pt=' + LON + ',' + LAT + '&z=17&l=map', true);
  setApp('app-2gis', 'https://2gis.uz/?m=' + LON + ',' + LAT + '/17', true);
  var lastFocus = null;
  function openSheet(e) { if (e) e.preventDefault(); lastFocus = document.activeElement; sheet.hidden = false; document.body.classList.add('lock'); var f = sheet.querySelector('.app:not([hidden])'); if (f) f.focus(); }
  function closeSheet() { sheet.hidden = true; document.body.classList.remove('lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.getElementById('mapHit').addEventListener('click', openSheet);
  document.getElementById('mapBtn').addEventListener('click', openSheet);
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); else if (e.target.closest('.app')) setTimeout(closeSheet, 200); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  // Xizmat kartochkasini bosganda ma'lumot oynasi
  var SVC = {
    mri:  { icon: 'i-scan', t: 'MRT', d: 'Magnit-rezonans tomografiya — a\'zolarning batafsil qatlamli tasviri.', f: ['Bosh miya, umurtqa, bo\'g\'imlar va ichki a\'zolar tekshiruvi', 'Rentgen nurlanishi ishlatilmaydi', 'Og\'riqsiz, lekin apparat ichida bir joyda yotish kerak bo\'ladi'], n: 'Metall buyumlar, implant yoki yurak stimulyatori bo\'lsa, yozilishda albatta ayting.' },
    mskt: { icon: 'i-ring', t: 'MSKT', d: 'Multispiral kompyuter tomografiya — tezkor va aniq qatlamli tasvir.', f: ['Bir necha daqiqada qatlamli tasvir olinadi', 'Rentgen nurlari yordamida bajariladi', 'Shifokor yo\'llanmasi bilan kelish qulay'], n: 'Kontrast modda kerak bo\'lsa, tayyorgarlik haqida operatordan so\'rang.' },
    xray: { icon: 'i-xray', t: 'Rentgen', d: 'Ko\'krak qafasi va suyak-bo\'g\'im tizimi rentgenografiyasi.', f: ['Tez va og\'riqsiz tekshiruv', 'Natija shifokor xulosasi bilan beriladi'], n: 'Homiladorlik ehtimoli bo\'lsa, tekshiruvdan oldin albatta ogohlantiring.' },
    uzi:  { icon: 'i-wave', t: 'UZI', d: 'Ultratovush tekshiruvi — qorin bo\'shlig\'i, kichik chanoq va boshqa a\'zolar.', f: ['Nurlanishsiz, og\'riqsiz tekshiruv', 'Natija darhol ma\'lum bo\'ladi'], n: 'Ba\'zi UZI turlariga oldindan tayyorgarlik kerak. Yozilayotganda so\'rang.' },
    echo: { icon: 'i-heart', t: 'Exokardiografiya', d: 'Yurak UZI tekshiruvi — kameralar, qopqoqlar va qon oqimi holati.', f: ['Nurlanishsiz, og\'riqsiz tekshiruv', 'Yurak ish faoliyatini real vaqtda ko\'rsatadi'], n: 'Odatda maxsus tayyorgarlik talab qilinmaydi. Aniqlash uchun qo\'ng\'iroq qiling.' },
    ecg:  { icon: 'i-pulse', t: 'EKG', d: 'Elektrokardiografiya — yurak ritmi va elektr faolligini yozib olish.', f: ['Bir necha daqiqa davom etadi', 'Og\'riqsiz va xavfsiz'], n: 'Tekshiruv oldidan jismoniy zo\'riqishdan saqlaning.' },
    fgds: { icon: 'i-tube', t: 'FGDS', d: 'Fibrogastroduodenoskopiya — qizilo\'ngach, oshqozon va o\'n ikki barmoqli ichak endoskopiyasi.', f: ['Shilliq qavat holatini bevosita ko\'rish imkonini beradi', 'Odatda och qoringa topshiriladi'], n: 'Aniq tayyorgarlik qoidalari uchun yozilishdan oldin operatordan so\'rang.' },
    lab:  { icon: 'i-flask', t: 'Laboratoriya', d: 'Qon tahlili va boshqa laboratoriya tekshiruvlari.', f: ['Qon tahlili va boshqa tekshiruvlar', 'Shifokor tavsiyasi bo\'yicha topshirish qulay'], n: 'Ko\'p tahlillar ertalab, och qoringa topshiriladi. Aniq tahlil uchun qo\'ng\'iroq qiling.' }
  };
  var svc = document.getElementById('svc');
  var svcFocus = null;
  var tick = '<svg class="ic"><use href="#i-check"/></svg>';
  var svcApply = null;
  function openSvc(key) {
    var s = SVC[key]; if (!s) return;
    if (svc.hidden) svcFocus = document.activeElement;
    document.getElementById('svcPh').hidden = true; document.getElementById('svcIco').hidden = false;
    document.getElementById('svcIcon').setAttribute('href', '#' + s.icon);
    document.getElementById('svcTitle').textContent = s.t;
    document.getElementById('svcDesc').textContent = s.d;
    document.getElementById('svcFacts').innerHTML = s.f.slice(0, 2).map(function (x) { return '<li>' + tick + '<span>' + x + '</span></li>'; }).join('');
    document.getElementById('svcNote').textContent = "Narx va tayyorgarlik bo'yicha qo'ng'iroq qiling.";
    svcApply = { svc: s.apply || s.t, note: '' };
    svc.hidden = false; document.body.classList.add('lock');
    var box = svc.querySelector('.svc-box'); box.scrollTop = 0;
    svc.querySelector('.svc-call').focus({ preventScroll: true });
  }
  function closeSvc() { svc.hidden = true; if (sheet.hidden) document.body.classList.remove('lock'); if (svcFocus && svcFocus.focus) svcFocus.focus(); }
  document.querySelectorAll('.b[data-svc]').forEach(function (card) {
    card.addEventListener('click', function () { openSvc(card.dataset.svc); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSvc(card.dataset.svc); } });
  });
  document.getElementById('svcApply').addEventListener('click', function () {
    var a = svcApply || {}; svcFocus = null; closeSvc();
    var sel = document.getElementById('f-svc'), note = document.getElementById('f-note');
    Array.prototype.forEach.call(sel.options, function (o) { if (o.text === a.svc) sel.value = o.value || o.text; });
    if (a.note && !note.value.trim()) note.value = a.note;
    var target = document.getElementById('ariza'); target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { document.getElementById('f-name').focus({ preventScroll: true }); }, reduce ? 0 : 500);
  });
  svc.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSvc(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !svc.hidden) closeSvc(); });

  // Ariza formasi: matn tayyorlanadi va pochta ilovasida ochiladi
  var form = document.getElementById('form');
  function setErr(id, msg) { var f = document.getElementById(id).closest('.field'); f.classList.toggle('bad', !!msg); document.getElementById('e-' + id.slice(2)).textContent = msg || ''; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-name').value.trim(), phone = document.getElementById('f-phone').value.trim();
    var digits = phone.replace(/\D/g, '');
    setErr('f-name', name.length < 2 ? 'Ismingizni kiriting' : '');
    setErr('f-phone', digits.length < 9 ? 'Telefon raqamini to\'liq kiriting' : '');
    if (name.length < 2) { document.getElementById('f-name').focus(); return; }
    if (digits.length < 9) { document.getElementById('f-phone').focus(); return; }
    var lines = ['Assalomu alaykum! Qabulga ariza qoldiraman.', '', 'Ism: ' + name, 'Telefon: ' + phone, 'Xizmat: ' + document.getElementById('f-svc').value, 'Qulay vaqt: ' + document.getElementById('f-time').value];
    var note = document.getElementById('f-note').value.trim(); if (note) lines.push('Izoh: ' + note);
    var text = lines.join('\n');
    document.getElementById('resultText').textContent = text;
    var mail = 'mailto:info@saydanamed.uz?subject=' + encodeURIComponent('Qabulga ariza') + '&body=' + encodeURIComponent(text);
    document.getElementById('resMail').href = mail;
    var res = document.getElementById('result'); res.hidden = false;
    res.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    window.location.href = mail;
  });
  ['f-name', 'f-phone'].forEach(function (id) { document.getElementById(id).addEventListener('input', function () { setErr(id, ''); }); });
  document.getElementById('resCopy').addEventListener('click', function () {
    var btn = this, txt = document.getElementById('resultText').textContent;
    function sel() { var r = document.createRange(); r.selectNodeContents(document.getElementById('resultText')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Belgilandi, nusxalang'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { btn.textContent = 'Nusxalandi ✓'; setTimeout(function () { btn.textContent = 'Matnni nusxalash'; }, 2200); }).catch(sel); else sel();
  });

  function openDoc(card) {
    if (svc.hidden) svcFocus = document.activeElement;
    var name = card.dataset.name;
    document.getElementById('svcPh').hidden = false; document.getElementById('svcIco').hidden = true;
    var img = document.getElementById('svcImg'); img.src = card.dataset.img; img.alt = name;
    document.getElementById('svcTitle').textContent = name;
    document.getElementById('svcDesc').textContent = card.dataset.role;
    document.getElementById('svcFacts').innerHTML = card.dataset.facts.split('|').slice(0, 3).map(function (x) { return '<li>' + tick + '<span>' + x + '</span></li>'; }).join('');
    document.getElementById('svcNote').textContent = "Qabul vaqti va narxni markazdan aniqlang.";
    svcApply = { svc: 'Mutaxassis maslahati', note: 'Shifokor: ' + name };
    svc.hidden = false; document.body.classList.add('lock');
    svc.querySelector('.svc-box').scrollTop = 0;
    svc.querySelector('.svc-call').focus({ preventScroll: true });
  }
  // Shifokorlar: filtr va oyna
  (function () {
    var wrap = document.getElementById('docs'), fl = document.getElementById('docFilters'); if (!wrap || !fl) return;
    var cards = Array.prototype.slice.call(wrap.querySelectorAll('.doc'));
    var CATS = [['all', 'Hammasi'], ['diag', 'Diagnostika'], ['surg', 'Jarrohlik'], ['neuro', 'Nevrologiya'], ['cardio', 'Kardiologiya'], ['gyn', 'Ginekologiya']];
    function has(c, k) { return k === 'all' || (' ' + c.dataset.cat + ' ').indexOf(' ' + k + ' ') > -1; }
    CATS.forEach(function (c, i) {
      var n = cards.filter(function (x) { return has(x, c[0]); }).length;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'filter'; b.dataset.k = c[0]; b.setAttribute('aria-pressed', String(i === 0));
      b.innerHTML = c[1] + ' <span>' + n + '</span>';
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(fl.children, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        cards.forEach(function (x) { var show = has(x, c[0]); x.hidden = !show; x.classList.remove('show'); if (show) { void x.offsetWidth; x.classList.add('show'); } });
      });
      fl.appendChild(b);
    });
    cards.forEach(function (card) {
      card.addEventListener('click', function () { openDoc(card); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(card); } });
    });
  })();

  // "Statsionarga yozilish" kabi tugmalar: formani to'ldirib, ariza bo'limiga olib boradi
  Array.prototype.forEach.call(document.querySelectorAll('[data-apply]'), function (b) {
    b.addEventListener('click', function () {
      var sel = document.getElementById('f-svc'), note = document.getElementById('f-note');
      Array.prototype.forEach.call(sel.options, function (o) { if (o.text === b.dataset.apply) sel.value = o.value || o.text; });
      if (b.dataset.note && !note.value.trim()) note.value = b.dataset.note;
      document.getElementById('ariza').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { document.getElementById('f-name').focus({ preventScroll: true }); }, reduce ? 0 : 500);
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // Sahifa ko'rinishga kelganda silliq paydo bo'lish
  function finishReveal(el) { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }
  var io = hasIO && !reduce ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el); el.classList.add('in');
      var done = false;
      function end() { if (!done) { done = true; finishReveal(el); } }
      el.addEventListener('transitionend', function h(ev) { if (ev.propertyName === 'opacity') { el.removeEventListener('transitionend', h); end(); } });
      setTimeout(end, 1500);
    });
  }, { threshold: .12 }) : null;
  if (io) {
    document.querySelectorAll('.b,.doc,.sec-head,.info-row>div,.amen li,.dirs li,.form').forEach(function (el) {
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 6) * 0.07 + 's');
      el.classList.add('reveal'); io.observe(el);
    });
  }

  // Sarlavha: skroll qilinganda ingichka chiziq
  var header = document.getElementById('top');
  function onScroll() { header.classList.toggle('scrolled', (window.scrollY || document.documentElement.scrollTop) > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menyuda joriy bo'limni ajratib ko'rsatish
  if (hasIO) {
    var links = {};
    document.querySelectorAll('#menu a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(links).forEach(function (k) { var s = document.getElementById(k); if (s) sio.observe(s); });
  }

})();
