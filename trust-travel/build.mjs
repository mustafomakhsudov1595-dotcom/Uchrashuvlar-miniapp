// Tur sahifalari, credits.html va sitemap.xml ni yaratadi.
// Ishga tushirish:  node build.mjs
// Matnlar: assets/i18n.js. Rasmlar: assets/images.js (images/ papkasi bilan birga).
import fs from "node:fs";
import vm from "node:vm";

const SITE = "https://trust-travel.uz";
const load = (f, g) => { const w = {}; vm.runInNewContext(fs.readFileSync(f, "utf8"), { window: w }); return w[g]; };
const D = load("assets/i18n.js", "TT_I18N");
const IMGS = load("assets/images.js", "TT_IMG");
const has = (k) => IMGS[k] && fs.existsSync("images/" + IMGS[k].f);

const TOURS = [
  { id: "classic", d: 7, stops: ["tashkent", "samarkand", "shakhrisabz", "bukhara", "tashkent"], h: 215 },
  { id: "silk", d: 13, stops: ["tashkent", "fergana", "khiva", "bukhara", "shakhrisabz", "samarkand", "tashkent"], h: 38 },
  { id: "heritage", d: 8, stops: ["tashkent", "samarkand", "bukhara", "khiva", "tashkent"], h: 175 },
  { id: "early", d: 15, stops: ["tashkent", "samarkand", "shakhrisabz", "termez", "bukhara", "khiva", "fergana"], h: 270 },
  { id: "arch", d: 15, stops: ["nukus", "khiva", "bukhara", "termez", "shakhrisabz", "samarkand", "fergana"], h: 25 },
  { id: "south", d: 12, stops: ["tashkent", "khiva", "bukhara", "shakhrisabz", "samarkand", "termez"], h: 190 },
  { id: "gourmet", d: 7, stops: ["tashkent", "samarkand", "shakhrisabz", "bukhara"], h: 18 },
  { id: "pilgrim", d: 10, stops: ["tashkent", "samarkand", "shakhrisabz", "termez", "bukhara"], h: 220 },
];
const UN = { khiva: 1990, bukhara: 1993, shakhrisabz: 2000, samarkand: 2001 };
const LANGS = ["ru", "en", "uz"];

