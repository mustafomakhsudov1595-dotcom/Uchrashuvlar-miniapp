# Trust Travel — sayt (trust-travel.uz)

Statik sayt, build kerak emas. Asosiy sahifa — bitta `index.html` (CSS va JS ichida).
Tur sahifalari `node build.mjs` bilan `index.html` dagi matnlardan yaratiladi (`tours/*.html`, `sitemap.xml`, `assets/site.css`).
Matn yoki turni o'zgartirsangiz: `index.html` ni tahrirlang, so'ng `node build.mjs`.

## 1. Cloudflare Pages'ga joylash
1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → shu repo, branch tanlang.
2. Build command: bo'sh. Build output directory: `trust-travel`. Deploy.
   (Git'siz variant: Upload assets → `trust-travel` papkasini sudrab tashlang.)
3. Custom domains → Set up a custom domain → `trust-travel.uz` va `www.trust-travel.uz`.
   Domen Cloudflare DNS'da bo'lsa, yozuvlarni o'zi qo'shadi. Bo'lmasa, nameserver'larni Cloudflare'ga ko'chiring
   yoki registrator panelida `CNAME www → <loyiha>.pages.dev` qo'ying (apex uchun Cloudflare DNS kerak).
4. Eski WordPress sayti shu domenda ishlayotgan bo'lsa, ulashdan oldin undan zaxira nusxa oling.

## 2. Rasmlar
- `bash download-images.sh` eski saytdan 10 ta rasmni `images/` ga yuklaydi (internet kerak). Rasm bo'lmasa, sayt eski saytdagi havolaga tushadi, u ham bo'lmasa rasmsiz ko'rinadi.
- Mehmonxona: `images/hotel.jpg` (4:5, taxminan 1000×1250). Fayl bo'lsa avtomatik chiqadi.

## 3. Telegram
`index.html` va `build.mjs` ichida `TG = "trusttravel_uz"` va `https://t.me/trusttravel_uz` — haqiqiy username bilan almashtiring
(`grep -rn trusttravel_uz .`), so'ng `node build.mjs`.

## 4. Yandex Metrika (58712101)
Hamma sahifada o'rnatilgan. Maqsadlar (Metrika → Sozlamalar → Maqsadlar → JavaScript-hodisa): `click_whatsapp`, `click_telegram`,
`click_phone`, `send_whatsapp`, `send_telegram`, `tour_quote`, `tour_cta`.
