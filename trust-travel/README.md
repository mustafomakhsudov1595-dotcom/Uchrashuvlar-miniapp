# Trust Travel — sayt (trust-travel.uz)

Statik sayt, build kerak emas. RU / EN / UZ, bitta qora-oltin dizayn tizimi.

```
index.html        bosh sahifa (HTML + JS), asosiy mazmun
assets/site.css   butun dizayn (bosh sahifa va tur sahifalari uchun umumiy)
assets/i18n.js    barcha matnlar uch tilda
assets/images.js  rasmlar ro'yxati va mualliflari (avtomatik)
images/           WebP rasmlar (Wikimedia Commons, ochiq litsenziya)
tours/*.html      8 ta tur sahifasi (build.mjs yaratadi)
credits.html      rasm mualliflari (CC BY-SA talabi; saytda havola bor, o'chirmang)
```

Matn yoki turni o'zgartirsangiz: `assets/i18n.js` yoki `index.html` ni tahrirlang, so'ng `node build.mjs`
(tur sahifalari, credits.html va sitemap.xml qayta yaratiladi).

## Cloudflare Pages
Build command: bo'sh. Output directory: `trust-travel`. Yoki: `npx wrangler pages deploy trust-travel --project-name trust-travel`.
Custom domains → `trust-travel.uz` va `www.trust-travel.uz`; DNS yozuvlari Cloudflare'da bo'lishi kerak.

## O'zingizning rasmlaringiz
Fayl nomi bilan almashtiring (WebP/JPG, `images/` ichida) va `assets/images.js` dagi `f` maydonini yangilang:
`hero-1..3` (bosh ekran), `d-*` (shaharlar), `t-*` (turlar), `ca` (Markaziy Osiyo fon).
Mehmonxona: `images/hotel.webp` qo'ying va `assets/images.js` ga `"hotel":{"f":"hotel.webp","t":"Trust Travel","a":"Trust Travel","l":"own","u":"https://trust-travel.uz"}` qo'shing, so'ng `node build.mjs`.
O'zingizning rasmlaringiz uchun credits.html da yozuv ko'rinmasligi uchun `l:"own"` bo'lganlarni build.mjs filtrlaydi.

## Telegram
`TG = "trusttravel_uz"` (index.html) va `https://t.me/trusttravel_uz` (build.mjs, index.html) — haqiqiy username bilan almashtiring.

## Yandex Metrika (58712101)
Hamma sahifada. Maqsadlar (JavaScript-hodisa): `click_whatsapp`, `click_telegram`, `click_phone`, `click_mail`, `send_whatsapp`,
`send_telegram`, `send_mail`, `quick_form`, `route_send`, `dest_route`, `tour_cta`.
