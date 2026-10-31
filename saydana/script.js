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
  window.addEventListener('resize', function () { if (window.innerWidth > 900) closeMenu(); });

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
  st.lastChild.textContent = isOpen ? 'Hozir ochiq · ' + (close / 60) + ':00 gacha' : 'Hozir yopiq · ish vaqti 8:00 dan';
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
  var DEPT = {
    lab:  { icon: 'i-flask', t: 'Laboratoriya', d: 'Tibbiy laboratoriyada qon va boshqa namunalar tahlil qilinadi. Natijalar shifokorga tashxis qo\'yishda va davolashni kuzatishda yordam beradi.', f: ['Qon tahlili va boshqa laboratoriya tekshiruvlari', 'Shifokor yo\'llanmasi bilan yoki profilaktika uchun topshirish mumkin', 'Natija shifokor ko\'rigida davolash rejasini belgilash uchun ishlatiladi', 'Mavjud tahlillar ro\'yxati va natija muddatini markazdan aniqlang'], n: 'Ko\'p tahlillar ertalab, och qoringa topshiriladi. Aniq talablar tahlil turiga bog\'liq.', rel: ['lab'], apply: 'Laboratoriya', note: 'Laboratoriya bo\'limi bo\'yicha' },
    rad:  { icon: 'i-scan', t: 'Radiologiya', d: 'Radiologiya — tasviriy diagnostika bo\'limi: tananing ichki tuzilishi rasmga olinadi. MRT, MSKT va rentgen shu yo\'nalishga kiradi.', f: ['MRT — magnit maydon yordamida, rentgen nurlanishisiz', 'MSKT — rentgen nurlari asosida tezkor qatlamli tasvir', 'Rentgen — ko\'krak qafasi va suyak-bo\'g\'imlar rasmi', 'Qaysi usul kerakligini shifokor ko\'rsatmasi belgilaydi'], n: 'Tekshiruvga yozilishdan oldin implant, metall buyum yoki homiladorlik haqida ayting.', rel: ['mri', 'mskt', 'xray'], apply: 'MRT', note: 'Radiologiya bo\'limi bo\'yicha' },
    endo: { icon: 'i-tube', t: 'Endoskopiya', d: 'Endoskopiyada ichki a\'zolar ichidan ingichka egiluvchan asbob yordamida ko\'riladi. Markazda shu bo\'limda FGDS o\'tkaziladi.', f: ['FGDS — qizilo\'ngach, oshqozon va o\'n ikki barmoqli ichak shilliq qavatini bevosita ko\'rish', 'Odatda shifokor ko\'rsatmasi bilan tayinlanadi', 'Odatda och qoringa topshiriladi', 'Tekshiruv davomiyligi va noqulaylikni kamaytirish usullarini markazdan so\'rang'], n: 'Surunkali kasalliklar, allergiya va doimiy ichadigan dorilar haqida oldindan ogohlantiring.', rel: ['fgds'], apply: 'FGDS', note: 'Endoskopiya bo\'limi bo\'yicha' },
    card: { icon: 'i-heart', t: 'Kardiologiya', d: 'Kardiologiya — yurak va qon-tomir tizimini tekshirish bo\'limi. Markazda EKG va exokardiografiya mavjud, kardiolog maslahati yo\'nalishlar qatorida ko\'rsatilgan.', f: ['EKG — yurak ritmi va elektr faolligini yozib olish', 'Exokardiografiya — yurak kameralari va qopqoqlari UZI', 'Kardiolog maslahati (qabul vaqtini markazdan aniqlang)', 'Bu tekshiruvlar nurlanishsiz va og\'riqsiz'], n: 'Yurakdagi og\'riq yoki hushdan ketish kabi o\'tkir holatlarda kutmasdan shoshilinch yordamga murojaat qiling.', rel: ['ecg', 'echo'], apply: 'EKG', note: 'Kardiologiya bo\'limi bo\'yicha' }
  };
  var svcApply = null;
  function openSvc(key, isDept) {
    var s = (isDept ? DEPT : SVC)[key]; if (!s) return;
    if (svc.hidden) svcFocus = document.activeElement;
    document.getElementById('svcIcon').setAttribute('href', '#' + s.icon);
    document.getElementById('svcTitle').textContent = s.t;
    document.getElementById('svcDesc').textContent = s.d;
    document.getElementById('svcSub').textContent = isDept ? 'Nimalar tekshiriladi' : 'Nimalar qilinadi';
    document.getElementById('svcFacts').innerHTML = s.f.map(function (x) { return '<li>' + tick + '<span>' + x + '</span></li>'; }).join('');
    document.getElementById('svcNote').textContent = s.n;
    var rel = document.getElementById('svcRel'), chips = document.getElementById('svcChips');
    chips.innerHTML = '';
    if (s.rel && s.rel.length > 1 || (isDept && s.rel)) {
      s.rel.forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.innerHTML = SVC[k].t + ' <svg class="ic"><use href="#i-arrow"/></svg>';
        b.addEventListener('click', function () { openSvc(k, false); svc.querySelector('.svc-box').scrollTop = 0; });
        chips.appendChild(b);
      });
      rel.hidden = false;
    } else rel.hidden = true;
    svcApply = { svc: s.apply || s.t, note: s.note || '' };
    svc.hidden = false; document.body.classList.add('lock');
    var box = svc.querySelector('.svc-box'); box.scrollTop = 0;
    svc.querySelector('.svc-call').focus({ preventScroll: true });
  }
  function closeSvc() { svc.hidden = true; if (sheet.hidden) document.body.classList.remove('lock'); if (svcFocus && svcFocus.focus) svcFocus.focus(); }
  var arrow = '<svg class="ic"><use href="#i-arrow"/></svg>';
  document.querySelectorAll('.b[data-svc]').forEach(function (card) {
    var more = document.createElement('span'); more.className = 'more'; more.innerHTML = 'Batafsil ' + arrow; card.appendChild(more);
    card.addEventListener('click', function () { openSvc(card.dataset.svc); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSvc(card.dataset.svc); } });
  });
  document.querySelectorAll('.dept[data-dept]').forEach(function (card) {
    var more = document.createElement('span'); more.className = 'more'; more.innerHTML = 'Batafsil ' + arrow; card.appendChild(more);
    card.addEventListener('click', function () { openSvc(card.dataset.dept, true); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSvc(card.dataset.dept, true); } });
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
  document.getElementById('svcCopy').addEventListener('click', function () {
    var btn = this, num = '+998 (78) 223-10-10';
    function ok() { btn.textContent = 'Nusxalandi ✓'; setTimeout(function () { btn.textContent = 'Nusxalash'; }, 2000); }
    function sel() { var r = document.createRange(); r.selectNodeContents(document.getElementById('svcNum')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Belgilandi'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(ok).catch(sel); else sel();
  });

  // Tayyorgarlik tablari
  var PREP = {
    'MRT': ['Metall buyumlar (soat, zargarlik, kalit) tekshiruvdan oldin yechiladi', 'Implant, yurak stimulyatori yoki metall protez bo\'lsa, oldindan ayting', 'Yopiq joydan qo\'rqsangiz, operatorga ayting', 'Avvalgi MRT va KT natijalarini olib keling'],
    'MSKT': ['Kontrast modda ishlatilsa, tayyorgarlik boshqacha bo\'ladi, oldindan so\'rang', 'Homiladorlik ehtimoli bo\'lsa, albatta ayting', 'Dori yoki kontrastga allergiyangiz bo\'lsa, ogohlantiring', 'Avvalgi tasvirlar va xulosalarni olib keling'],
    'UZI': ['Qorin bo\'shlig\'i UZI odatda och qoringa topshiriladi', 'Kichik chanoq UZI ba\'zan to\'lgan siydik pufagi bilan o\'tkaziladi', 'Aniq tayyorgarlik UZI turiga bog\'liq, yozilganda so\'rang', 'Avvalgi UZI xulosalari bo\'lsa, olib keling'],
    'FGDS': ['Odatda och qoringa topshiriladi', 'Doimiy ichadigan dorilar haqida shifokorga ayting', 'Allergiya va surunkali kasalliklar haqida ogohlantiring', 'Tayyorgarlik vaqtini yozilishda aniqlashtiring'],
    'Laboratoriya': ['Ko\'p qon tahlillari ertalab, och qoringa topshiriladi', 'Tahlildan oldin yog\'li ovqat va spirtli ichimlikdan saqlaning', 'Tahlil turiga qarab talablar farq qiladi, operatordan so\'rang', 'Shifokor yo\'llanmasi bo\'lsa, olib keling']
  };
  var tabsEl = document.getElementById('tabs'), prepList = document.getElementById('prepList');
  function showPrep(name) {
    Array.prototype.forEach.call(tabsEl.children, function (b) { b.setAttribute('aria-selected', String(b.dataset.k === name)); b.tabIndex = b.dataset.k === name ? 0 : -1; });
    prepList.innerHTML = PREP[name].map(function (x) { return '<li><svg class="ic"><use href="#i-check"/></svg><span>' + x + '</span></li>'; }).join('');
  }
  Object.keys(PREP).forEach(function (k) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.dataset.k = k; b.textContent = k;
    b.addEventListener('click', function () { showPrep(k); });
    tabsEl.appendChild(b);
  });
  tabsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = Array.prototype.slice.call(tabsEl.children), i = tabs.indexOf(document.activeElement); if (i < 0) return;
    i = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; tabs[i].focus(); showPrep(tabs[i].dataset.k);
  });
  showPrep('MRT');

  // "Olib keling" ro'yxati (brauzerda eslab qoladi)
  var boxes = document.querySelectorAll('#cl input'), KEY = 'saydana-checklist';
  function readSaved() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function writeSaved(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function updateCl() {
    var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
    document.getElementById('clCount').textContent = n + ' / ' + boxes.length + ' tayyor';
    document.getElementById('clBar').style.width = (n / boxes.length * 100) + '%';
    writeSaved(Array.prototype.map.call(boxes, function (b) { return b.checked; }));
  }
  var saved = readSaved();
  boxes.forEach(function (b, i) { b.checked = !!saved[i]; b.addEventListener('change', updateCl); });
  updateCl();

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
    document.querySelectorAll('.card,.b,.why-item,.step,.chips li,.faq details,.sec-head,.rating,.fact,.dept,.statement').forEach(function (el) {
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 6) * 0.07 + 's');
      el.classList.add('reveal'); io.observe(el);
    });
  }

  // Raqamlar sanash animatsiyasi
  var counters = document.querySelectorAll('[data-count]');
  if (hasIO && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, end = parseInt(el.dataset.count, 10), start = null; cio.unobserve(el);
        function tick(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / 900, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick); else el.textContent = end;
        }
        el.textContent = '0'; requestAnimationFrame(tick);
      });
    }, { threshold: .6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  // Sarlavha soyasi va o'qish chizig'i
  var header = document.getElementById('top');
  var bar = document.getElementById('progress');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('scrolled', y > 8);
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
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

  // Kartalarda kursor yorug'ligi
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // Radiologiya ko'rsatkichi: kompyuterda yaratilgan namunaviy bosh miya kesimi (MRT / MSKT)
  (function () {
    var cv = document.getElementById('mri'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'); var N = cv.width; var img = ctx.createImageData(N, N);
    var slider = document.getElementById('vSlice'), seLbl = document.getElementById('vSe'), titleLbl = document.getElementById('vTitle');
    var viewer = document.getElementById('viewer');
    var TOTAL = 24, slice = 12, mode = 'mr', auto = !reduce, dir = 1, lastStep = 0, visible = true;

    function hash(x, y, z) {
      var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
    }
    function sm(t) { return t * t * (3 - 2 * t); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function vnoise(x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
      return lerp(
        lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
        lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
    }
    function fbm(x, y, z) { return vnoise(x, y, z) * .55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * .3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * .15; }

    function ss(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
    function render() {
      var s = (slice - 1) / (TOTAL - 1), ct = mode === 'ct';
      var sc = .38 + .62 * Math.pow(Math.max(Math.sin(Math.PI * (.1 + .8 * s)), 0), .55);
      var vent = Math.max(0, 1 - Math.abs(s - .52) * 3.4);
      var z = slice * .33, d = img.data, p = 0;
      var SCALP = ct ? .36 : .62, SKULL = ct ? .96 : .07, CSF = ct ? .2 : .86;
      for (var y = 0; y < N; y++) {
        var v = (.5 - y / N) * 2;
        for (var x = 0; x < N; x++) {
          var u = (x / N - .5) * 2;
          var ex = u / (.8 * sc), ey = (v + .02) / (.95 * sc), r = Math.sqrt(ex * ex + ey * ey), val = 0;
          if (r < 1.02) {
            var rr = r > .79 ? 1 : r / .79, br;
            if (rr < 1 || r < .82) {
              var nx = u / sc * 6.4, ny = v / sc * 6.4;
              var wx = vnoise(nx + 3.1, ny + 1.7, z) - .5, wy = vnoise(nx - 2.3, ny + 5.2, z) - .5;
              var n = fbm(nx + wx * 1.5, ny + wy * 1.5, z * .8), t = Math.abs(n - .5) * 2;
              var bnd = .6 + (vnoise(nx * .7, ny * .7, z + 7) - .5) * .28, gm = ss(bnd - .06, bnd + .06, rr);
              var sulc = (1 - ss(0, .11, t)) * ss(.5, .78, rr);
              if (ct) br = (.47 + (n - .5) * .07 + gm * .025) * (1 - sulc * .3) + .3 * sulc * .3;
              else {
                br = lerp(.33 + (n - .5) * .1, .55 + (n - .5) * .16, gm);
                br = lerp(br, .7, sulc * .8);
                if (Math.abs(ex) < .02) br = lerp(br, .26, (1 - ss(.005, .02, Math.abs(ex))) * ss(.3, .5, rr));
              }
              if (vent > .05) {
                var dx = (Math.abs(ex) - .13) / (.075 * vent + .001), dy = (ey - .04) / (.18 * vent + .001), vd = Math.sqrt(dx * dx + dy * dy);
                br = lerp(br, ct ? .2 : .9, (1 - ss(.7, 1.05, vd)) * ss(.05, .25, vent));
              }
            } else br = CSF;
            val = br;
            val = lerp(val, CSF, ss(.775, .805, r));
            val = lerp(val, SKULL, ss(.825, .855, r));
            val = lerp(val, SCALP + (hash(x >> 1, y >> 1, slice) - .5) * (ct ? 0 : .08), ss(.915, .945, r));
            val = lerp(val, 0, ss(.98, 1.0, r));
            val += (hash(x, y, slice) - .5) * .05 * (val > .02 ? 1 : 0);
          }
          val = val < 0 ? 0 : val > 1 ? 1 : val;
          d[p++] = val * 236; d[p++] = val * 241; d[p++] = val * 255; d[p++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      seLbl.textContent = 'Kesim ' + slice + ' / ' + TOTAL;
      slider.value = slice;
      titleLbl.innerHTML = ct ? 'SAYDANA · MSKT<br>AKSIAL · KT' : 'SAYDANA · MRT<br>AKSIAL · T2';
    }
    var pending = false;
    function schedule() { if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; render(); }); } }
    function setSlice(n) { n = Math.max(1, Math.min(TOTAL, n)); if (n !== slice) { slice = n; schedule(); } }
    function stopAuto() { auto = false; }

    slider.addEventListener('input', function () { stopAuto(); setSlice(parseInt(slider.value, 10)); });
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.mode; stopAuto();
        Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', String(on)); });
        schedule();
      });
    });
    var drag = null;
    viewer.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, s: slice }; stopAuto(); try { viewer.setPointerCapture(e.pointerId); } catch (er) {} });
    viewer.addEventListener('pointermove', function (e) { if (!drag) return; var w = viewer.getBoundingClientRect().width; setSlice(drag.s + Math.round((e.clientX - drag.x) / w * TOTAL * 1.4)); });
    function endDrag() { drag = null; }
    viewer.addEventListener('pointerup', endDrag); viewer.addEventListener('pointercancel', endDrag);

    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .1 }).observe(viewer);
    function loop(ts) {
      if (auto && visible && ts - lastStep > 150) {
        lastStep = ts;
        var n = slice + dir; if (n > TOTAL - 3) { dir = -1; n = TOTAL - 3; } if (n < 4) { dir = 1; n = 4; }
        slice = n; render();
      }
      requestAnimationFrame(loop);
    }
    render();
    if (!reduce) requestAnimationFrame(loop);
  })();
})();
