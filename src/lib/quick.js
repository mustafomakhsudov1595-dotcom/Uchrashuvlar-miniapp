// Erkin matndan uchrashuvni tushunadi (o'zbek, rus, ingliz). Serverdagi tahlilchi bilan bir xil mantiq.
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const wdIdx = (iso) => (parseISO(iso).getDay() + 6) % 7;

const WD_WORDS = [
  ['dushanba', 'понедельник', 'monday', 'mon', 'пн'], ['seshanba', 'вторник', 'tuesday', 'tue', 'вт'], ['chorshanba', 'среда', 'среду', 'wednesday', 'wed', 'ср'],
  ['payshanba', 'четверг', 'thursday', 'thu', 'чт'], ['juma', 'пятница', 'пятницу', 'friday', 'fri', 'пт'], ['shanba', 'суббота', 'субботу', 'saturday', 'sat', 'сб'], ['yakshanba', 'воскресенье', 'sunday', 'sun', 'вс'],
];
const MONTH_STEMS = [['yan', 'янв', 'jan'], ['fev', 'фев', 'feb'], ['mar', 'мар'], ['apr', 'апр'], ['may', 'мая', 'май'], ['iyun', 'июн', 'jun'], ['iyul', 'июл', 'jul'], ['avg', 'авг', 'aug'], ['sen', 'сен', 'sep'], ['okt', 'окт', 'oct'], ['noy', 'ноя', 'nov'], ['dek', 'дек', 'dec']];
const monthIdx = (w) => MONTH_STEMS.findIndex((st) => st.some((s) => w.startsWith(s)));
const HASH_CAT = { ish: 'work', work: 'work', работа: 'work', oila: 'family', family: 'family', семья: 'family', shaxsiy: 'personal', personal: 'personal', личное: 'personal', boshqa: 'other', other: 'other', другое: 'other' };

