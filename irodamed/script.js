(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var sheet = document.getElementById('sheet');
  var svc = document.getElementById('svc');
  var T = function (k) { return window.I18N ? window.I18N.t(k) : k; };
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
    var txt = T('addr.copy');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
      copy.textContent = T('copied');
    }).catch(function () { copy.textContent = txt; });
    setTimeout(function () { copy.textContent = T('copy'); }, 2500);
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
    exoeg:   { icon: 'i-scan',  g: 'func' },
    uzi:     { icon: 'i-wave',  g: 'us' },
    doppler: { icon: 'i-wave',  g: 'us' },
    echo:    { icon: 'i-heart', g: 'us' },
    ecg:     { icon: 'i-pulse', g: 'func' },
    elasto:  { icon: 'i-scan',  g: 'us' },
    kolpo:   { icon: 'i-scan',  g: 'doc', c: 'gyn' },
    lab:     { icon: 'i-flask', g: 'lab' },
    massage: { icon: 'i-hand',  g: 'mas' }
  };
  var curSvc = null;
  function fillSvc(key) {
    var s = SVC[key], p = 'svc.' + key + '.';
    document.getElementById('svcIcon').setAttribute('href', '#' + s.icon);
    document.getElementById('svcTitle').textContent = T(p + 't');
    document.getElementById('svcDesc').textContent = T(p + 'd');
    document.getElementById('svcFacts').innerHTML = [T(p + 'f1'), T(p + 'f2')].map(function (x) { return '<li>' + tick + '<span>' + x + '</span></li>'; }).join('');
  }
  var svcFocus = null;
  function openSvc(key) {
    var s = SVC[key]; if (!s) return;
    if (svc.hidden) svcFocus = document.activeElement;
    curSvc = key; fillSvc(key);
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
  // "Narxlarni ko'rish": oynani yopib, narxlar bo'limini tegishli bo'lim bilan ochadi
  document.getElementById('svcPrice').addEventListener('click', function () {
    var s = SVC[curSvc]; closeSvc();
    if (window.IrodamedPrices && s) window.IrodamedPrices.show(s.g, s.c);
    var sec = document.getElementById('narxlar'); if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  document.addEventListener('irodamed:lang', function () {
    if (!svc.hidden && curSvc) fillSvc(curSvc);
    Array.prototype.forEach.call(document.querySelectorAll('.doc-photo img'), function (im) { var h = im.closest('.doc').querySelector('h3'); if (h) im.alt = h.textContent; });
  });
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
