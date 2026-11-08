// Tur sahifalarini index.html dagi ma'lumotlardan yaratadi.
// Ishga tushirish:  node build.mjs
// Natija: tours/<id>.html, sitemap.xml, assets/site.css
import fs from "node:fs";
import vm from "node:vm";

const SITE = "https://trust-travel.uz";
const src = fs.readFileSync("index.html", "utf8");

// --- index.html ichidan D (tarjimalar), PHOTOS va CSS ni olamiz ---
const dText = src.slice(src.indexOf("var D = {") + 8, src.indexOf("var LANGS="));
const D = vm.runInNewContext("(" + dText.trim().replace(/;$/, "").replace(/^D\s*=\s*/, "") + ")");
const photosText = src.match(/var PHOTOS=\{[\s\S]*?\};/)[0].replace("var PHOTOS=", "PHOTOS=");
const IMG = "/images/";
const PHOTOS = vm.runInNewContext("var IMG=" + JSON.stringify(IMG) + ";" + photosText + ";PHOTOS");
const css = src.match(/<style>([\s\S]*?)<\/style>/)[1];
fs.writeFileSync("assets/site.css", css.trim() + "\n" + fs.readFileSync("assets/tour.css", "utf8"));

// --- turlar: id, kunlar, shaharlar ketma-ketligi (kalitlar index.html dagi cities bilan bir xil) ---
const TOURS = [
  { id: "classic", d: 7, stops: ["tashkent", "samarkand", "shakhrisabz", "bukhara", "tashkent"] },
  { id: "silk", d: 13, stops: ["tashkent", "fergana", "khiva", "bukhara", "shakhrisabz", "samarkand", "tashkent"] },
  { id: "heritage", d: 8, stops: ["tashkent", "samarkand", "bukhara", "khiva", "tashkent"] },
  { id: "early", d: 15, stops: ["tashkent", "samarkand", "shakhrisabz", "termez", "bukhara", "khiva", "fergana"] },
  { id: "arch", d: 15, stops: ["nukus", "khiva", "bukhara", "termez", "shakhrisabz", "samarkand", "fergana"] },
  { id: "south", d: 12, stops: ["tashkent", "khiva", "bukhara", "shakhrisabz", "samarkand", "termez"] },
  { id: "gourmet", d: 7, stops: ["tashkent", "samarkand", "shakhrisabz", "bukhara"] },
  { id: "pilgrim", d: 10, stops: ["tashkent", "samarkand", "shakhrisabz", "termez", "bukhara"] },
];
const UN = { khiva: 1990, bukhara: 1993, shakhrisabz: 2000, samarkand: 2001 };

