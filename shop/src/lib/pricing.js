// Katalog + skidka + promokod hisob-kitobi. Do'kon, server (order/promo) va admin — hammasi shu faylni ishlatadi.
const FIELDS = ['name', 'desc', 'size', 'cat', 'img', 'hit', 'isNew', 'hidden', 'stock'];

export function saleActive(s, now = Date.now()) {
  return !!s.active && Number(s.percent) > 0 && (!s.ends || now <= new Date(s.ends + 'T23:59:59').getTime());
}

export function buildCatalog(base, overrides = {}, custom = [], sales = [], now = Date.now()) {
  const act = sales.filter((s) => saleActive(s, now));
  return [...base, ...custom].map((p) => {
    const m = { ...p };
    const o = p.id < 1000 ? overrides[p.id] : null;
    if (o) {
      if (o.price > 0) m.price = o.price;
      if ('oldPrice' in o) m.oldPrice = o.oldPrice || undefined;
      for (const k of FIELDS) if (o[k] !== undefined && o[k] !== null && o[k] !== '') m[k] = o[k];
    }
    let best = 0;
    for (const s of act) if ((s.scope === 'all' || s.scope === m.cat) && Number(s.percent) > best) best = Number(s.percent);
    if (best) {
      m.oldPrice = Math.max(m.oldPrice || 0, m.price);
      m.price = Math.max(100, Math.round((m.price * (1 - best / 100)) / 100) * 100);
      m.sale = best;
    }
    return m;
  });
}

export function promoCheck(promos = [], code, subtotal, now = Date.now()) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return { ok: false, error: 'Promokodni kiriting' };
  const p = promos.find((x) => String(x.code).toUpperCase() === c);
  if (!p || !p.active) return { ok: false, error: 'Promokod topilmadi' };
  if (p.ends && now > new Date(p.ends + 'T23:59:59').getTime()) return { ok: false, error: 'Promokod muddati tugagan' };
  if (p.maxUses > 0 && (p.used || 0) >= p.maxUses) return { ok: false, error: 'Promokod limiti tugagan' };
  if (p.min > 0 && subtotal < p.min) return { ok: false, error: `Minimal buyurtma: ${Number(p.min).toLocaleString('ru-RU')} so'm` };
  let d = p.type === 'fixed' ? Number(p.value) : Math.round((subtotal * Number(p.value)) / 100);
  d = Math.max(0, Math.min(d, subtotal));
  return { ok: true, discount: d, code: p.code, label: p.type === 'fixed' ? `−${Number(p.value).toLocaleString('ru-RU')} so'm` : `−${p.value}%` };
}
