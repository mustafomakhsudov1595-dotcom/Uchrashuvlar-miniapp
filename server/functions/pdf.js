'use strict';
// Oylik hisobot PDF: kutubxonasiz, vektor chizmalar bilan. Standart shriftlar (lotin) ishlatiladi.
const S = require('./_shared');

const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
function ascii(s) {
  let o = '';
  for (const ch of String(s == null ? '' : s).replace(/[ʻʼ’‘`´]/g, "'").replace(/[–—]/g, '-').replace(/[“”«»]/g, '"')) {
    const low = ch.toLowerCase();
    if (CYR[low] !== undefined) { const r = CYR[low]; o += ch === low ? r : r.charAt(0).toUpperCase() + r.slice(1); } else o += ch;
  }
  return o.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?');
}
const pe = (s) => ascii(s).replace(/([\\()])/g, '\\$1');
const hex = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
const cw = (ch, b) => (/\d/.test(ch) ? 0.556 : ch === ' ' ? 0.278 : /[ijl.,:;'|!]/.test(ch) ? 0.25 : /[mwMW]/.test(ch) ? 0.82 : /[A-Z]/.test(ch) ? 0.67 : b ? 0.58 : 0.52);
const tw = (s, size, b) => [...ascii(s)].reduce((n, ch) => n + cw(ch, b), 0) * size;

class Page {
  constructor() { this.o = []; }
  rect(x, y, w, h, c) { this.o.push(`${hex(c)} rg ${x.toFixed(1)} ${(842 - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`); }
  text(s, x, y, size = 10, c = '#1d1f2a', b = false, align = 'l') {
    const w = tw(s, size, b);
    const px = align === 'r' ? x - w : align === 'c' ? x - w / 2 : x;
    this.o.push(`BT /${b ? 'F2' : 'F1'} ${size} Tf ${hex(c)} rg ${px.toFixed(1)} ${(842 - y).toFixed(1)} Td (${pe(s)}) Tj ET`);
  }
  line(x1, y, x2, c = '#e3dfd6') { this.o.push(`${hex(c)} RG 0.6 w ${x1} ${(842 - y).toFixed(1)} m ${x2} ${(842 - y).toFixed(1)} l S`); }
}
function build(pages) {
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // pages (keyin toʻldiriladi)
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const pg of pages) {
    const content = pg.o.join('\n');
    const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pid = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`);
    kids.push(`${pid} 0 R`);
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xr = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

const SH_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const SH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const L = {
  uz: { title: 'Oylik hisobot', income: 'Daromad', exp: 'Chiqim', profit: 'Foyda', debt: 'Qarzdorlik', trend: 'Oxirgi 6 oy', byType: 'Daromad turlari boyicha', clients: 'Eng yaxshi mijozlar', cats: 'Chiqimlar turlari', pays: 'Yaqin 30 kundagi tolovlar', none: 'Malumot yoq', types: { site: 'Sayt', bot: 'Bot', video: 'Video', other: 'Boshqa', sub: 'Oylik' }, excats: { ads: 'Reklama', team: 'Hamkor', host: 'Hosting/domen', tools: 'Dastur', other: 'Boshqa' }, proj: 'Faol loyihalar', done: 'Tugagan', svc: 'Servis saytlar', meet: 'Uchrashuvlar', cur: 'so\'m', legendI: 'Daromad', legendE: 'Chiqim' },
  en: { title: 'Monthly report', income: 'Income', exp: 'Expenses', profit: 'Profit', debt: 'Outstanding', trend: 'Last 6 months', byType: 'Income by type', clients: 'Top clients', cats: 'Expenses by category', pays: 'Payables, next 30 days', none: 'No data', types: { site: 'Sites', bot: 'Bots', video: 'Video', other: 'Other', sub: 'Monthly' }, excats: { ads: 'Ads', team: 'Team', host: 'Hosting/domain', tools: 'Tools', other: 'Other' }, proj: 'Active projects', done: 'Completed', svc: 'Service sites', meet: 'Meetings', cur: 'UZS', legendI: 'Income', legendE: 'Expenses' },
};
L.ru = L.en;

function report(u, ym, now = Date.now()) {
  const lang = u.lang === 'uz' ? 'uz' : 'en', P = L[lang], MN = S.Tof(u).months || S.Tof(u).p.months;
  const cur = (n) => `${S.money(n)}`;
  const pays = S.paymentsOf(u).filter((x) => x.d.slice(0, 7) === ym);
  const income = pays.reduce((n, x) => n + x.a, 0);
  const exps = (u.expenses || []).filter((x) => x.d.slice(0, 7) === ym);
  const expense = exps.reduce((n, x) => n + x.a, 0);
  const byKind = {}; for (const x of pays) byKind[x.k in P.types ? x.k : 'other'] = (byKind[x.k in P.types ? x.k : 'other'] || 0) + x.a;
  const byCat = {}; for (const x of exps) byCat[x.cat] = (byCat[x.cat] || 0) + x.a;
  const byClient = new Map();
  for (const p of u.projects) { let n = 0; for (const x of p.pays || []) if (x.d.slice(0, 7) === ym) n += x.a; if (n) byClient.set(p.client || p.name, (byClient.get(p.client || p.name) || 0) + n); }
  for (const s of u.subs) { let n = 0; for (const x of s.pays || []) if (x.d.slice(0, 7) === ym) n += x.a; if (n) byClient.set(s.client || s.name, (byClient.get(s.client || s.name) || 0) + n); }
  const top = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const series = S.incomeByMonth(u, 6, `${ym}-01`);
  const d30 = S.addDaysISO(S.todayISO(u.tz, now), 30);
  const open = S.payOpen(u).filter((x) => x.due <= d30).slice(0, 10);
  const [y, m] = ym.split('-').map(Number);

  const pg = new Page();
  const GOLD = '#e8b15a', INK = '#1d1f2a', MUT = '#7b8094', CARD = '#f5f2ea';
  pg.rect(0, 0, 595, 120, '#14172b');
  pg.rect(0, 116, 595, 4, GOLD);
  pg.text('IMPRO IT NOTES', 40, 44, 10, GOLD, true);
  pg.text(P.title, 40, 78, 26, '#ffffff', true);
  pg.text(`${MN[m - 1]} ${y}`, 555, 78, 16, GOLD, true, 'r');

  // KPI kartalari
  const kp = [[P.income, income, '#2e9b6a'], [P.exp, expense, '#d95050'], [P.profit, income - expense, income - expense >= 0 ? '#2e9b6a' : '#d95050'], [P.debt, S.activeDebt(u), '#4a7bd8']];
  kp.forEach(([l, v, c], i) => {
    const x = 40 + i * 132;
    pg.rect(x, 144, 123, 74, CARD); pg.rect(x, 144, 4, 74, c);
    pg.text(l, x + 14, 166, 9, MUT, true);
    pg.text(`${v < 0 ? '-' : ''}${cur(Math.abs(v))}`, x + 14, 195, 15, INK, true);
    pg.text(P.cur, x + 14, 209, 8, MUT);
  });

  // 6 oylik ustunlar
  pg.text(P.trend, 40, 252, 12, INK, true);
  const max = Math.max(1, ...series.map((s) => Math.max(s.total, s.exp)));
  pg.rect(40, 262, 515, 120, CARD);
  series.forEach((s, i) => {
    const bx = 62 + i * 82, base = 360, hh = (v) => Math.max(v ? 2 : 0, (v / max) * 76);
    pg.rect(bx, base - hh(s.total), 22, hh(s.total), '#e8b15a');
    pg.rect(bx + 26, base - hh(s.exp), 22, hh(s.exp), '#d95050');
    pg.text((lang === 'uz' ? SH_UZ : SH_EN)[Number(s.m.slice(5)) - 1], bx + 24, base + 14, 8, s.m === ym ? INK : MUT, s.m === ym, 'c');
    if (s.total) pg.text(S.money(s.total / 1000) + 'k', bx + 11, base - hh(s.total) - 4, 7, MUT, false, 'c');
  });
  pg.rect(430, 244, 8, 8, '#e8b15a'); pg.text(P.legendI, 442, 252, 8, MUT);
  pg.rect(494, 244, 8, 8, '#d95050'); pg.text(P.legendE, 506, 252, 8, MUT);

  // Turlar boyicha daromad
  let yy = 412;
  const bars = (title, rows, total, color, x0, w) => {
    pg.text(title, x0, yy, 12, INK, true);
    let ry = yy + 22;
    if (!rows.length) pg.text(P.none, x0, ry, 9, MUT);
    for (const [name, v] of rows) {
      pg.text(name, x0, ry, 9, INK);
      pg.text(cur(v), x0 + w, ry, 9, INK, true, 'r');
      pg.rect(x0, ry + 5, w, 5, '#ebe7dc'); pg.rect(x0, ry + 5, Math.max(2, (v / (total || 1)) * w), 5, color);
      ry += 28;
    }
    return ry;
  };
  const r1 = bars(P.byType, Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => [P.types[k], v]), income, GOLD, 40, 240);
  const r2 = bars(P.cats, Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [P.excats[k] || k, v]), expense, '#d95050', 315, 240);
  yy = Math.max(r1, r2) + 8;

  // Mijozlar va tolovlar
  pg.line(40, yy - 12, 555);
  pg.text(P.clients, 40, yy + 4, 12, INK, true);
  let cy = yy + 24;
  if (!top.length) pg.text(P.none, 40, cy, 9, MUT);
  top.forEach(([n, v], i) => { pg.text(`${i + 1}. ${n}`.slice(0, 30), 40, cy, 9, INK); pg.text(cur(v), 280, cy, 9, INK, true, 'r'); cy += 17; });
  pg.text(P.pays, 315, yy + 4, 12, INK, true);
  let py = yy + 24;
  if (!open.length) pg.text(P.none, 315, py, 9, MUT);
  for (const x of open) { pg.text(`${x.due.slice(8)}.${x.due.slice(5, 7)}  ${x.who}`.slice(0, 28), 315, py, 9, INK); pg.text(cur(S.payLeft(x)), 555, py, 9, INK, true, 'r'); py += 17; }

  // Pastki qator
  const act = S.activeProjects(u).length, dn = u.projects.filter((p) => p.status === 'done').length;
  pg.rect(0, 800, 595, 42, '#14172b');
  pg.text(`${P.proj}: ${act}   |   ${P.done}: ${dn}   |   ${P.svc}: ${u.services.length}   |   ${P.meet}: ${u.meetings.filter((x) => x.date.slice(0, 7) === ym).length}`, 40, 825, 9, '#ffffff', true);
  return { pdf: build([pg]), income, expense, name: `hisobot-${ym}.pdf` };
}
module.exports = { report, build, ascii };
