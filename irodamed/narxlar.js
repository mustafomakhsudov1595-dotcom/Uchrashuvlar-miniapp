/* Irodamed — narxlar bo'limi: bo'limlar, qidiruv, 4 til. Ma'lumot: prices.js */
(function () {
  'use strict';
  var P = window.IRODAMED_PRICES, I = window.I18N;
  var tabsEl = document.getElementById('prTabs'), body = document.getElementById('prBody');
  var q = document.getElementById('prQ'), clr = document.getElementById('prClr');
  if (!P || !I || !tabsEl || !body || !q) return;

  var LI = { uz: 0, ru: 1, kk: 2, en: 3 };
  var group = P.groups[0].id, query = '', open = {}, wantCat = null;

  function nm(v) { return typeof v === 'string' ? v : (v[LI[I.lang]] || v[0]); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[ʼ’‘`'ʻ]/g, '').replace(/\s+/g, ' '); }

  // qidiruv uchun: har bir qator barcha 4 tildagi nomi bilan indekslanadi
  P.groups.forEach(function (g) {
    g.cats.forEach(function (c) {
      c.rows.forEach(function (r) { r.h = norm(typeof r[0] === 'string' ? r[0] : r[0].join(' ')); });
    });
  });

  function rowHtml(r, meta) {
    var h = '<li class="pr-row' + (meta ? '' : ' nm') + '"><span class="pr-n">' + esc(nm(r[0])) + '</span>';
    if (meta && (r[2] || r[3])) {
      h += '<span class="pr-m"><span class="pr-d">' + (r[2] ? esc(I.fmtDays(r[2])) : '') + '</span><span class="pr-c">' + (r[3] ? esc(nm(P.cont[r[3]])) : '') + '</span></span>';
    }
    return h + '<span class="pr-p"><b>' + I.fmtPrice(r[1]) + '</b> <small>' + esc(I.t('price.unit')) + '</small></span></li>';
  }
  function hasMeta(c) { return c.rows.some(function (r) { return r[2] || r[3]; }); }
  function listHtml(c, rows) {
    var meta = hasMeta(c);
    return '<ul class="pr-list">' + rows.map(function (r) { return rowHtml(r, meta); }).join('') + '</ul>';
  }
  function headHtml() {
    return '<div class="pr-head" aria-hidden="true"><span>' + esc(I.t('price.name')) + '</span><span>' + esc(I.t('price.term')) + '</span><span>' + esc(I.t('price.cont')) + '</span><span>' + esc(I.t('price.price')) + '</span></div>';
  }
  function catHtml(c, rows, isOpen, suffix) {
    return '<details class="pr-cat" data-cat="' + c.id + '"' + (isOpen ? ' open' : '') + '><summary><span class="pr-ct">' + esc(nm(c.n)) + (suffix ? ' <em>' + esc(suffix) + '</em>' : '') + '</span><span class="pr-cn">' + rows.length + '</span></summary>' + listHtml(c, rows) + '</details>';
  }

  function renderTabs() {
    tabsEl.innerHTML = P.groups.map(function (g) {
      var on = !query && g.id === group;
      return '<button type="button" data-g="' + g.id + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') + '>' + esc(nm(g.n)) + '</button>';
    }).join('');
  }

  function render() {
    renderTabs();
    clr.hidden = !query;
    var html = '';
    if (query) {
      var toks = norm(query).trim().split(' '), total = 0;
      P.groups.forEach(function (g) {
        g.cats.forEach(function (c) {
          var rows = c.rows.filter(function (r) { return toks.every(function (t) { return r.h.indexOf(t) > -1; }); });
          if (!rows.length) return;
          total += rows.length;
          html += catHtml(c, rows, true, nm(g.n));
        });
      });
      html = total ? '<p class="pr-found">' + esc(I.t('price.found')) + ' <b>' + total + '</b></p>' + html
                   : '<p class="pr-empty">' + esc(I.t('price.empty')) + '</p>';
    } else {
      var g = P.groups.filter(function (x) { return x.id === group; })[0];
      if (g.cats.length === 1) {
        html = (hasMeta(g.cats[0]) ? headHtml() : '') + listHtml(g.cats[0], g.cats[0].rows);
      } else {
        html = (g.cats.some(hasMeta) ? headHtml() : '') + g.cats.map(function (c, i) {
          var isOpen = open[c.id] !== undefined ? open[c.id] : (i === 0);
          if (wantCat) isOpen = c.id === wantCat;
          return catHtml(c, c.rows, isOpen);
        }).join('');
      }
    }
    body.innerHTML = html;
    wantCat = null;
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    group = b.getAttribute('data-g'); query = ''; q.value = ''; render();
  });
  body.addEventListener('toggle', function (e) {
    var d = e.target; if (d.classList && d.classList.contains('pr-cat') && !query) open[d.getAttribute('data-cat')] = d.open;
  }, true);
  q.addEventListener('input', function () { query = q.value.trim(); render(); });
  clr.addEventListener('click', function () { q.value = ''; query = ''; render(); q.focus(); });
  document.addEventListener('irodamed:lang', render);

  // Tashqaridan chaqirish: xizmat oynasidan "Narxlarni ko'rish"
  window.IrodamedPrices = {
    show: function (g, cat) {
      if (g) group = g; query = ''; q.value = ''; wantCat = cat || null;
      if (wantCat) open[wantCat] = true;
      render();
    }
  };
  render();
})();
