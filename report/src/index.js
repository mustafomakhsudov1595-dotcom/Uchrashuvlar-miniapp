// Haftalik hisobot: har yakshanba 20:00 (Toshkent) barcha adminlarga PDF yuboradi.
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PRODUCTS } from '../../shop/src/products.js';
import { buildCatalog } from '../../shop/src/lib/pricing.js';
import regularTtf from './fonts/DejaVuSans.ttf';
import boldTtf from './fonts/DejaVuSans-Bold.ttf';
import logoPng from './logo.png';

const TZ = 5 * 3600e3; // Toshkent UTC+5
const DAY = 86400e3;
const LOW = 10; // shundan kam qolsa "kam qoldi"
const WD = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

const money = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
const dkey = (ts) => new Date(ts + TZ).toISOString().slice(0, 10);
const dfmt = (ts) => { const [y, m, d] = dkey(ts).split('-'); return `${d}.${m}.${y}`; };

/* ---------------- Ma'lumot yig'ish ---------------- */
async function loadOrders(env) {
  const out = [];
  let cursor;
  do {
    const l = await env.KV.list({ prefix: 'order:', limit: 1000, cursor });
    const batch = await Promise.all(l.keys.map((k) => env.KV.get(k.name, 'json')));
    out.push(...batch.filter(Boolean));
    cursor = l.list_complete ? undefined : l.cursor;
  } while (cursor);
  return out;
}

export async function collect(env, now = Date.now()) {
  const start = now - 7 * DAY, prevStart = now - 14 * DAY;
  const [orders, ov, cu] = await Promise.all([loadOrders(env), env.KV.get('overrides', 'json'), env.KV.get('custom', 'json')]);
  const catalog = buildCatalog(PRODUCTS, ov || {}, cu || [], []);
  const inWeek = orders.filter((o) => o.ts > start && o.ts <= now);
  const inPrev = orders.filter((o) => o.ts > prevStart && o.ts <= start);
  const valid = inWeek.filter((o) => o.status !== 'cancel');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const prevRevenue = inPrev.filter((o) => o.status !== 'cancel').reduce((s, o) => s + o.total, 0);
  const discounts = valid.reduce((s, o) => s + (o.discount || 0), 0);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const t = now - i * DAY;
    days.push({ key: dkey(t), label: WD[new Date(t + TZ).getUTCDay()], date: dfmt(t).slice(0, 5), sum: 0, n: 0 });
  }
  for (const o of valid) { const d = days.find((x) => x.key === dkey(o.ts)); if (d) { d.sum += o.total; d.n++; } }

  const agg = new Map();
  for (const o of valid) for (const it of o.items) {
    const a = agg.get(it.id) || { name: it.name, size: it.size, qty: 0, sum: 0 };
    a.qty += it.q; a.sum += it.price * it.q; agg.set(it.id, a);
  }
  const products = [...agg.values()].sort((a, b) => b.sum - a.sum);
  const soldIds = new Set(agg.keys());
  const unsold = catalog.filter((p) => !p.hidden && !soldIds.has(p.id)).map((p) => p.name);
  const low = catalog.filter((p) => !p.hidden && typeof p.stock === 'number' && p.stock <= LOW)
    .map((p) => ({ name: p.name, size: p.size, stock: p.stock })).sort((a, b) => a.stock - b.stock);

  const promoMap = new Map();
  for (const o of valid) if (o.promo) { const a = promoMap.get(o.promo) || { code: o.promo, n: 0, sum: 0 }; a.n++; a.sum += o.discount || 0; promoMap.set(o.promo, a); }

  return {
    start, now, revenue, prevRevenue, discounts, days, products, unsold, low,
    promos: [...promoMap.values()],
    counts: { all: inWeek.length, valid: valid.length, done: inWeek.filter((o) => o.status === 'done').length, pending: inWeek.filter((o) => (o.status || 'new') === 'new').length, cancel: inWeek.filter((o) => o.status === 'cancel').length },
    avg: valid.length ? revenue / valid.length : 0,
    items: valid.reduce((s, o) => s + o.items.reduce((q, i) => q + i.q, 0), 0),
  };
}