const X = {
  ru: { home: "Главная", tours: "Туры", days: "дней", route: "Маршрут", incl: "Что входит", inclp: "Состав зависит от дат и числа человек. Мы пришлём подробную программу: проживание, транспорт, гид и билеты, с пометкой, что включено, а что оплачивается отдельно.", cta: "Узнать цену и даты", wa: "Написать в WhatsApp", tg: "Написать в Telegram", other: "Другие туры", price: "Цена", pricep: "Зависит от сезона, отелей и числа человек. Назовите даты, и мы пришлём расчёт.", wa_t: "Здравствуйте! Интересует тур", un: "ЮНЕСКО", lic: "Лицензия № 251-06, Узбектуризм", cities: "города", unesco: "объекта ЮНЕСКО", places: "Города маршрута", more: "Подробнее", back: "Все туры", ph: "Фото", credits: "Авторы фотографий", cname: "Автор", clic: "Лицензия", ctitle: "Авторы фотографий", cintro: "Фотографии на сайте опубликованы на Wikimedia Commons под открытыми лицензиями. Спасибо авторам." },
  en: { home: "Home", tours: "Tours", days: "days", route: "Route", incl: "What’s included", inclp: "It depends on dates and group size. We’ll send a detailed programme covering accommodation, transport, guide and tickets, marking what is included and what is paid separately.", cta: "Get price and dates", wa: "Message on WhatsApp", tg: "Message on Telegram", other: "More tours", price: "Price", pricep: "Depends on season, hotels and group size. Tell us your dates and we’ll send a quote.", wa_t: "Hello! I’m interested in the tour", un: "UNESCO", lic: "Licence No. 251-06, Uzbektourism", cities: "cities", unesco: "UNESCO sites", places: "Cities on this route", more: "Details", back: "All tours", ph: "Photo", credits: "Photo credits", cname: "Author", clic: "Licence", ctitle: "Photo credits", cintro: "Photographs on this site are published on Wikimedia Commons under open licences. Thank you to the authors." },
  uz: { home: "Bosh sahifa", tours: "Turlar", days: "kun", route: "Marshrut", incl: "Nimalar kiradi", inclp: "Sanalar va odamlar soniga bog‘liq. Biz batafsil dastur yuboramiz: turar joy, transport, gid va chiptalar, nima kirishi va nima alohida to‘lanishi ko‘rsatiladi.", cta: "Narx va sanalarni bilish", wa: "WhatsApp’da yozish", tg: "Telegram’da yozish", other: "Boshqa turlar", price: "Narx", pricep: "Mavsum, mehmonxona va odamlar soniga bog‘liq. Sanalaringizni ayting, hisob-kitob yuboramiz.", wa_t: "Assalomu alaykum! Quyidagi tur qiziqtirdi:", un: "YuNESKO", lic: "251-06-sonli litsenziya, O‘zbekturizm", cities: "shahar", unesco: "YuNESKO obyekti", places: "Marshrut shaharlari", more: "Batafsil", back: "Barcha turlar", ph: "Surat", credits: "Rasm mualliflari", cname: "Muallif", clic: "Litsenziya", ctitle: "Rasm mualliflari", cintro: "Saytdagi suratlar Wikimedia Commons’da ochiq litsenziyalar bilan e’lon qilingan. Mualliflarga rahmat." },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const blk = (tag, fn, attrs = "") => LANGS.map((l) => `<${tag} data-l="${l}"${attrs}>${fn(l)}</${tag}>`).join("");
const ARROW = '<svg viewBox="0 0 30 12" aria-hidden="true" width="30" height="12"><path d="M0 6h28M23 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const LOGO = '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 1l12 12-12 12L1 13z" fill="none" stroke="#C8A24E" stroke-width="1.4"/><path d="M13 7l6 6-6 6-6-6z" fill="#C8A24E"/></svg>';
const METRIKA = `<script>document.documentElement.className+=" js";
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(58712101,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script>
<noscript><div><img src="https://mc.yandex.ru/watch/58712101" style="position:absolute;left:-9999px" alt=""></div></noscript>`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">`;

const header = (extra = "") => `<header class="hdr solid">
  <div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="Trust Travel">${LOGO}<span>Trust Travel<small>SINCE 2006</small></span></a>
    <span style="margin:0 auto"></span>
    <a class="link" href="/#tours" style="margin-right:6px">${blk("span", (l) => "← " + X[l].back)}</a>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="ru" aria-pressed="true">RU</button>
      <button type="button" data-lang="en" aria-pressed="false">EN</button>
      <button type="button" data-lang="uz" aria-pressed="false">UZ</button>
    </div>
  </div>
</header>`;

const footer = `<footer>
  <div class="wrap">
    <div class="copy" style="border-top:0;padding-top:0"><span>© 2026 Trust Travel · ${blk("span", (l) => D[l].ft_addr)}</span><span><a href="/credits.html">${blk("span", (l) => X[l].credits)}</a> · <a href="mailto:info@trust-travel.uz">info@trust-travel.uz</a></span></div>
  </div>
</footer>`;

const langScript = (extra) => `<script>
(function(){
var TG="trusttravel_uz",LANGS=["ru","en","uz"],lang="ru";
${extra.vars}
try{var s=localStorage.getItem("tt-lang");if(s&&LANGS.indexOf(s)>-1)lang=s;}catch(e){}
function goal(n){try{if(window.ym)ym(58712101,"reachGoal",n);}catch(e){}}
function apply(){
  document.documentElement.lang=lang;
  var b=document.querySelectorAll(".lang button");for(var i=0;i<b.length;i++)b[i].setAttribute("aria-pressed",String(b[i].getAttribute("data-lang")===lang));
  ${extra.apply}
}
document.querySelector(".lang").addEventListener("click",function(e){var b=e.target.closest("button[data-lang]");if(!b)return;lang=b.getAttribute("data-lang");try{localStorage.setItem("tt-lang",lang);}catch(err){}apply();});
document.addEventListener("click",function(e){var a=e.target.closest("[data-goal]");if(a)goal(a.getAttribute("data-goal"));});
apply();
})();
</script>`;

function tourCard(o) {
  return `<a class="tour" href="/tours/${o.id}.html" style="--h:${o.h}"><div class="ph" aria-hidden="true"></div>${has("t-" + o.id) ? `<img src="/images/${IMGS["t-" + o.id].f}" alt="" loading="lazy" decoding="async">` : ""}<div class="tour-top"><span class="days">${blk("span", (l) => o.d + " " + X[l].days)}</span></div><div class="tour-body"><h3>${blk("span", (l) => D[l].tours[o.id][0])}</h3>${blk("p", (l) => D[l].tours[o.id][1])}<span class="go">${blk("span", (l) => X[l].more)} ${ARROW}</span></div></a>`;
}

function page(t) {
  const name = (l) => D[l].tours[t.id][0];
  const desc = (l) => D[l].tours[t.id][1];
  const uniq = [...new Set(t.stops)];
  const unc = uniq.filter((k) => UN[k]).length;
  const others = TOURS.filter((o) => o.id !== t.id).slice(0, 3);
  const heroKey = "t-" + t.id;
  const og = has(heroKey) ? `${SITE}/images/${IMGS[heroKey].f}` : `${SITE}/images/og.jpg`;
  const ld = { "@context": "https://schema.org", "@type": "TouristTrip", name: name("en"), description: desc("en"), provider: { "@type": "TravelAgency", name: "Trust Travel", url: SITE + "/" }, itinerary: uniq.map((k) => ({ "@type": "City", name: D.en.cities[k] })), url: `${SITE}/tours/${t.id}.html` };
  const bc = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Trust Travel", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: name("en"), item: `${SITE}/tours/${t.id}.html` }] };
  const gal = uniq.filter((k) => has("d-" + k)).slice(0, 3);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<title>${esc(name("ru"))} — Trust Travel</title>
<meta name="description" content="${esc(desc("ru"))} ${t.d} ${X.ru.days}. Trust Travel, Ташкент.">
<meta property="og:title" content="${esc(name("ru"))} — Trust Travel">
<meta property="og:description" content="${esc(desc("ru"))}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}/tours/${t.id}.html">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${SITE}/tours/${t.id}.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(bc)}</script>
${METRIKA}
</head>
<body>
${header()}
<main>
<section class="thero">
  <div class="ph" aria-hidden="true"></div>
  ${has(heroKey) ? `<img class="bg" src="/images/${IMGS[heroKey].f}" alt="" fetchpriority="high" decoding="async">` : ""}
  <div class="wrap thero-in">
    <nav class="crumbs" aria-label="breadcrumb">${blk("span", (l) => `<a href="/">${X[l].home}</a> / <a href="/#tours">${X[l].tours}</a>`)}</nav>
    ${blk("h1", name)}
    ${blk("p", desc, ' class="lead"')}
    <div class="acts">
      <a class="btn btn-gold" href="#book" data-goal="tour_cta">${blk("span", (l) => X[l].cta)}</a>
      <a class="btn btn-ghost" id="waTop" href="https://wa.me/998999047419" target="_blank" rel="noopener" data-goal="click_whatsapp">WhatsApp</a>
    </div>
    <div class="facts-bar">
      <div>${blk("span", (l) => X[l].days)}<b>${t.d}</b></div>
      <div>${blk("span", (l) => X[l].cities)}<b>${uniq.length}</b></div>
      ${unc ? `<div>${blk("span", (l) => X[l].unesco)}<b>${unc}</b></div>` : ""}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap tgrid">
    <div>
      <div class="sec-head" style="margin-bottom:36px"><h2>${blk("span", (l) => X[l].route)}</h2></div>
      <ol class="tstops">
        ${t.stops.map((k, i) => {
          const firstSeen = t.stops.indexOf(k) === i;
          const cls = i === 0 ? "first" : i === t.stops.length - 1 ? "last" : "";
          return `<li class="${cls}"><h3>${blk("span", (l) => D[l].cities[k])}${UN[k] && firstSeen ? `<span class="u">${blk("span", (l) => X[l].un + " " + UN[k])}</span>` : ""}</h3>${D.ru.sights[k] && firstSeen ? blk("p", (l) => D[l].sights[k]) : ""}</li>`;
        }).join("\n        ")}
      </ol>
    </div>
    <aside class="side" id="book">
      <h3>${blk("span", (l) => X[l].incl)}</h3>
      ${blk("p", (l) => X[l].inclp)}
      <h3>${blk("span", (l) => X[l].price)}</h3>
      ${blk("p", (l) => X[l].pricep)}
      <div class="acts">
        <a class="btn btn-gold" id="waBtn" href="https://wa.me/998999047419" target="_blank" rel="noopener" data-goal="click_whatsapp">${blk("span", (l) => X[l].wa)}</a>
        <a class="btn btn-ghost" id="tgBtn" href="https://t.me/trusttravel_uz" target="_blank" rel="noopener" data-goal="click_telegram">${blk("span", (l) => X[l].tg)}</a>
        <a class="btn btn-ghost" href="tel:+998999047419" data-goal="click_phone">+998 99 904 74 19</a>
      </div>
      <p style="margin-top:22px;font-size:.78rem">${blk("span", (l) => X[l].lic)}</p>
    </aside>
  </div>
</section>
${gal.length >= 2 ? `<section class="sec alt"><div class="wrap"><div class="sec-head"><h2>${blk("span", (l) => X[l].places)}</h2></div><div class="tgal">${gal.map((k) => `<figure><img src="/images/${IMGS["d-" + k].f}" alt="${esc(D.en.cities[k])}" loading="lazy" decoding="async"><figcaption>${blk("span", (l) => D[l].cities[k])}</figcaption></figure>`).join("")}</div></div></section>` : ""}
<section class="sec${gal.length >= 2 ? "" : " alt"}">
  <div class="wrap">
    <div class="sec-head"><h2>${blk("span", (l) => X[l].other)}</h2></div>
    <div class="tours">
      ${others.map(tourCard).join("\n      ")}
    </div>
  </div>
</section>
</main>
${footer}
${langScript({
  vars: `var NAME=${JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, name(l)])))},WT=${JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, X[l].wa_t])))};`,
  apply: `document.title=NAME[lang]+" — Trust Travel";
  var txt=WT[lang]+" «"+NAME[lang]+"» ("+location.href+")";
  var w=document.querySelectorAll("#waTop,#waBtn");for(var j=0;j<w.length;j++)w[j].href="https://wa.me/998999047419?text="+encodeURIComponent(txt);
  document.getElementById("tgBtn").href="https://t.me/"+TG+"?text="+encodeURIComponent(txt);`,
})}
</body>
</html>
`;
}

function credits() {
  const keys = Object.keys(IMGS).filter(has);
  const seen = new Set();
  const rows = keys.map((k) => IMGS[k]).filter((i) => i.l !== "own" && !seen.has(i.f) && seen.add(i.f));
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0A0A0B">
<title>Photo credits — Trust Travel</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="/assets/site.css">
${METRIKA}
</head>
<body>
${header()}
<main class="cpage"><div class="wrap">
${blk("h1", (l) => X[l].ctitle)}
${blk("p", (l) => X[l].cintro, ' style="color:var(--muted)"')}
<ul>
${rows.map((i) => `<li><b>${esc(i.t)}</b> — ${esc(i.a || "Wikimedia Commons")} · ${esc(i.l)} · <a href="${esc(i.u)}" target="_blank" rel="noopener">Wikimedia Commons</a></li>`).join("\n")}
</ul>
</div></main>
${footer}
${langScript({ vars: "", apply: "" })}
</body>
</html>
`;
}

fs.mkdirSync("tours", { recursive: true });
for (const t of TOURS) fs.writeFileSync(`tours/${t.id}.html`, page(t));
fs.writeFileSync("credits.html", credits());
const urls = ["/", ...TOURS.map((t) => `/tours/${t.id}.html`)];
fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log("OK:", TOURS.length, "tur sahifasi + credits.html + sitemap.xml;", Object.keys(IMGS).filter(has).length, "rasm bor");
