'use strict';
// Internet: ob-havo, valyuta, kripto, namoz vaqti, vaqt, yangiliklar, Vikipediya va veb-qidiruv.
// AI avval qaysi vositani ishlatishni tanlaydi (route), soʻng natijalar javob uchun kontekst boʻladi (gather).
const S = require('./_shared');
const { getAI } = require('../kv');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = async (url, { json = false, ms = 7000, headers = {} } = {}) => {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html,application/xml,*/*', ...headers }, signal: AbortSignal.timeout(ms) });
  if (!r.ok && r.status !== 202) throw new Error(`HTTP ${r.status}`);
  return json ? r.json() : r.text();
};
const decode = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

/* ---------- vositalar ---------- */
const WMO = { 0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'heavy freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'rain showers', 81: 'heavy rain showers', 82: 'violent rain showers', 85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail' };
async function geocode(city) {
  const j = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city || 'Tashkent')}&count=1&language=en`, { json: true });
  return j.results && j.results[0];
}
async function weather(city) {
  const g = await geocode(city);
  if (!g) return null;
  const j = await get(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`, { json: true });
  const c = j.current, d = j.daily;
  const lines = [`Place: ${g.name}, ${g.country || ''} (timezone ${j.timezone})`, `Now (${c.time}): ${c.temperature_2m}°C, feels like ${c.apparent_temperature}°C, ${WMO[c.weather_code] || 'n/a'}, humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h, precipitation ${c.precipitation} mm`];
  d.time.forEach((t, i) => lines.push(`${t}: ${d.temperature_2m_min[i]}…${d.temperature_2m_max[i]}°C, ${WMO[d.weather_code[i]] || 'n/a'}, rain chance ${d.precipitation_probability_max[i] ?? '?'}%`));
  return { text: lines.join('\n'), sources: [{ title: 'Open-Meteo', url: 'https://open-meteo.com' }] };
}
const CRYPTO = { bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH', ton: 'TON', toncoin: 'TON', solana: 'SOL', sol: 'SOL', xrp: 'XRP', doge: 'DOGE', dogecoin: 'DOGE', bnb: 'BNB', usdt: 'USDT', litecoin: 'LTC', ltc: 'LTC', cardano: 'ADA', ada: 'ADA', tron: 'TRX', trx: 'TRX' };
const CCY = { dollar: 'USD', usd: 'USD', aqsh: 'USD', доллар: 'USD', euro: 'EUR', evro: 'EUR', eur: 'EUR', евро: 'EUR', rubl: 'RUB', rub: 'RUB', ruble: 'RUB', рубль: 'RUB', tenge: 'KZT', kzt: 'KZT', тенге: 'KZT', yuan: 'CNY', cny: 'CNY', юань: 'CNY', funt: 'GBP', gbp: 'GBP', pound: 'GBP', lira: 'TRY', try: 'TRY', won: 'KRW', krw: 'KRW', jpy: 'JPY', iyena: 'JPY', chf: 'CHF', aed: 'AED', dirham: 'AED' };
async function rates(q) {
  const words = String(q || '').toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(Boolean);
  const out = [], src = [];
  const wantCrypto = [...new Set(words.map((w) => CRYPTO[w]).filter(Boolean))];
  const wantCcy = [...new Set(words.map((w) => CCY[w] || (/^[a-z]{3}$/.test(w) ? w.toUpperCase() : null)).filter((c) => c && !Object.values(CRYPTO).includes(c)))];
  if (wantCrypto.length) {
    for (const sym of wantCrypto.slice(0, 4)) {
      try { const j = await get(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { json: true }); out.push(`${sym}: ${j.data.amount} USD (Coinbase, live)`); } catch { /* ignore */ }
    }
    src.push({ title: 'Coinbase', url: 'https://www.coinbase.com' });
  }
  if (wantCcy.length || !wantCrypto.length) {
    const list = await get('https://cbu.uz/uz/arkhiv-kursov-valyut/json/', { json: true, ms: 8000 });
    const pick = wantCcy.length ? list.filter((x) => wantCcy.includes(x.Ccy)) : list.filter((x) => ['USD', 'EUR', 'RUB', 'KZT', 'CNY', 'GBP', 'TRY'].includes(x.Ccy));
    for (const x of pick) out.push(`${x.Nominal && x.Nominal !== '1' ? `${x.Nominal} ` : '1 '}${x.Ccy} (${x.CcyNm_EN || x.Ccy}) = ${x.Rate} UZS (change ${x.Diff}), Central Bank of Uzbekistan, date ${x.Date}`);
    src.push({ title: 'cbu.uz', url: 'https://cbu.uz' });
  }
  return out.length ? { text: out.join('\n'), sources: src } : null;
}
function parseRss(xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).map((it) => {
    const f = (t) => { const m = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };
    return { title: f('title'), link: f('link') || f('guid'), desc: f('description'), date: f('pubDate') };
  }).filter((x) => x.title);
}
const FEEDS = { uz: ['https://kun.uz/news/rss', 'https://feeds.bbci.co.uk/uzbek/rss.xml'], ru: ['https://feeds.bbci.co.uk/russian/rss.xml', 'https://kun.uz/news/rss'], en: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://kun.uz/news/rss'] };
async function news(q, lang) {
  const feeds = FEEDS[lang] || FEEDS.en;
  const res = await Promise.all(feeds.map((f) => get(f, { ms: 6000 }).then(parseRss).catch(() => [])));
  let items = res.flat();
  const kw = String(q || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  if (kw.length) { const f = items.filter((x) => kw.some((w) => `${x.title} ${x.desc}`.toLowerCase().includes(w))); if (f.length) items = f; }
  items = items.filter((x, i, a) => a.findIndex((y) => y.link === x.link || y.title === x.title) === i).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 7);
  if (!items.length) return null;
  return { text: items.map((x) => `- ${x.title} (${x.date}) ${x.desc.slice(0, 160)} [${x.link}]`).join('\n'), sources: items.slice(0, 3).map((x) => ({ title: host(x.link), url: x.link })) };
}
async function wiki(q, lang) {
  const L = ['uz', 'ru', 'en'].includes(lang) ? lang : 'en';
  const find = async (l) => { const j = await get(`https://${l}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3&utf8=1`, { json: true }); return (j.query && j.query.search) || []; };
  let hits = await find(L), used = L;
  if (!hits.length && L !== 'en') { hits = await find('en'); used = 'en'; }
  if (!hits.length) return null;
  const j = await get(`https://${used}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=1800&titles=${encodeURIComponent(hits[0].title)}&format=json&redirects=1&utf8=1`, { json: true });
  const page = Object.values((j.query && j.query.pages) || {})[0];
  const url = `https://${used}.wikipedia.org/wiki/${encodeURIComponent(hits[0].title.replace(/ /g, '_'))}`;
  const others = hits.slice(1).map((h) => h.title).join('; ');
  return { text: `Wikipedia (${used}) — ${hits[0].title}:\n${(page && page.extract) || decode(hits[0].snippet)}${others ? `\nOther matches: ${others}` : ''}`, sources: [{ title: `Wikipedia · ${hits[0].title}`, url }] };
}
async function timeIn(city) {
  const g = await geocode(city);
  if (!g || !g.timezone) return null;
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: g.timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return { text: `Current local time in ${g.name}, ${g.country || ''} (${g.timezone}): ${f.format(new Date())}`, sources: [] };
}
async function prayer(city) {
  const g = await geocode(city);
  if (!g) return null;
  const j = await get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(g.name)}&country=${encodeURIComponent(g.country || 'Uzbekistan')}&method=3&school=1`, { json: true });
  const t = j.data.timings, h = j.data.date;
  return { text: `Prayer times for ${g.name} on ${h.readable} (Hijri ${h.hijri.date}): Fajr ${t.Fajr}, Sunrise ${t.Sunrise}, Dhuhr ${t.Dhuhr}, Asr ${t.Asr}, Maghrib ${t.Maghrib}, Isha ${t.Isha} (method MWL, Hanafi Asr; local time, approximate — mosques may differ by a few minutes)`, sources: [{ title: 'Aladhan', url: 'https://aladhan.com' }] };
}
/* ---------- futbol: ESPN ochiq maʼlumoti (jamoa boʻyicha oxirgi/keyingi oʻyinlar) ---------- */
const LEAGUES = [['esp.1', 'LaLiga'], ['eng.1', 'Premier League'], ['ger.1', 'Bundesliga'], ['ita.1', 'Serie A'], ['fra.1', 'Ligue 1'], ['uefa.champions', 'Champions League']];
const teamCache = new Map();
async function leagueTeams(slug) {
  const hit = teamCache.get(slug);
  if (hit && Date.now() - hit.at < 6 * 3600000) return hit.list;
  const j = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`, { json: true, ms: 6000 });
  const list = ((j.sports && j.sports[0] && j.sports[0].leagues && j.sports[0].leagues[0] && j.sports[0].leagues[0].teams) || []).map((x) => x.team);
  teamCache.set(slug, { list, at: Date.now() });
  return list;
}
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
async function sport(q) {
  const want = norm(q).replace(/\b(fc|cf|club|team|football|soccer|match|score|result|last|latest)\b/g, '').replace(/\s+/g, ' ').trim();
  if (want.length < 3) return null;
  const lists = await Promise.all(LEAGUES.map(([slug]) => leagueTeams(slug).catch(() => [])));
  let found = null, home = null;
  lists.forEach((list, i) => {
    for (const t of list) {
      const names = [t.displayName, t.shortDisplayName, t.location, t.name].map(norm).filter(Boolean);
      if (names.some((n) => n === want || n.includes(want) || (n.length >= 5 && want.includes(n)))) { if (!found) found = t; if (!home && LEAGUES[i][0] !== 'uefa.champions') home = LEAGUES[i][0]; }
    }
  });
  if (!found) return null;
  const slugs = [...new Set([home, 'uefa.champions'].filter(Boolean))];
  // Oʻtgan oʻyinlar (standart) va kelgusi oʻyinlar (?fixture=true) alohida chaqiriladi
  const scheds = await Promise.all(slugs.flatMap((slug) => ['', '?fixture=true'].map((qs) => get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${found.id}/schedule${qs}`, { json: true, ms: 7000 }).then((j) => (j.events || []).map((e) => ({ e, league: (LEAGUES.find((l) => l[0] === slug) || [])[1] || slug }))).catch(() => []))));
  const seen = new Set(), all = [];
  for (const x of scheds.flat()) if (!seen.has(x.e.id)) { seen.add(x.e.id); all.push(x); }
  const fmt = ({ e, league }) => {
    const c = e.competitions[0], h = c.competitors.find((z) => z.homeAway === 'home'), a = c.competitors.find((z) => z.homeAway === 'away');
    const sc = (z) => (z.score && (z.score.displayValue ?? z.score.value)) ?? '';
    const st = c.status.type;
    return `${e.date.slice(0, 16).replace('T', ' ')} UTC — ${h.team.displayName} ${st.state === 'pre' ? 'vs' : `${sc(h)}-${sc(a)}`} ${a.team.displayName} (${league}${st.state === 'in' ? ', LIVE' : st.completed ? '' : ', upcoming'})`;
  };
  const byDate = (a, b) => Date.parse(a.e.date) - Date.parse(b.e.date);
  const done = all.filter((x) => x.e.competitions[0].status.type.completed).sort(byDate).slice(-4).reverse();
  const live = all.filter((x) => x.e.competitions[0].status.type.state === 'in');
  const next = all.filter((x) => x.e.competitions[0].status.type.state === 'pre').sort(byDate).slice(0, 2);
  if (!done.length && !next.length && !live.length) return null;
  const lines = [`Team: ${found.displayName} (ESPN, domestic league + Champions League only; times in UTC)`];
  if (live.length) lines.push(`LIVE now:\n${live.map(fmt).join('\n')}`);
  if (done.length) lines.push(`Most recent results (newest first):\n${done.map(fmt).join('\n')}`);
  if (next.length) lines.push(`Next fixtures:\n${next.map(fmt).join('\n')}`);
  return { text: lines.join('\n'), sources: [{ title: 'ESPN', url: `https://www.espn.com/soccer/club/_/id/${found.id}` }] };
}

/* ---------- veb-qidiruv (Bing) + sahifa oʻqish ---------- */
function bingDecode(href) {
  const u = href.replace(/&amp;/g, '&'), m = u.match(/[?&]u=a1([A-Za-z0-9_-]+)/);
  if (!m) return u;
  try { const b = m[1] + '='.repeat((4 - (m[1].length % 4)) % 4); return new TextDecoder().decode(Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))); } catch { return u; }
}
async function bing(q) {
  const html = await get(`https://www.bing.com/search?q=${encodeURIComponent(q)}&cc=us&setlang=en-US`, { headers: { 'accept-language': 'en-US,en;q=0.9', cookie: 'SRCHHPGUSR=SRCHLANG=en' } });
  const out = [];
  for (const block of html.split('<li class="b_algo"').slice(1, 9)) {
    const a = block.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const url = bingDecode(a[1]);
    if (!/^https?:\/\//.test(url) || /(^|\.)bing\.com$|microsoft\.com\/en-us\/bing/.test(host(url))) continue;
    const p = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    out.push({ title: decode(a[2]), url, snippet: decode(p ? p[1] : '') });
  }
  return out;
}
function mainText(html) {
  const clean = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe)[\s\S]*?<\/\1>/gi, ' ');
  const parts = [];
  for (const m of clean.matchAll(/<(h1|h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi)) { const t = decode(m[2]); if (t.length > 25) parts.push(t); }
  return parts.join(' ').slice(0, 2600);
}
async function readPage(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(5500) });
    if (!r.ok || !/text\/html|xhtml/i.test(r.headers.get('content-type') || '')) return '';
    return mainText((await r.text()).slice(0, 700000));
  } catch { return ''; }
}
const STOP = new Set(['last', 'latest', 'result', 'results', 'today', 'current', 'the', 'and', 'for', 'how', 'what', 'best', 'price', 'prices', 'near', 'with', 'from', 'about', 'new', 'now', 'recent']);
const tokens = (t) => [...new Set(String(t || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w)))];
// Bing qisqa kalit soʻzlarda yaxshi, uzun gaplarda adashadi: bir nechta qisqa variantni parallel yuboramiz va dolzarblik boʻyicha saralaymiz
async function search(q, alt) {
  const year = new Date().getUTCFullYear();
  // Qisqartirilgan variant: shovqin soʻzlarsiz (last, result, match ...); natija/oʻyin soʻralgan boʻlsa "score" qoʻshiladi
  const NOISE = new Set(['last', 'latest', 'result', 'results', 'match', 'recent', 'current', 'today', 'yesterday', 'now', 'the', 'of', 'in']);
  const core = String(q || '').split(/\s+/).filter((w) => !NOISE.has(w.toLowerCase())).slice(0, 4).join(' ');
  const short = core && core !== q ? `${core}${/result|match|score|game/i.test(q) ? ' score' : ''}` : '';
  const variants = [...new Set([q, short, alt, `${q} ${year}`].filter(Boolean))].slice(0, 4);
  const [lists, ddg] = await Promise.all([
    Promise.all(variants.map((v) => bing(v).catch(() => []))),
    get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, { json: true, ms: 5000 }).catch(() => null),
  ]);
  const want = tokens(`${q} ${alt || ''}`), need = want.length >= 3 ? 2 : 1;
  const seen = new Set(), ranked = [];
  lists.forEach((list) => list.forEach((x, pos) => {
    if (seen.has(x.url)) return;
    seen.add(x.url);
    const hay = `${x.title} ${x.snippet} ${host(x.url)}`.toLowerCase();
    const hit = want.filter((w) => hay.includes(w)).length;
    if (hit >= need) ranked.push({ ...x, score: hit * 10 - pos });
  }));
  ranked.sort((a, b) => b.score - a.score);
  const items = ranked.slice(0, 6);
  console.log('search', JSON.stringify(variants), '->', items.map((x) => host(x.url)).join(',') || 'nothing relevant');
  if (!items.length && !(ddg && ddg.AbstractText)) return null;
  const skip = /youtube|facebook|instagram|tiktok|twitter|x\.com|reddit|pinterest/i;
  const pages = await Promise.all(items.filter((x) => !skip.test(host(x.url))).slice(0, 2).map(async (x) => ({ url: x.url, text: await readPage(x.url) })));
  const lines = [];
  if (ddg && ddg.AbstractText) lines.push(`Quick answer (${ddg.AbstractSource || 'DuckDuckGo'}): ${ddg.AbstractText.slice(0, 700)}`);
  items.forEach((x, i) => lines.push(`[${i + 1}] ${x.title} — ${host(x.url)}\n${x.snippet}`));
  for (const pg of pages) if (pg.text) lines.push(`PAGE CONTENT from ${host(pg.url)}:\n${pg.text}`);
  return { text: lines.join('\n\n'), sources: items.slice(0, 3).map((x) => ({ title: host(x.url), url: x.url })) };
}

