'use strict';
// Sayt SEO tekshiruvi (Google ko'rinishi) va Claude uchun tayyor topshiriqlar
const S = require('./_shared');

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ImproNotesSEO/1.0)' };
async function fetchPage(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { ...UA, accept: 'text/html' }, signal: AbortSignal.timeout(9000) });
    const ttfb = Date.now() - t0;
    return { ok: true, status: r.status, ttfb, html: (await r.text()).slice(0, 600000), final: r.url || url };
  } catch (e) { return { ok: false, status: e && e.name === 'TimeoutError' ? 'timeout' : 'xato' }; }
}
async function fetchText(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: UA, signal: AbortSignal.timeout(6000) });
    return { ok: r.ok, text: r.ok ? (await r.text()).slice(0, 30000) : '' };
  } catch { return { ok: false, text: '' }; }
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const metaContent = (html, nameRe) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (nameRe.test(tag)) { const m = tag.match(/content\s*=\s*("([^"]*)"|'([^']*)')/i); return decode((m && (m[2] ?? m[3])) || ''); }
  }
  return null;
};

// { score, items: [{ k, ok, w, v }], ms }
async function audit(rawUrl) {
  const url = S.cleanUrl(rawUrl);
  if (!url) return null;
  const page = await fetchPage(url);
  const items = [], add = (k, ok, w, v) => items.push({ k, ok: Boolean(ok), w, v });
  if (!page.ok || page.status >= 400) {
    add('status', false, 10, page.status);
    return { score: 0, items, url };
  }
  const html = page.html, origin = new URL(page.final).origin;
  add('https', page.final.startsWith('https://'), 10);
  add('status', true, 10, page.status);
  add('speed', page.ttfb < 1200, 4, page.ttfb);
  const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i), tl = tm ? decode(tm[1]).length : 0;
  add('title', tl >= 30 && tl <= 65, 12, tl);
  const dl = (metaContent(html, /name\s*=\s*["']description["']/i) || '').length;
  add('desc', dl >= 70 && dl <= 165, 12, dl);
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  add('h1', h1 === 1, 8, h1);
  add('lang', /<html\b[^>]*\slang\s*=\s*["'][^"']+["']/i.test(html), 4);
  add('viewport', /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html), 8);
  add('canonical', /<link\b[^>]*rel\s*=\s*["']canonical["']/i.test(html), 4);
  add('og', Boolean(metaContent(html, /property\s*=\s*["']og:title["']/i)) && Boolean(metaContent(html, /property\s*=\s*["']og:image["']/i)), 5);
  const imgs = html.match(/<img\b[^>]*>/gi) || [], alt = imgs.filter((t) => /\salt\s*=\s*["'][^"']+["']/i.test(t)).length;
  add('imgalt', !imgs.length || alt / imgs.length >= 0.9, 5, imgs.length ? Math.round((alt / imgs.length) * 100) : 100);
  add('noindex', !/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["'][^"']*noindex/i.test(html), 8);
  const body = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<[^>]+>/gi, ' '));
  add('spa', body.length >= 250, 12, body.length);
  const [robots, sitemap] = await Promise.all([fetchText(`${origin}/robots.txt`), fetchText(`${origin}/sitemap.xml`)]);
  add('robots', robots.ok && !/^\s*Disallow:\s*\/\s*$/im.test(robots.text), 3);
  add('sitemap', sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.text) || /^\s*Sitemap:/im.test(robots.text), 7);
  add('jsonld', /application\/ld\+json/i.test(html), 2);
  const total = items.reduce((n, x) => n + x.w, 0), got = items.filter((x) => x.ok).reduce((n, x) => n + x.w, 0);
  return { score: Math.round((got / total) * 100), items, url, ms: page.ttfb };
}

/* ---------- matnlar ---------- */
const TXT = {
  uz: {
    https: [(v) => 'HTTPS ishlayapti', () => 'HTTPS yoʻq — sayt xavfsiz emas'], status: [(v) => `Sahifa ochiladi (${v})`, (v) => `Sahifa ochilmayapti (${v})`], speed: [(v) => `Tez javob beradi (${v} ms)`, (v) => `Sekin (${v} ms) — rasm va skriptlarni yengillating`],
    title: [(v) => `Sarlavha yaxshi (${v} belgi)`, (v) => (v ? `Sarlavha uzunligi ${v} — 30–65 belgi boʻlsin` : 'Sarlavha (title) yoʻq')], desc: [(v) => `Tavsif yaxshi (${v} belgi)`, (v) => (v ? `Tavsif uzunligi ${v} — 70–165 belgi boʻlsin` : 'Tavsif (meta description) yoʻq')],
    h1: [() => 'Bitta H1 bor', (v) => (v ? `H1 soni ${v} — bitta boʻlsin` : 'H1 sarlavha yoʻq')], lang: [() => 'Til koʻrsatilgan (html lang)', () => 'html lang yoʻq'], viewport: [() => 'Telefonga mos (viewport)', () => 'viewport yoʻq — telefonda notoʻgʻri koʻrinadi'],
    canonical: [() => 'Canonical havola bor', () => 'Canonical havola yoʻq'], og: [() => 'Ijtimoiy tarmoq kartasi (og:title, og:image) bor', () => 'og:title yoki og:image yoʻq — havola yuborilganda chiroyli koʻrinmaydi'],
    imgalt: [(v) => `Rasmlarning ${v}% da alt bor`, (v) => `Rasmlarning faqat ${v}% da alt bor`], noindex: [() => 'Google indekslashiga ruxsat bor', () => 'noindex bor! Google saytni koʻrmaydi'],
    spa: [() => 'Kontent HTMLda bor (Google oʻqiy oladi)', (v) => `Kontent HTMLda deyarli yoʻq (${v} belgi) — JavaScript orqali chiziladi, Google qiynaladi`], robots: [() => 'robots.txt bor', () => 'robots.txt yoʻq yoki hammasini yopgan'],
    sitemap: [() => 'sitemap.xml bor', () => 'sitemap.xml yoʻq'], jsonld: [() => 'Tuzilgan maʼlumot (JSON-LD) bor', () => 'Tuzilgan maʼlumot (JSON-LD) yoʻq'],
    intro: (u) => `Sayt: ${u}\nSEO tekshiruvida quyidagi kamchiliklar topildi. Hammasini tuzat, mavjud dizayn va kontentga keraksiz tegma:`, outro: 'Har bir tuzatishdan keyin qisqa ro‘yxat ber: nima va qayerda o‘zgardi. Oxirida build/test ishlashini tekshir.',
    reqIntro: (n, u) => `Sayt: ${n}${u ? ` (${u})` : ''}.`, reqTask: 'Mijoz soʻrovi:', reqRules: 'Faqat shu oʻzgartirishni kirit, boshqa joyga tegma. Mavjud dizayn va kod uslubiga mos ishla. Tugagach nima va qayerda oʻzgarganini qisqa ro‘yxat qilib ber va build/test ishlashini tekshir.',
  },
  ru: {
    https: [() => 'HTTPS работает', () => 'Нет HTTPS — сайт небезопасен'], status: [(v) => `Страница открывается (${v})`, (v) => `Страница не открывается (${v})`], speed: [(v) => `Быстрый ответ (${v} мс)`, (v) => `Медленно (${v} мс) — облегчите картинки и скрипты`],
    title: [(v) => `Заголовок хороший (${v} симв.)`, (v) => (v ? `Длина заголовка ${v} — нужно 30–65` : 'Нет заголовка (title)')], desc: [(v) => `Описание хорошее (${v} симв.)`, (v) => (v ? `Длина описания ${v} — нужно 70–165` : 'Нет описания (meta description)')],
    h1: [() => 'Один H1', (v) => (v ? `H1 штук: ${v} — нужен один` : 'Нет заголовка H1')], lang: [() => 'Язык указан (html lang)', () => 'Нет html lang'], viewport: [() => 'Адаптивно для телефона (viewport)', () => 'Нет viewport — на телефоне отображается неверно'],
    canonical: [() => 'Есть canonical', () => 'Нет canonical'], og: [() => 'Есть карточка для соцсетей (og:title, og:image)', () => 'Нет og:title или og:image — ссылка выглядит неаккуратно'],
    imgalt: [(v) => `alt есть у ${v}% картинок`, (v) => `alt есть только у ${v}% картинок`], noindex: [() => 'Индексация Google разрешена', () => 'Есть noindex! Google не видит сайт'],
    spa: [() => 'Контент есть в HTML (Google читает)', (v) => `Контента в HTML почти нет (${v} симв.) — рисуется JavaScript, Google сложно`], robots: [() => 'Есть robots.txt', () => 'Нет robots.txt или закрыт весь сайт'],
    sitemap: [() => 'Есть sitemap.xml', () => 'Нет sitemap.xml'], jsonld: [() => 'Есть структурированные данные (JSON-LD)', () => 'Нет структурированных данных (JSON-LD)'],
    intro: (u) => `Сайт: ${u}\nПроверка SEO нашла недостатки. Исправь всё, не трогая без нужды существующий дизайн и контент:`, outro: 'После каждой правки дай краткий список: что и где изменено. В конце проверь, что build/тесты проходят.',
    reqIntro: (n, u) => `Сайт: ${n}${u ? ` (${u})` : ''}.`, reqTask: 'Запрос клиента:', reqRules: 'Внеси только это изменение, остальное не трогай. Соблюдай существующий стиль дизайна и кода. После работы дай краткий список изменений и проверь, что build/тесты проходят.',
  },
  en: {
    https: [() => 'HTTPS works', () => 'No HTTPS — the site is not secure'], status: [(v) => `Page opens (${v})`, (v) => `Page does not open (${v})`], speed: [(v) => `Fast response (${v} ms)`, (v) => `Slow (${v} ms) — lighten images and scripts`],
    title: [(v) => `Good title (${v} chars)`, (v) => (v ? `Title length ${v} — aim for 30–65` : 'Missing title')], desc: [(v) => `Good description (${v} chars)`, (v) => (v ? `Description length ${v} — aim for 70–165` : 'Missing meta description')],
    h1: [() => 'Exactly one H1', (v) => (v ? `${v} H1 tags — use exactly one` : 'No H1 heading')], lang: [() => 'Language set (html lang)', () => 'Missing html lang'], viewport: [() => 'Mobile friendly (viewport)', () => 'Missing viewport — looks wrong on phones'],
    canonical: [() => 'Canonical link present', () => 'Missing canonical link'], og: [() => 'Social card (og:title, og:image) present', () => 'Missing og:title or og:image — shared links look plain'],
    imgalt: [(v) => `${v}% of images have alt`, (v) => `Only ${v}% of images have alt`], noindex: [() => 'Google indexing allowed', () => 'noindex found! Google will not see the site'],
    spa: [() => 'Content is in the HTML (Google can read it)', (v) => `Almost no content in the HTML (${v} chars) — rendered by JavaScript, hard for Google`], robots: [() => 'robots.txt present', () => 'robots.txt missing or blocks everything'],
    sitemap: [() => 'sitemap.xml present', () => 'Missing sitemap.xml'], jsonld: [() => 'Structured data (JSON-LD) present', () => 'No structured data (JSON-LD)'],
    intro: (u) => `Site: ${u}\nThe SEO audit found the issues below. Fix all of them without needlessly touching the existing design and content:`, outro: 'After each fix give a short list: what changed and where. At the end make sure the build/tests pass.',
    reqIntro: (n, u) => `Site: ${n}${u ? ` (${u})` : ''}.`, reqTask: 'Client request:', reqRules: 'Make only this change and leave everything else alone. Follow the existing design and code style. When done, give a short list of what changed and where, and make sure the build/tests pass.',
  },
};
const FIX = {
  https: 'Enable HTTPS and redirect http to https.', status: 'Make the page load with a 2xx status.', speed: 'Improve load speed: compress/lazy-load images, defer non-critical scripts.',
  title: 'Write a unique <title> of 30-65 characters with the main keyword and brand.', desc: 'Add a <meta name="description"> of 70-165 characters.', h1: 'Use exactly one <h1> with the main topic.',
  lang: 'Set <html lang="..."> to the page language.', viewport: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', canonical: 'Add <link rel="canonical"> pointing to the preferred URL.',
  og: 'Add Open Graph tags (og:title, og:description, og:image, og:url).', imgalt: 'Add descriptive alt text to every meaningful image.', noindex: 'Remove the noindex robots meta tag.',
  spa: 'Make the content present in the HTML: use static generation (SSG) or prerendering so Google can read the page without running JavaScript.', robots: 'Add /robots.txt that allows crawling and links to the sitemap.',
  sitemap: 'Generate /sitemap.xml with all public pages.', jsonld: 'Add JSON-LD structured data (Organization / LocalBusiness / WebSite as suitable).',
};
const tr = (lang) => TXT[TXT[lang] ? lang : 'uz'];
const line = (lang, it) => tr(lang)[it.k][it.ok ? 0 : 1](it.v);
const lines = (lang, items) => items.map((it) => ({ ok: it.ok, text: line(lang, it) }));
const badList = (items) => items.filter((x) => !x.ok).map((x) => ({ k: x.k, v: x.v === undefined ? null : x.v }));
function fixPrompt(lang, url, bad) {
  const T = tr(lang);
  return `${T.intro(url)}\n\n${bad.map((b, i) => `${i + 1}. ${FIX[b.k] || b.k}`).join('\n')}\n\n${T.outro}`;
}
// AI ishlamasa: oddiy shablon
function requestPrompt(lang, svc, reqText) {
  const T = tr(lang);
  return `${T.reqIntro(svc.name, svc.url)}\n${T.reqTask} ${reqText}\n\n${T.reqRules}`;
}
const REQ_SYSTEM = 'You turn a client change request for an existing website into one precise, ready-to-paste instruction for an AI coding assistant (Claude) that edits the site. State the goal, the exact change, where it applies (page/section if known), constraints (keep the existing design and code style, do not touch unrelated parts) and how to verify it. Output only the instruction text.';

module.exports = { audit, lines, badList, fixPrompt, requestPrompt, REQ_SYSTEM, tr };