export function parseQuick(input, today = isoOf(new Date())) {
  let rest = ` ${String(input || '').replace(/ /g, ' ')} `;
  const out = { found: { date: false, time: false } };
  const take = (re, fn) => { const m = rest.match(re); if (!m) return false; if (fn(m) === false) return false; rest = rest.replace(m[0], ' '); return true; };

  take(/#([\p{L}]+)/iu, (m) => { const c = HASH_CAT[m[1].toLowerCase()]; if (!c) return false; out.cat = c; return true; });
  take(/(\+?\d[\d\s\-()]{7,}\d)/, (m) => { const digits = m[1].replace(/\D/g, ''); if (digits.length < 9 || digits.length > 15 || /^\d{1,2}[.:]\d/.test(m[1])) return false; out.phone = m[1].trim(); return true; });
  take(/(?:^|[\s,;])(?:joy|manzil|место|адрес|place|at):\s*([^,;\n]+)/i, (m) => { out.location = m[1].trim(); return true; });

  const wdays = [];
  WD_WORDS.forEach((ws, i) => ws.forEach((w) => wdays.push([w, i])));
  const setDate = (iso) => { out.date = iso; return true; };
  if (take(/(?:^|[\s,;])(poslezavtra|после\s*завтра|послезавтра|indinga|day after tomorrow)(?=[\s,;.]|$)/i, () => setDate(addDays(today, 2)))) out.found.date = true;
  else if (take(/(?:^|[\s,;])(bugun|сегодня|today)(?=[\s,;.]|$)/i, () => setDate(today))) out.found.date = true;
  else if (take(/(?:^|[\s,;])(ertaga|завтра|tomorrow)(?=[\s,;.]|$)/i, () => setDate(addDays(today, 1)))) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d+)\s*(?:kundan keyin|дн(?:я|ей|ь)\s*спустя)/i, (m) => setDate(addDays(today, +m[1])))
    || take(/(?:^|[\s,;])(?:через|in)\s+(\d+)\s*(?:дн\p{L}*|день|days?)/iu, (m) => setDate(addDays(today, +m[1])))) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d{1,2})[\s-]*([\p{L}]{3,})(?:\s+(\d{4}))?(?=[\s,;.]|$)/iu, (m) => {
    const mo = monthIdx(m[2].toLowerCase()); const d = +m[1]; if (mo < 0 || d < 1 || d > 31) return false;
    const cy = +today.slice(0, 4); const y = m[3] ? +m[3] : cy; let iso = `${y}-${pad(mo + 1)}-${pad(d)}`;
    if (parseISO(iso).getDate() !== d) return false; if (!m[3] && iso < today) iso = `${cy + 1}-${pad(mo + 1)}-${pad(d)}`; return setDate(iso);
  })) out.found.date = true;
  else if (take(/(?:^|[\s,;])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=[\s,;]|$)/, (m) => {
    const d = +m[1], mo = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const cy = +today.slice(0, 4); const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : cy; let iso = `${y}-${pad(mo)}-${pad(d)}`;
    if (parseISO(iso).getDate() !== d) return false; if (!m[3] && iso < today) iso = `${cy + 1}-${pad(mo)}-${pad(d)}`; return setDate(iso);
  })) out.found.date = true;
  else {
    const re = new RegExp(`(?:^|[\\s,;])(?:keyingi|следующ\\p{L}*|next)?\\s*(${wdays.map(([w]) => w).sort((a, b) => b.length - a.length).join('|')})(?=[\\s,;.]|$)`, 'iu');
    if (take(re, (m) => { const w = m[1].toLowerCase(); const idx = wdays.find(([x]) => x === w)[1]; const diff = ((idx - wdIdx(today) + 7) % 7) || 7; return setDate(addDays(today, diff)); })) out.found.date = true;
  }

  const period = (hh, ctx) => { if (/(kech|вечер|evening|night|ночи)/i.test(ctx) && hh < 12) return hh + 12; if (/(tushdan keyin|днём|днем|afternoon)/i.test(ctx) && hh < 7) return hh + 12; return hh; };
  const ctx = rest;
  let tm = rest.match(/(\d{1,2})\s*[:]\s*(\d{2})\s*(am|pm)?/i);
  if (!tm) tm = rest.match(/(?:^|[\s,;])(\d{1,2})\.(\d{2})(?=[\s,;]|$)/);
  if (tm) {
    let hh = +tm[1]; const mi = +tm[2];
    if (tm[3]) { if (/pm/i.test(tm[3]) && hh < 12) hh += 12; if (/am/i.test(tm[3]) && hh === 12) hh = 0; } else hh = period(hh, ctx);
    if (hh <= 23 && mi <= 59) { out.time = `${pad(hh)}:${pad(mi)}`; rest = rest.replace(tm[0], ' '); out.found.time = true; }
  }
  if (!out.found.time) {
    const pw = rest.match(/(kechqurun|kech|ertalab|tushdan keyin|утром|вечером|днём|днем|morning|evening|afternoon)\s*(?:soat\s*|в\s*|at\s*)?(\d{1,2})(?=[\s,;.]|$)/i);
    if (pw && +pw[2] <= 23) { out.time = `${pad(period(+pw[2], pw[1]))}:00`; rest = rest.replace(pw[0], ' '); out.found.time = true; }
  }
  if (!out.found.time) {
    const h = rest.match(/(?:soat|в|к|at)\s*(\d{1,2})\s*(am|pm)?(?:\s*da)?(?=[\s,;.]|$)/i) || rest.match(/(?:^|[\s,;])(\d{1,2})\s*(am|pm)(?=[\s,;.]|$)/i);
    if (h) {
      let hh = +h[1]; if (h[2]) { if (/pm/i.test(h[2]) && hh < 12) hh += 12; if (/am/i.test(h[2]) && hh === 12) hh = 0; } else hh = period(hh, ctx);
      if (hh <= 23) { out.time = `${pad(hh)}:00`; rest = rest.replace(h[0], ' '); out.found.time = true; }
    }
  }
  rest = rest.replace(/(?:^|[\s,;])(ertalab|kechqurun|kech|tushdan keyin|утром|вечером|днём|днем|ночью|morning|evening|afternoon|tonight)(?=[\s,;.]|$)/gi, ' ');

  const parts = rest.split(/[,;\n]/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  out.name = (parts[0] || '').replace(/\s+(bilan|с|with)$/i, '').replace(/^da\s+/i, '').replace(/^(uchrashuv|meeting|встреча)\s*[:\-—]?\s*/i, '').trim().slice(0, 120);
  if (!out.location && parts[1]) out.location = parts[1].slice(0, 200);
  if (parts[2]) out.notes = parts.slice(2).join(', ').slice(0, 1000);
  return out;
}