// Sahifaga xos matnlar (3 til)
const X = {
  ru: { home: "Главная", tours: "Туры", days: "дней", route: "Маршрут", sights: "Что увидите", incl: "Что входит", inclp: "Состав зависит от дат и числа человек. Мы пришлём подробную программу: проживание, транспорт, гид и билеты, с пометкой, что включено, а что оплачивается отдельно.", cta: "Узнать цену и даты", wa: "Написать в WhatsApp", tg: "Написать в Telegram", other: "Другие туры", price: "Цена", pricep: "Зависит от сезона, отелей и числа человек. Назовите даты, и мы пришлём расчёт.", wa_t: "Здравствуйте! Интересует тур", un: "ЮНЕСКО", ph: "Телефон", lic: "Лицензия № 251-06, Узбектуризм" },
  en: { home: "Home", tours: "Tours", days: "days", route: "Route", sights: "What you’ll see", incl: "What’s included", inclp: "It depends on dates and group size. We’ll send a detailed programme covering accommodation, transport, guide and tickets, marking what is included and what is paid separately.", cta: "Get price and dates", wa: "Message on WhatsApp", tg: "Message on Telegram", other: "More tours", price: "Price", pricep: "Depends on season, hotels and group size. Tell us your dates and we’ll send a quote.", wa_t: "Hello! I’m interested in the tour", un: "UNESCO", ph: "Phone", lic: "Licence No. 251-06, Uzbektourism" },
  uz: { home: "Bosh sahifa", tours: "Turlar", days: "kun", route: "Marshrut", sights: "Nimalarni ko‘rasiz", incl: "Nimalar kiradi", inclp: "Sanalar va odamlar soniga bog‘liq. Biz batafsil dastur yuboramiz: turar joy, transport, gid va chiptalar, nima kirishi va nima alohida to‘lanishi ko‘rsatiladi.", cta: "Narx va sanalarni bilish", wa: "WhatsApp’da yozish", tg: "Telegram’da yozish", other: "Boshqa turlar", price: "Narx", pricep: "Mavsum, mehmonxona va odamlar soniga bog‘liq. Sanalaringizni ayting, hisob-kitob yuboramiz.", wa_t: "Assalomu alaykum! Quyidagi tur qiziqtirdi:", un: "YuNESKO", ph: "Telefon", lic: "251-06-sonli litsenziya, O‘zbekturizm" },
};
const LANGS = ["ru", "en", "uz"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const L = (fn) => LANGS.map((l) => fn(l)).join("");
const blk = (tag, fn, attrs = "") => L((l) => `<${tag} data-l="${l}"${attrs}>${fn(l)}</${tag}>`);

function page(t) {
  const name = (l) => D[l].tours[t.id][0];
  const desc = (l) => D[l].tours[t.id][1];
  const photo = PHOTOS[t.id];
  const uniq = [...new Set(t.stops)];
  const others = TOURS.filter((o) => o.id !== t.id).slice(0, 3);
  const ld = {
    "@context": "https://schema.org", "@type": "TouristTrip", name: name("en"), description: desc("en"),
    provider: { "@type": "TravelAgency", name: "Trust Travel", url: SITE + "/" },
    itinerary: uniq.map((k) => ({ "@type": "City", name: D.en.cities[k] })),
    url: `${SITE}/tours/${t.id}.html`,
  };
  const bc = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trust Travel", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: name("en"), item: `${SITE}/tours/${t.id}.html` }],
  };
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name("ru"))} — Trust Travel</title>
<meta name="description" content="${esc(desc("ru"))} ${t.d} ${X.ru.days}. Trust Travel, Ташкент.">
<meta property="og:title" content="${esc(name("ru"))} — Trust Travel">
<meta property="og:description" content="${esc(desc("ru"))}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}/tours/${t.id}.html">
<meta property="og:image" content="${SITE}${photo}">
<link rel="canonical" href="${SITE}/tours/${t.id}.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(bc)}</script>
<script>document.documentElement.className+=" js";
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(58712101,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script>
<noscript><div><img src="https://mc.yandex.ru/watch/58712101" style="position:absolute;left:-9999px" alt=""></div></noscript>
<link rel="stylesheet" href="/assets/site.css">
</head>
<body class="tp">
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="Trust Travel">
      <svg viewBox="0 0 22 22" aria-hidden="true"><path d="M11 1l10 10-10 10L1 11z" fill="none" stroke="var(--gold)" stroke-width="1.6"/><path d="M11 6.5l4.5 4.5-4.5 4.5L6.5 11z" fill="var(--gold)"/></svg>
      Trust Travel
    </a>
    <nav class="crumbs" style="margin:0 auto" aria-label="breadcrumb">${blk("span", (l) => `<a href="/">${X[l].home}</a> / <a href="/#tours">${X[l].tours}</a>`)}</nav>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="ru" aria-pressed="true">RU</button>
      <button type="button" data-lang="en" aria-pressed="false">EN</button>
      <button type="button" data-lang="uz" aria-pressed="false">UZ</button>
    </div>
  </div>
</header>

<main>
<section class="thero">
  <div class="thero-bg"><img src="${photo}" alt="" onerror="if(!this.dataset.r){this.dataset.r=1;this.src='https://trust-travel.uz/wp-content/uploads/2020/02/${photo.replace(IMG, "")}'}else{this.remove()}"></div>
  <div class="wrap thero-in">
    <p class="kicker">${blk("span", (l) => `${t.d} ${X[l].days}`)}</p>
    ${blk("h1", name)}
    ${blk("p", desc, ' class="lead"')}
    <div class="acts">
      <a class="btn btn-main" href="#book" data-goal="tour_cta">${blk("span", (l) => X[l].cta)}</a>
      <a class="btn btn-line" id="waTop" href="https://wa.me/998999047419" target="_blank" rel="noopener" data-goal="click_whatsapp">WhatsApp</a>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap tgrid">
    <div>
      <div class="sec-head"><h2>${blk("span", (l) => X[l].route)}</h2></div>
      <ol class="tstops">
        ${t.stops.map((k, i) => `<li>${blk("b", (l) => D[l].cities[k])}${UN[k] && t.stops.indexOf(k) === i ? `<em class="u">${blk("span", (l) => X[l].un + " " + UN[k])}</em>` : ""}${D.ru.sights[k] && t.stops.indexOf(k) === i ? blk("p", (l) => D[l].sights[k]) : ""}</li>`).join("\n        ")}
      </ol>
    </div>
    <aside>
      <div class="rpanel">
        <div class="rtotal">${t.d}<small>${blk("span", (l) => X[l].days)}</small></div>
        <h3 class="side-h">${blk("span", (l) => X[l].incl)}</h3>
        ${blk("p", (l) => X[l].inclp, ' class="side-p"')}
        <h3 class="side-h">${blk("span", (l) => X[l].price)}</h3>
        ${blk("p", (l) => X[l].pricep, ' class="side-p"')}
        <p class="side-p"><small>${blk("span", (l) => X[l].lic)}</small></p>
      </div>
    </aside>
  </div>
</section>

<section class="sec" id="book">
  <div class="wrap">
    <div class="hotel">
      <div>
        ${blk("h2", (l) => X[l].cta)}
        ${blk("p", (l) => desc(l))}
        <div class="acts" style="display:flex;flex-wrap:wrap;gap:12px">
          <a class="btn btn-main" id="waBtn" href="https://wa.me/998999047419" target="_blank" rel="noopener" data-goal="click_whatsapp">${blk("span", (l) => X[l].wa)}</a>
          <a class="btn btn-line" id="tgBtn" href="https://t.me/trusttravel_uz" target="_blank" rel="noopener" data-goal="click_telegram">${blk("span", (l) => X[l].tg)}</a>
          <a class="btn btn-line" href="tel:+998999047419" data-goal="click_phone">+998 99 904 74 19</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="more">
  <div class="wrap">
    <div class="sec-head"><h2>${blk("span", (l) => X[l].other)}</h2></div>
    <div class="tours">
      ${others.map((o) => `<a class="tour" href="/tours/${o.id}.html" style="text-decoration:none"><div class="art"><img src="${PHOTOS[o.id]}" alt="" loading="lazy" onerror="this.remove()"></div><div class="tour-body"><div class="meta"><span class="days">${blk("span", (l) => o.d + " " + X[l].days)}</span></div><h3>${blk("span", (l) => D[l].tours[o.id][0])}</h3>${blk("p", (l) => D[l].tours[o.id][1])}</div></a>`).join("\n      ")}
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap copy" style="padding:8px 22px 40px">© 2026 Trust Travel · ${blk("span", (l) => D[l].ft_addr)} · <a href="mailto:info@trust-travel.uz" style="display:inline">info@trust-travel.uz</a></div>
</footer>

<script>
(function(){
var TG="trusttravel_uz",NAME=${JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, name(l)])))},WT=${JSON.stringify(Object.fromEntries(LANGS.map((l) => [l, X[l].wa_t])))};
var lang="ru";try{var s=localStorage.getItem("tt-lang");if(s&&NAME[s])lang=s;}catch(e){}
function goal(n){try{if(window.ym)ym(58712101,"reachGoal",n);}catch(e){}}
function apply(){
  document.documentElement.lang=lang;
  document.title=NAME[lang]+" — Trust Travel";
  var b=document.querySelectorAll(".lang button");for(var i=0;i<b.length;i++)b[i].setAttribute("aria-pressed",String(b[i].getAttribute("data-lang")===lang));
  var txt=WT[lang]+" «"+NAME[lang]+"» ("+location.href+")";
  var w=document.querySelectorAll("#waTop,#waBtn");for(var j=0;j<w.length;j++)w[j].href="https://wa.me/998999047419?text="+encodeURIComponent(txt);
  document.getElementById("tgBtn").href="https://t.me/"+TG+"?text="+encodeURIComponent(txt);
}
document.querySelector(".lang").addEventListener("click",function(e){var b=e.target.closest("button[data-lang]");if(!b)return;lang=b.getAttribute("data-lang");try{localStorage.setItem("tt-lang",lang);}catch(err){}apply();});
document.addEventListener("click",function(e){var a=e.target.closest("[data-goal]");if(a)goal(a.getAttribute("data-goal"));});
apply();
})();
</script>
</body>
</html>
`;
}

fs.mkdirSync("tours", { recursive: true });
for (const t of TOURS) fs.writeFileSync(`tours/${t.id}.html`, page(t));

const urls = ["/", ...TOURS.map((t) => `/tours/${t.id}.html`)];
fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log("OK:", TOURS.length, "tur sahifasi,", urls.length, "URL sitemap.xml da");
