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

  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('lock'); }
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

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .15 }) : null;
  document.querySelectorAll('.card,.why-item,.sec-head').forEach(function (el) {
    el.classList.add('reveal'); io ? io.observe(el) : el.classList.add('in');
  });
})();
