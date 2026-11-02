(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var sheet = document.getElementById('sheet');
  var svc = document.getElementById('svc');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // Menyu
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); if (sheet.hidden && svc.hidden) document.body.classList.remove('lock'); }
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('lock', open);
  });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1040) closeMenu(); });

  // Manzilni nusxalash
  var copy = document.getElementById('copy');
  copy.addEventListener('click', function () {
    var txt = "Toshkent shahri, Olmazor tumani, Sebzor G'afur G'ulom ko'chasi, Ts-17-18, 2B-uy (mo'ljal: Usta Alim, 2A)";
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      copy.textContent = 'Nusxalandi ✓';
    }).catch(function () { copy.textContent = txt; });
    setTimeout(function () { copy.textContent = 'Manzilni nusxalash'; }, 2500);
  });

  // Xarita ilovasini tanlash
  var Q = 'Irodamed Sebzor 2B Toshkent', ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua), isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  function setApp(id, href, show) { var a = document.getElementById(id); a.href = href; a.hidden = !show; }
  setApp('app-geo', 'geo:0,0?q=' + encodeURIComponent(Q), isAndroid);
  setApp('app-apple', 'https://maps.apple.com/?q=' + encodeURIComponent(Q), isApple && !isAndroid);
  setApp('app-google', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(Q), true);
  setApp('app-yandex', 'https://yandex.uz/maps/-/CTteqKke', true);
  setApp('app-2gis', 'https://2gis.uz/tashkent/firm/70000001041372178', true);
  var lastFocus = null;
  function lockOff() { if (sheet.hidden && svc.hidden && !menu.classList.contains('open')) document.body.classList.remove('lock'); }
  function openSheet(e) { if (e) e.preventDefault(); lastFocus = document.activeElement; sheet.hidden = false; document.body.classList.add('lock'); var f = sheet.querySelector('.app:not([hidden])'); if (f) f.focus(); }
  function closeSheet() { sheet.hidden = true; lockOff(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.getElementById('mapHit').addEventListener('click', openSheet);
  document.getElementById('mapBtn').addEventListener('click', openSheet);
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); else if (e.target.closest('.app')) setTimeout(closeSheet, 200); });

  // Xizmat oynasi
  var tick = '<svg class="ic"><use href="#i-check"/></svg>';
  var SVC = {
    exoeg:   { icon: 'i-scan',  t: 'Exo-EG', d: "Bosh miyaning ultratovush tekshiruvi.", f: ["Nurlanishsiz, og'riqsiz tekshiruv", "Bosh miya tuzilmalarini ultratovush bilan baholaydi"] },
    uzi:     { icon: 'i-wave',  t: 'UZI', d: "Ultratovush tekshiruvi — barcha a'zolar.", f: ["Nurlanishsiz, og'riqsiz tekshiruv", "Natija tekshiruv vaqtida ma'lum bo'ladi"] },
    doppler: { icon: 'i-wave',  t: 'Doppler', d: "Qon oqimini ultratovush bilan tekshirish — barcha a'zolar.", f: ["Qon tomirlardagi qon oqimini baholaydi", "Nurlanishsiz, og'riqsiz tekshiruv"] },
    echo:    { icon: 'i-heart', t: 'Exokardiografiya', d: "Yurak ultratovush tekshiruvi.", f: ["Yurak kameralari va qopqoqlari holatini ko'rsatadi", "Nurlanishsiz, og'riqsiz tekshiruv"] },
    ecg:     { icon: 'i-pulse', t: 'EKG', d: "Elektrokardiografiya — yurak ritmini baholash.", f: ["Bir necha daqiqa davom etadi", "Og'riqsiz va xavfsiz"] },
    elasto:  { icon: 'i-scan',  t: 'Elastografiya', d: "Jigar, ko'krak, qalqonsimon bez — to'qimalar qattiqligini baholash.", f: ["Ultratovush asosida bajariladi", "Jigar, ko'krak va qalqonsimon bez uchun"] },
    kolpo:   { icon: 'i-scan',  t: 'Kolposkopiya', d: "Ginekologik ko'rik.", f: ["Bachadon bo'ynini maxsus asbob bilan kattalashtirib ko'rish", "Ginekolog tomonidan o'tkaziladi"] },
    lab:     { icon: 'i-flask', t: 'Laboratoriya', d: "Laboratoriya xizmatlari.", f: ["Qon tahlili va boshqa tekshiruvlar", "Tahlillar ro'yxatini markazdan aniqlang"] },
    massage: { icon: 'i-hand',  t: 'Bolalar massaji', d: "Bolalar uchun massaj.", f: ["Bolalar uchun xizmat", "Qabul vaqtini markazdan aniqlang"] }
  };
  var svcFocus = null;
  function openSvc(key) {
    var s = SVC[key]; if (!s) return;
    if (svc.hidden) svcFocus = document.activeElement;
    document.getElementById('svcIcon').setAttribute('href', '#' + s.icon);
    document.getElementById('svcTitle').textContent = s.t;
    document.getElementById('svcDesc').textContent = s.d;
    document.getElementById('svcFacts').innerHTML = s.f.map(function (x) { return '<li>' + tick + '<span>' + x + '</span></li>'; }).join('');
    svc.hidden = false; document.body.classList.add('lock');
    svc.querySelector('.svc-box').scrollTop = 0;
    svc.querySelector('.svc-call').focus({ preventScroll: true });
  }
  function closeSvc() { svc.hidden = true; lockOff(); if (svcFocus && svcFocus.focus) svcFocus.focus(); }
  Array.prototype.forEach.call(document.querySelectorAll('.b[data-svc]'), function (card) {
    card.addEventListener('click', function () { openSvc(card.dataset.svc); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSvc(card.dataset.svc); } });
  });
  svc.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSvc(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!svc.hidden) closeSvc(); else if (!sheet.hidden) closeSheet(); else closeMenu();
  });

  // Bugungi kunni ajratib ko'rsatish (Toshkent vaqti)
  try {
    var wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', weekday: 'short' }).format(new Date());
    var dn = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
    Array.prototype.forEach.call(document.querySelectorAll('#hours tr'), function (tr) { if (tr.dataset.d.split(',').indexOf(String(dn)) > -1) tr.classList.add('today'); });
  } catch (e) {}

  // Shifokor suratlari: img/doctors/<nom>.webp (yoki .jpg/.png). Topilmasa bosh harflar qoladi.
  Array.prototype.forEach.call(document.querySelectorAll('.doc[data-slug]'), function (d) {
    var exts = ['webp', 'jpg', 'png'], i = 0, box = d.querySelector('.doc-photo');
    var name = d.querySelector('h3').textContent;
    (function next() {
      if (i >= exts.length) return;
      var im = new Image();
      im.onload = function () { im.alt = name; im.decoding = 'async'; box.insertBefore(im, box.firstChild); var ini = box.querySelector('.ini'); if (ini) ini.style.display = 'none'; };
      im.onerror = function () { i++; next(); };
      im.src = 'img/doctors/' + d.dataset.slug + '.' + exts[i];
    })();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  // Paydo bo'lish
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
    Array.prototype.forEach.call(document.querySelectorAll('.b,.sec-head,.info-row>div,.specs li,.info,.doc'), function (el) {
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 6) * 0.06 + 's');
      el.classList.add('reveal'); io.observe(el);
    });
  }

  // Sarlavha chizig'i va faol menyu
  var header = document.getElementById('top');
  function onScroll() { header.classList.toggle('scrolled', (window.scrollY || document.documentElement.scrollTop) > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (hasIO) {
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('#menu a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(links).forEach(function (k) { var s = document.getElementById(k); if (s) sio.observe(s); });
  }
})();
