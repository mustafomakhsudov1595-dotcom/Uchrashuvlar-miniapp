'use strict';
// "Direktor": har dushanba haftalik biznes tahlili + bitta aniq tavsiya, va /prognoz ("agar ... boʻlsa" hisobi).
// /direktor — hozir hisobot, /prognoz [N] [narx] — yil oxirigacha bashorat.
const S = require('./_shared');
const { tg, esc } = S;

const send = (chat, text, markup) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
const store = () => S.openStore({});
const eq = (x) => S.toUzs(x.a, x.w);
const sums = (u, from, to) => {
  let inc = 0, out = 0;
  for (const e of S.ledger(u, from, to)) { if (e.dir === 'in') inc += eq(e); else if (e.dir === 'out') out += eq(e); }
  return { inc, out, net: inc - out };
};
const pct = (a, b) => (b > 0 ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}%` : '');
const mon = (n) => S.money(Math.round(n));

// Oʻtgan toʻliq hafta (dushanba–yakshanba) va undan oldingisi
function weekRanges(today) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // dushanba = 0
  const thisMon = S.addDaysISO(today, -dow), lastMon = S.addDaysISO(thisMon, -7), prevMon = S.addDaysISO(thisMon, -14);
  return { last: [lastMon, S.addDaysISO(thisMon, -1)], prev: [prevMon, S.addDaysISO(lastMon, -1)], thisMon };
}

function facts(u, today) {
  const wr = weekRanges(today), a = sums(u, ...wr.last), b = sums(u, ...wr.prev);
  const owedP = S.activeProjects(u).filter((p) => S.owed(p) > 0).sort((x, y) => S.owed(y) - S.owed(x));
  const overdue = owedP.filter((p) => p.pdue && p.pdue < today);
  const ps = S.paySummary(u, today), bi = S.balanceInfo(u, today);
  const t0 = S.startUTC({ date: wr.last[0], time: '00:00' }, u.tz), t1 = S.startUTC({ date: wr.thisMon, time: '00:00' }, u.tz);
  const by = new Map();
  for (const t of u.tasks || []) if (t.status === 'done' && t.doneAt >= t0 && t.doneAt < t1) by.set(t.doneByName || t.toName || '—', (by.get(t.doneByName || t.toName || '—') || 0) + 1);
  const lateTasks = (u.tasks || []).filter((t) => t.status === 'open' && t.due && t.due < today).length;
  const soon = S.addDaysISO(today, 7);
  const expectIn = owedP.filter((p) => p.pdue && p.pdue >= today && p.pdue <= soon).reduce((n, p) => n + S.owed(p), 0);
  return { a, b, owedP, overdue, ps, bi, board: [...by.entries()].sort((x, y) => y[1] - x[1]), lateTasks, expectIn, wr };
}

function dataLine(f) {
  return [
    `Last week: income ${Math.round(f.a.inc)}, expense ${Math.round(f.a.out)}, profit ${Math.round(f.a.net)}; week before: income ${Math.round(f.b.inc)}, expense ${Math.round(f.b.out)}.`,
    `Unpaid by clients: ${f.owedP.slice(0, 5).map((p) => `${p.client || p.name} ${S.owed(p)}${p.pdue && p.pdue < f.wr.thisMon ? ' (overdue)' : ''}`).join('; ') || 'none'}.`,
    `We must pay in 7 days: ${Math.round(f.ps.week)}; overdue payables: ${Math.round(f.ps.overdue)}. Expected client payments in 7 days: ${Math.round(f.expectIn)}.`,
    `Overdue team tasks: ${f.lateTasks}. Balance: ${f.bi ? Math.round(f.bi.total) : 'unknown'}.`,
  ].join('\n');
}
function ruleAdvice(f) {
  if (f.overdue.length) return `${esc(f.overdue[0].client || f.overdue[0].name)} toʻlovni kechiktirgan (${mon(S.owed(f.overdue[0]))}). Bugun eslatma yuborib, aniq sana soʻrang.`;
  if (f.ps.overdue > 0) return `Kechikkan toʻlovlaringiz bor (${mon(f.ps.overdue)}). Avval shularni yoping, keyin yangi xarajat qiling.`;
  if (f.a.out > f.a.inc && f.a.out > 0) return 'Oʻtgan hafta chiqim kirimdan oshdi. Eng katta chiqim moddasini koʻrib chiqing.';
  if (f.lateTasks) return `${f.lateTasks} ta vazifa muddatidan oʻtib ketgan. Hodimlar bilan qisqa gaplashib chiqing.`;
  return 'Ahvol yaxshi. Shu haftada 1-2 ta yangi mijozga yozib, kirimni oshiring.';
}

async function weeklyText(u, today) {
  const f = facts(u, today), ext = require('./ext');
  let advice = '';
  try {
    const r = await ext.aiCall(u, 'You are a sharp, practical business advisor for a small freelance web/bot/video studio in Uzbekistan. From the numbers, give ONE concrete recommendation for this week (what to do, with whom, and why), 1-2 short sentences, in Uzbek (Latin). No greeting, no lists, do not invent numbers.', dataLine(f), { auto: true, limit: 60 });
    advice = r.text ? esc(r.text.slice(0, 380)) : '';
  } catch { /* ignore */ }
  if (!advice) advice = ruleAdvice(f);
  const [l0, l1] = f.wr.last;
  const L = [`🧭 <b>Direktor · haftalik tahlil</b> (${l0.slice(8)}.${l0.slice(5, 7)} – ${l1.slice(8)}.${l1.slice(5, 7)})`, ''];
  L.push(`💰 Kirim: <b>${mon(f.a.inc)}</b> ${pct(f.a.inc, f.b.inc)}`, `💸 Chiqim: <b>${mon(f.a.out)}</b> ${pct(f.a.out, f.b.out)}`, `📈 Foyda: <b>${mon(f.a.net)}</b>`);
  if (f.bi) L.push(`🏦 Balans: <b>${mon(f.bi.total)}</b>`);
  L.push('', `⏭ <b>Bu hafta:</b> mijozlardan kutilmoqda ${mon(f.expectIn)} · bizdan chiqadi ${mon(f.ps.week)}`);
  if (f.overdue.length) L.push(`⚠️ Kechikkan mijoz toʻlovlari: ${f.overdue.slice(0, 3).map((p) => `${esc(p.client || p.name)} ${mon(S.owed(p))}`).join(', ')}`);
  if (f.ps.overdue > 0) L.push(`⚠️ Kechikkan toʻlovlarimiz: ${mon(f.ps.overdue)}`);
  if (f.board.length) L.push('', `🏆 <b>Hafta vazifalari:</b> ${f.board.slice(0, 5).map(([n, c], i) => `${['🥇', '🥈', '🥉'][i] || '•'} ${esc(n)} — ${c}`).join(' · ')}`);
  if (f.lateTasks) L.push(`⏰ Muddati oʻtgan vazifa: ${f.lateTasks}`);
  L.push('', `💡 <b>Tavsiya:</b> ${advice}`, '', '<i>/prognoz — "agar ... boʻlsa" hisobi</i>');
  return L.join('\n');
}

// Yil oxirigacha bashorat: oxirgi 3 oy oʻrtachasi + qoʻshimcha loyihalar
function forecast(u, today, extraN, price) {
  const ym = today.slice(0, 7), months = [];
  for (let i = 1; i <= 3; i++) { const m = S.addMonthsISO(`${ym}-01`, -i).slice(0, 7); months.push(sums(u, `${m}-01`, `${m}-31`)); }
  if (!months.some((x) => x.inc || x.out)) months.splice(0, 3, sums(u, S.addDaysISO(today, -29), today)); // yangi hisob: oxirgi 30 kun
  const avg = (k) => months.reduce((n, x) => n + x[k], 0) / months.length;
  const baseNet = avg('inc') - avg('out'), left = 12 - Number(today.slice(5, 7)) + 1; // joriy oyni ham hisoblaymiz
  const paid = S.activeProjects(u).concat(u.projects.filter((p) => p.paid > 0)).filter((p, i, a) => a.indexOf(p) === i);
  const avgPrice = price || (paid.length ? Math.round(paid.reduce((n, p) => n + (p.paid || p.price || 0), 0) / paid.length) : 0);
  const bi = S.balanceInfo(u, today), now = bi ? bi.total : 0;
  const extra = extraN * avgPrice;
  return { inc: avg('inc'), out: avg('out'), baseNet, left, avgPrice, now, base: now + baseNet * left, withExtra: now + (baseNet + extra) * left, extra, has: months.some((x) => x.inc || x.out) };
}
function forecastText(f, n) {
  if (!f.has) return '📊 Bashorat uchun hali yetarli maʼlumot yoʻq (kamida bitta oylik kirim/chiqim kerak).';
  const L = ['🔮 <b>Prognoz — yil oxirigacha</b>', '', `Oxirgi 3 oy oʻrtachasi: kirim <b>${mon(f.inc)}</b>, chiqim <b>${mon(f.out)}</b>, sof <b>${mon(f.baseNet)}</b>/oy`, `Hozirgi balans: <b>${mon(f.now)}</b> · qolgan oylar: ${f.left}`, '', `Shu holatda yil oxirida: <b>${mon(f.base)}</b>`];
  if (n > 0) L.push(`Oyiga yana <b>${n}</b> ta loyiha (oʻrtacha ${mon(f.avgPrice)}) olsangiz: <b>${mon(f.withExtra)}</b> (+${mon(f.withExtra - f.base)})`);
  else L.push('', '<i>Sinab koʻring: <code>/prognoz 2</code> (oyiga 2 ta yangi loyiha) yoki <code>/prognoz 2 3000000</code> (har biri 3 mln).</i>');
  return L.join('\n');
}

async function onMessage(chat, u, cmd, args) {
  if (cmd === '/prognoz' || cmd === '/forecast') {
    const nums = String(args || '').replace(/[ ,]+/g, ' ').trim().split(' ').map((x) => Number(String(x).replace(/\D/g, ''))).filter((x) => x > 0);
    await send(chat, forecastText(forecast(u, S.todayISO(u.tz), nums[0] || 0, nums[1] || 0), nums[0] || 0));
    return true;
  }
  if (cmd === '/direktor' || cmd === '/director') {
    tg('sendChatAction', { chat_id: chat, action: 'typing' });
    await send(chat, await weeklyText(u, S.todayISO(u.tz)));
    return true;
  }
  return false;
}

// Cron: dushanba 09:00 dan keyin, hafta ichida bir marta (umumiy hisobda bir marta — remind.js `__fan` orqali hammaga)
async function remind(u, now) {
  const loc = S.localNow(u.tz, now), hhmm = S.hhmmOfLocal(loc), today = S.isoOfLocal(loc);
  if (!u.remind || S.inQuiet(u, hhmm) || hhmm < '09:00' || new Date(`${today}T00:00:00Z`).getUTCDay() !== 1) return { dirty: false, sent: 0 };
  const st = store(), key = `dir/${u.ws || u.id}`;
  if ((await st.get(key)) === today) return { dirty: false, sent: 0 };
  await st.set(key, today);
  const r = await send(u.chat, await weeklyText(u, today), { inline_keyboard: [[S.appBtn('📱')]] });
  return { dirty: false, sent: r.ok ? 1 : 0 };
}
module.exports = { onMessage, remind, weeklyText, forecast, facts };