/* ---------- yoʻnaltirgich (router) ---------- */
const ROUTER = `Decide whether answering the user's last message needs live or external information. Output ONLY compact JSON: {"tool":"none|web|wiki|weather|rates|news|time|prayer|sport","q":"","alt":"","lang":"uz|ru|en","city":""}
- none: chit-chat, writing, translation, coding, math, advice, stable general knowledge you already know well, and anything about the user's own work data (projects, clients, payments, meetings, services).
- weather: weather or forecast; city in English (empty = Tashkent).
- rates: currency exchange rates or crypto prices; q = currency/crypto names or codes, e.g. "USD EUR" or "bitcoin"; empty = main rates.
- news: latest news; q = topic keywords (empty = top news); lang = language of the user's message.
- time: current time or date in a city; city in English.
- prayer: Islamic prayer times (namoz vaqti, bomdod, shom...); city in English (empty = Tashkent).
- sport: football (soccer) club results, live scores and next fixtures for top European clubs (Real Madrid, Barcelona, Manchester City, Bayern, Juventus, PSG...); q = club name in English. For other sports or national teams use web.
- wiki: encyclopedic facts about a person, place, event, science or history that benefit from a source; q = the topic title; lang = language of the user's message.
- web: anything needing fresh, specific or local info: prices, products, sport results, events, laws, companies, opening hours, how a service works, recent facts; q = 2-4 KEYWORDS in ENGLISH like you would type into a search engine (e.g. "Real Madrid score", "iPhone 17 Pro price Uzbekistan", "Tashkent Dubai flights"), NOT a full sentence; alt = another short keyword variant (or the same query in RUSSIAN if the topic is local to Uzbekistan/CIS).
Sports results/scores/fixtures, and any question with words like latest, last, current, recent, today, yesterday, now, price, rate, result ALWAYS need web (or a more specific tool). Prefer none only for stable knowledge, writing/coding/math/advice and the user's own work data. Never put private client data in q.`;
function parseJson(t) {
  if (t && typeof t === 'object') return t; // Workers AI JSON javobni ba'zan tayyor obyekt qilib qaytaradi
  const m = String(t || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
function fallbackRoute(text) {
  const t = text.toLowerCase();
  if (/ob-?havo|havo|weather|погода|прогноз/.test(t)) return { tool: 'weather', city: '' };
  if (/kurs|dollar|valyuta|курс|доллар|евро|bitcoin|биткоин|btc/.test(t)) return { tool: 'rates', q: text };
  if (/yangilik|янгилик|новост|news|xabarlar/.test(t)) return { tool: 'news', q: '' };
  if (/namoz|bomdod|peshin|asr|shom|xufton|азан|намаз|prayer/.test(t)) return { tool: 'prayer', city: '' };
  return { tool: 'none' };
}
// Yangi maʼlumot soʻralgan, lekin router "none" desa — majburan qidiruv
const FRESH = /(oxirgi|so['ʻ’‘`]nggi|hozirgi|bugungi|kechagi|narxi|natija|yangilik|latest|current|today|yesterday|recent|price|score|result|последн|сейчас|сегодня|вчера|цена|результат|счет|матч|o['ʻ’‘`]yin|match)/i;
const WORK = /(loyiha|mijoz|qarz|uchrashuv|servis|xarajat|daromad|vazifa|obuna|to['ʻ’‘`]lov|проект|клиент|долг|встреч|сервис|расход|доход|задач|project|client|debt|meeting|expense|income|task)/i;
async function rewriteQuery(text) {
  const AI = getAI();
  if (!AI) return { q: text, alt: '' };
  try {
    const out = await AI.run('@cf/mistralai/mistral-small-3.1-24b-instruct', { messages: [{ role: 'system', content: 'Rewrite the user message as a short keyword web search query in English (2-4 keywords, like "Real Madrid score"; not a sentence). Put a second short keyword variant in alt (Russian if the topic is local to Uzbekistan/CIS). Output ONLY JSON {"q":"","alt":""}.' }, { role: 'user', content: text.slice(0, 400) }], max_tokens: 80, temperature: 0 });
    const raw = (out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content))) || '';
    const j = parseJson(raw);
    if (!j || !j.q) console.log('rewrite-miss', typeof raw === 'object' ? JSON.stringify(raw) : String(raw).replace(/\s+/g, ' ').slice(0, 160));
    if (j && j.q) return { q: String(j.q).slice(0, 120), alt: String(j.alt || '').slice(0, 120) };
  } catch (e) { console.error('rewrite', e.message); }
  return { q: text, alt: '' };
}
async function route(u, text, hist, now) {
  const AI = getAI();
  if (!AI) return fallbackRoute(text);
  const ctx = hist.slice(-4).map((h) => `${h.r === 'u' ? 'User' : 'Assistant'}: ${h.t.slice(0, 200)}`).join('\n');
  try {
    const out = await AI.run('@cf/mistralai/mistral-small-3.1-24b-instruct', { messages: [{ role: 'system', content: ROUTER }, { role: 'user', content: `Date: ${S.todayISO(u.tz, now)}. User language: ${u.lang || 'uz'}.\n${ctx ? `Recent conversation:\n${ctx}\n` : ''}Last message: ${text.slice(0, 600)}` }], max_tokens: 160, temperature: 0 });
    const txt = (out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content))) || '';
    const j = parseJson(txt);
    if (j && ['none', 'web', 'wiki', 'weather', 'rates', 'news', 'time', 'prayer', 'sport'].includes(j.tool)) return j;
  } catch (e) { console.error('route', e.message); }
  return fallbackRoute(text);
}

