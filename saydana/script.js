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
  window.addEventListener('resize', function () { if (window.innerWidth > 720) closeMenu(); });

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
    document.querySelectorAll('.card,.b,.why-item,.step,.chips li,.faq details,.sec-head,.stats li').forEach(function (el) {
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
})();