/* ---------------- PDF ---------------- */
const C = {
  navy: rgb(0.043, 0.063, 0.188), indigo: rgb(0.31, 0.275, 0.9), sky: rgb(0.055, 0.647, 0.914), gold: rgb(0.96, 0.77, 0.33),
  text: rgb(0.06, 0.09, 0.16), muted: rgb(0.4, 0.45, 0.55), line: rgb(0.89, 0.91, 0.95), card: rgb(0.95, 0.96, 0.99),
  green: rgb(0.06, 0.62, 0.45), red: rgb(0.9, 0.2, 0.3), amber: rgb(0.85, 0.5, 0.05), white: rgb(1, 1, 1),
};

export async function buildPdf(d) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const F = await pdf.embedFont(regularTtf, { subset: true });
  const B = await pdf.embedFont(boldTtf, { subset: true });
  const logo = await pdf.embedPng(logoPng);
  const W = 595.28, H = 841.89, M = 40;
  let page, y, pageNo = 0;

  const fit = (t, font, size, w) => { t = String(t); if (font.widthOfTextAtSize(t, size) <= w) return t; while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > w) t = t.slice(0, -1); return t + '…'; };
  const txt = (t, x, yy, { size = 10, font = F, color = C.text, align = 'left', w } = {}) => {
    t = String(t); if (w) t = fit(t, font, size, w);
    const tw = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x, y: yy, size, font, color });
  };
  const newPage = (first) => {
    page = pdf.addPage([W, H]); pageNo++;
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white });
    if (first) {
      page.drawRectangle({ x: 0, y: H - 118, width: W, height: 118, color: C.navy });
      page.drawRectangle({ x: 0, y: H - 122, width: W, height: 4, color: C.gold });
      page.drawImage(logo, { x: M, y: H - 98, width: 70, height: 70 });
      txt('Haftalik hisobot', M + 88, H - 62, { size: 26, font: B, color: C.white });
      txt(`${dfmt(d.start)}  —  ${dfmt(d.now)}`, M + 88, H - 84, { size: 12, color: rgb(0.7, 0.8, 1) });
      txt('CHILLING BET', W - M, H - 58, { size: 13, font: B, color: C.gold, align: 'right' });
      txt("Premium do'kon", W - M, H - 74, { size: 9.5, color: rgb(0.7, 0.75, 0.9), align: 'right' });
      y = H - 150;
    } else {
      page.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: C.navy });
      txt('Chilling Bet · Haftalik hisobot', M, H - 22, { size: 10, font: B, color: C.white });
      txt(`${dfmt(d.start)} — ${dfmt(d.now)}`, W - M, H - 22, { size: 9, color: rgb(0.7, 0.8, 1), align: 'right' });
      y = H - 64;
    }
  };
  const need = (h) => { if (y - h < 56) newPage(false); };
  const section = (title, sub) => {
    need(60);
    page.drawRectangle({ x: M, y: y - 3, width: 4, height: 18, color: C.indigo });
    txt(title, M + 12, y, { size: 14, font: B });
    if (sub) txt(sub, W - M, y + 1, { size: 9, color: C.muted, align: 'right' });
    y -= 26;
  };
  const tableHead = (cols) => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: C.card });
    cols.forEach((c) => txt(c.t, c.x, y, { size: 9, font: B, color: C.muted, align: c.align }));
    y -= 24;
  };

  newPage(true);

  /* KPI kartochkalar */
  const delta = d.prevRevenue > 0 ? Math.round(((d.revenue - d.prevRevenue) / d.prevRevenue) * 100) : null;
  const kpis = [
    { t: 'DAROMAD', v: money(d.revenue), s: delta === null ? 'o‘tgan hafta: yo‘q' : `o‘tgan haftaga ${delta >= 0 ? '+' : ''}${delta}%`, c: delta === null ? C.muted : delta >= 0 ? C.green : C.red, bg: C.indigo },
    { t: 'BUYURTMALAR', v: String(d.counts.valid), s: `bajarilgan: ${d.counts.done} · kutilmoqda: ${d.counts.pending}`, c: C.muted },
    { t: 'O‘RTACHA CHEK', v: money(d.avg), s: `${d.items} ta mahsulot sotildi`, c: C.muted },
    { t: 'BEKOR QILINGAN', v: String(d.counts.cancel), s: d.discounts ? `promokod chegirmasi: ${money(d.discounts)}` : 'promokod ishlatilmagan', c: C.muted },
  ];
  const cw = (W - 2 * M - 3 * 10) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (cw + 10);
    page.drawRectangle({ x, y: y - 62, width: cw, height: 72, color: i === 0 ? C.indigo : C.card });
    const fg = i === 0 ? C.white : C.text, sub = i === 0 ? rgb(0.82, 0.88, 1) : k.c;
    txt(k.t, x + 10, y - 4, { size: 7.5, font: B, color: i === 0 ? rgb(0.78, 0.84, 1) : C.muted });
    txt(k.v, x + 10, y - 26, { size: i === 0 || k.v.length > 11 ? 11.5 : 17, font: B, color: fg, w: cw - 16 });
    txt(k.s, x + 10, y - 46, { size: 7.2, color: i === 0 ? sub : k.c, w: cw - 16 });
  });
  y -= 96;

  /* Kunlik daromad grafigi */
  section('Kunlik daromad', 'so‘mda');
  const chartH = 105, chartW = W - 2 * M, bw = chartW / 7;
  const max = Math.max(1, ...d.days.map((x) => x.sum));
  for (let g = 0; g <= 3; g++) page.drawLine({ start: { x: M, y: y - 8 - chartH + (chartH * g) / 3 }, end: { x: W - M, y: y - 8 - chartH + (chartH * g) / 3 }, thickness: 0.5, color: C.line });
  d.days.forEach((x, i) => {
    const h = (x.sum / max) * (chartH - 16);
    const bx = M + i * bw + bw * 0.2, w = bw * 0.6, by = y - 8 - chartH;
    if (h > 0) page.drawRectangle({ x: bx, y: by, width: w, height: h, color: i === 6 ? C.sky : C.indigo });
    if (x.sum > 0) txt(x.sum >= 1e6 ? (x.sum / 1e6).toFixed(1) + ' mln' : Math.round(x.sum / 1000) + ' ming', bx + w / 2, by + h + 4, { size: 7.5, font: B, align: 'center' });
    txt(x.label, bx + w / 2, by - 12, { size: 8.5, font: B, align: 'center', color: C.text });
    txt(x.date, bx + w / 2, by - 22, { size: 7.5, align: 'center', color: C.muted });
  });
  y -= chartH + 58;

  /* Eng ko'p sotilganlar */
  section('Qaysi mahsulotdan qancha sotildi', `${d.products.length} xil mahsulot`);
  if (!d.products.length) { txt('Bu hafta sotuv bo‘lmadi.', M, y, { color: C.muted }); y -= 24; }
  else {
    const cols = [{ t: '#', x: M + 8 }, { t: 'MAHSULOT', x: M + 30 }, { t: 'SONI', x: W - M - 150, align: 'right' }, { t: 'DAROMAD', x: W - M - 8, align: 'right' }];
    tableHead(cols);
    const top = d.products[0].sum || 1;
    d.products.forEach((p, i) => {
      need(30); if (y > H - 100 && false) return;
      if (y === H - 64) tableHead(cols);
      if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: rgb(0.985, 0.99, 1) });
      txt(i + 1, M + 8, y, { size: 9.5, color: C.muted });
      txt(p.name, M + 30, y + 3, { size: 9.5, font: B, w: 250 });
      page.drawRectangle({ x: M + 30, y: y - 6, width: Math.max(2, 200 * (p.sum / top)), height: 3, color: i === 0 ? C.gold : C.sky });
      txt(`${p.qty} ta`, W - M - 150, y, { size: 10, font: B, align: 'right' });
      txt(money(p.sum), W - M - 8, y, { size: 10, font: B, align: 'right' });
      y -= 26;
    });
    y -= 6;
  }

  /* Kam qolgan */
  section('Nimadan kam qoldi', `${LOW} tadan kam qolganlar`);
  if (!d.low.length) { txt('Hammasi yetarli (qoldiq kiritilgan mahsulotlar bo‘yicha).', M, y, { color: C.green }); y -= 24; }
  else {
    const cols = [{ t: 'MAHSULOT', x: M + 8 }, { t: 'QOLDIQ', x: W - M - 8, align: 'right' }];
    tableHead(cols);
    d.low.forEach((p, i) => {
      need(30);
      if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: rgb(0.985, 0.99, 1) });
      txt(`${p.name}${p.size ? '  ·  ' + p.size : ''}`, M + 8, y, { size: 9.5, w: 360 });
      const out = p.stock === 0;
      txt(out ? 'TUGAGAN' : `${p.stock} ta`, W - M - 8, y, { size: 10, font: B, align: 'right', color: out ? C.red : C.amber });
      y -= 26;
    });
    y -= 6;
  }

  /* Promokodlar */
  if (d.promos.length) {
    section('Promokodlar', 'shu hafta');
    d.promos.forEach((p) => { need(24); txt(p.code, M + 8, y, { size: 10, font: B }); txt(`${p.n} marta`, W - M - 150, y, { size: 10, align: 'right' }); txt(`−${money(p.sum)}`, W - M - 8, y, { size: 10, font: B, align: 'right', color: C.green }); y -= 22; });
    y -= 8;
  }

  /* Sotilmagan */
  if (d.unsold.length) {
    section('Sotilmagan mahsulotlar', `${d.unsold.length} ta`);
    const t = d.unsold.join(' · ');
    // qatorlarga bo'lish
    const words = t.split(' '); let line = '';
    for (const w of words) {
      if (F.widthOfTextAtSize(line + ' ' + w, 9) > W - 2 * M - 10) { need(16); txt(line, M + 8, y, { size: 9, color: C.muted }); y -= 14; line = w; } else line += (line ? ' ' : '') + w;
    }
    if (line) { need(16); txt(line, M + 8, y, { size: 9, color: C.muted }); y -= 14; }
  }

  /* Footer */
  const total = pdf.getPageCount();
  pdf.getPages().forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 38 }, end: { x: W - M, y: 38 }, thickness: 0.5, color: C.line });
    pg.drawText(`Avtomatik hisobot · ${dfmt(d.now)} ${new Date(d.now + TZ).toISOString().slice(11, 16)} (Toshkent)`, { x: M, y: 24, size: 8, font: F, color: C.muted });
    pg.drawText(`${i + 1} / ${total}`, { x: W - M - 30, y: 24, size: 8, font: F, color: C.muted });
  });
  return pdf.save();
}