// { tool, block, sources } — block: AI ga beriladigan internet maʼlumoti ('' boʻlsa internet kerak emas / topilmadi)
async function gather(u, text, hist, now = Date.now()) {
  let r = await route(u, text, hist, now);
  if (r.tool === 'none' && FRESH.test(text) && !WORK.test(text) && text.length < 300) r = { tool: 'web', ...(await rewriteQuery(text)), lang: u.lang };
  if (r.tool === 'web' && (!r.q || r.q.trim() === text.trim())) r = { ...r, ...(await rewriteQuery(text)) };
  const lang = ['uz', 'ru', 'en'].includes(r.lang) ? r.lang : u.lang || 'uz';
  const jobs = { weather: () => weather(r.city), rates: () => rates(r.q || text), news: () => news(r.q, lang), wiki: () => wiki(r.q || text, lang), time: () => timeIn(r.city), prayer: () => prayer(r.city), sport: async () => (await sport(r.q || text)) || search(`${r.q || text} score`, r.alt), web: () => search(r.q || text, r.alt) };
  if (!jobs[r.tool]) return { tool: 'none', block: '', sources: [] };
  // Futbol natijasi/jadvali soʻralsa — avval ESPN (aniq maʼlumot), topilmasa umumiy qidiruv
  if (r.tool === 'web' && /(score|result|match|fixture|game|schedule)/i.test(`${r.q || ''} ${text}`)) {
    const sp = await Promise.race([sport(r.q || text), new Promise((res) => setTimeout(() => res(null), 8000))]).catch(() => null);
    if (sp) { console.log('web', 'sport', JSON.stringify(r.q || '')); return { tool: 'sport', block: `[tool: sport, query: ${r.q || ''}]\n${sp.text}`.slice(0, 7000), sources: sp.sources }; }
  }
  try {
    const res = await Promise.race([jobs[r.tool](), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    if (!res) return { tool: r.tool, block: `(The ${r.tool} lookup returned nothing relevant.)`, sources: [], failed: true };
    console.log('web', r.tool, JSON.stringify(r.q || r.city || '').slice(0, 80), JSON.stringify(r.alt || ''));
    return { tool: r.tool, block: `[tool: ${r.tool}${r.q ? `, query: ${r.q}` : ''}]\n${res.text}`.slice(0, 7000), sources: res.sources || [] };
  } catch (e) {
    console.error('web', r.tool, e.message);
    return { tool: r.tool, block: `(The ${r.tool} lookup failed: ${e.message}.)`, sources: [], failed: true };
  }
}

module.exports = { gather, route, sport, weather, rates, news, wiki, timeIn, prayer, search, bing, parseRss, mainText };