/* ---------------- Telegramga yuborish ---------------- */
async function send(env, { dryRun } = {}) {
  const d = await collect(env);
  const bytes = await buildPdf(d);
  const admins = JSON.parse((await env.KV.get('admins')) || '[]');
  const name = `Haftalik-hisobot-${dkey(d.now)}.pdf`;
  const delta = d.prevRevenue > 0 ? Math.round(((d.revenue - d.prevRevenue) / d.prevRevenue) * 100) : null;
  const caption = `📊 <b>Haftalik hisobot</b>\n${dfmt(d.start)} — ${dfmt(d.now)}\n\n💰 Daromad: <b>${money(d.revenue)}</b>${delta === null ? '' : ` (${delta >= 0 ? '📈 +' : '📉 '}${delta}%)`}\n📦 Buyurtmalar: <b>${d.counts.valid}</b>\n🛍 Sotilgan mahsulot: <b>${d.items} ta</b>` + (d.low.length ? `\n⚠️ Kam qolgan: <b>${d.low.length} xil</b>` : '');
  if (dryRun) return { bytes, admins: admins.length, d };
  let ok = 0;
  for (const chat_id of admins) {
    const fd = new FormData();
    fd.append('chat_id', String(chat_id)); fd.append('caption', caption); fd.append('parse_mode', 'HTML');
    fd.append('document', new Blob([bytes], { type: 'application/pdf' }), name);
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
    if (r.ok) ok++;
  }
  return { sent: ok, admins: admins.length, orders: d.counts.valid, revenue: d.revenue };
}

export default {
  async scheduled(_e, env, ctx) { ctx.waitUntil(send(env)); },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.headers.get('x-key') !== env.ADMIN_PASSWORD || !env.ADMIN_PASSWORD) return new Response('forbidden', { status: 403 });
    if (u.pathname === '/pdf') { const { bytes } = await send(env, { dryRun: true }); return new Response(bytes, { headers: { 'content-type': 'application/pdf' } }); }
    if (u.pathname === '/send') return Response.json(await send(env));
    return new Response('ok');
  },
};
