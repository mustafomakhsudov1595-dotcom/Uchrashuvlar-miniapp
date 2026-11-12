# Server: bot buyruqlari, API va eslatmalar (Cloudflare Worker)

- `worker.js` — kirish nuqtasi: `/api/tg` (bot), `/api/meetings` (API), `/api/cal/<kalit>.ics` (kalendar), cron (har daqiqa → `remind`). Qolgan so'rovlar `dist/` statik fayllariga ketadi.
- `functions/bot.js` — Telegram webhook: /yangi, /kelgusi, /bugun, /ertaga, /taqvim, /royxat, /ochirish, /eslatma, /ilova
- `functions/api.js` — mini ilova uchun API: uchrashuvlarni serverda saqlash va ikki tomonlama birlashtirish
- `functions/remind.js` — uchrashuvdan 1 soat (yoki /eslatma da tanlangan vaqt) oldin eslatma yuboradi
- `functions/_shared.js` — umumiy kod. Ma'lumotlar Cloudflare KV'da (`user/<id>`, `cal/<token>`, `invite/<token>`, `idx/users`) — `kv.js`.

## Loyihalar, qarzlar va xulosalar

- `functions/proj.js` — loyihalar: vazifalar, muddat eslatmalari, `/loyiha`, `/loyihalar`, `/vazifalar`, `/qarz` (mijoz toʻlovlari va qoldiq).
- Ertalabki karta: har kuni 08:00 (sozlamalardan 07:00/09:00 yoki oʻchirish) — bugungi uchrashuvlar, kechikkan va bugungi vazifalar, yaqin muddatlar, qarzlar.
- Haftalik xulosa: yakshanba 19:00 — tugagan loyihalar, tushgan pul, qarz, kelasi hafta muddatlari.
- Toʻlov eslatmasi: tayyor yoki muddati oʻtgan loyiha qoldigʻi boʻyicha har 3 kunda (ko'pi bilan 6 marta).

- `functions/fin.js` — oylik toʻlovlar (`/obuna`, har oyning belgilangan kunida 09:00 dan eslatma, 2 kunda bir, ko'pi bilan 3 marta), mijozlar bazasi (`/mijozlar`, ism boʻyicha birlashadi), daromad (`/daromad`, 6 oy) va CSV eksport (`/eksport`).
- `functions/voice.js` — ovozli xabar (Workers AI · Whisper), `functions/report.js` — mijozga hisobot sahifasi (`/r/<kalit>`).

- `functions/ext.js` — xarajatlar va sof foyda (`/xarajat`, `/xarajatlar`), oylik maqsad (`/maqsad`), sayt kuzatuvi (`/saytlar`; har soatda tekshiradi, ochilmasa xabar beradi, domen muddati 30/7/1 kun oldin), zaxira (`/zaxira`; har dushanba 10:00 da avtomatik, JSON faylni botga yuborsangiz tiklaydi) va AI yordamchi (`/ai`, loyiha kartasidagi tugmalar; Workers AI, kuniga 30 ta).
- Sayt tekshiruvi sekin boʻlishi mumkin, shuning uchun `remind.js` saqlashdan oldin foydalanuvchini qayta oʻqib birlashtiradi.

- `functions/svc.js` — servis: tayyor saytlar (`/servis`; mijoz, telefon, sayt va Claude sessiyasi havolasi, topshirilgan sana, 12 oylik servis muddati, oʻzgartirish soʻrovlari). Muddat tugashiga 30/7 kun qolganda eslatadi. Tayyor loyihadan “🛠 Servisga” tugmasi bilan oʻtkaziladi.

- `functions/team.js` — kirish rejimi `BOT_ACCESS` (wrangler.jsonc): `open` (standart, hamma kira oladi; `/jamoa` aʻzolarni koʻrsatadi va chiqarishga imkon beradi) yoki `closed` — faqat admin (`ADMIN_IDS`, wrangler.jsonc), taklif havolasi (`/jamoa` → “Aʻzo taklif qilish”, 7 kun, bir martalik) bilan qoʻshilganlar va oldingi foydalanuvchilar ishlata oladi. Begona odam `/start` bossa hisob ochilmaydi, API 403 qaytaradi. Chiqarilgan aʻzo `blocked/<id>` bilan yopiladi.

- `functions/seo.js` — sayt SEO tekshiruvi (`vs` tugmasi / API `seo`): HTTPS, sarlavha, tavsif, H1, viewport, canonical, og, alt, noindex, robots/sitemap, JSON-LD va kontent HTMLda borligi (SPA aniqlash). Natija 100 ballik, kamchiliklar Claude uchun tayyor topshiriqqa aylanadi. Mijoz soʻrovidan topshiriq (`vg` / API `sprompt`) AI bilan yoziladi, AI ishlamasa shablon. Eslatma: Worker oʻz workers.dev saytini tekshira olmaydi (Cloudflare cheklovi), tashqi domenlar ishlaydi.

- `functions/msgs.js` — mijozga tayyor xabarlar (`✉️` tugmasi: toʻlov eslatmasi, ish tayyor, muddat koʻchdi, servisni uzaytirish, oʻzgartirish bajarildi; uz/ru/en; `/rekvizit` karta maʼlumotini qoʻshadi).
- `functions/insight.js` — AI tahlil (`/tahlil`, har yakshanba haftalik xulosa ostida): loyiha, qarz, daromad, servis va saytlar holatidan aniq tavsiya.
- Servis: oʻzgartirishlar tarixi (bajarilgan soʻrov avtomatik yoziladi, 90 kunlik hisobot matni) va Claude havolasi nazorati (yoʻq/notoʻgʻri/404; har dushanba tekshiriladi).
- AI: asosiy model `gpt-oss-120b` (reasoning_effort low), ishlamasa `mistral-small-3.1`, keyin `llama-3.3`. Oʻzbekcha uchun lotin yozuvi va toʻgʻri apostroflar (oʻ, gʻ, maʼ) majburlanadi, "toʻqima" qoidasi bor.
- Oflayn: `public/sw.js` ilova qobigʻini keshlaydi, oflayn paytda yuqorida belgi chiqadi, internet kelganda avtomatik sinxronlanadi.

- `functions/chat.js` — suhbatdosh AI: buyruq va oqim boʻlmagan har qanday matn (yoki ovozli xabar) savol boʻlsa AI javob beradi. U foydalanuvchi maʼlumotlarini (uchrashuv, loyiha, qarz, servis, daromad) koʻrib turadi, oxirgi 8 xabarni 8 soat eslab qoladi (`/tozala` yoki “🆕 Yangi suhbat” tozalaydi). Maʼlumotni oʻzi oʻzgartirmaydi, tegishli buyruqni aytadi. Kuniga 80 ta AI soʻrov.

- `functions/vision.js` — rasm yuborilsa AI tahlil qiladi (chek: summa/sana va `/xarajat` taklifi, mijoz yozishmasi skrinshoti, sayt dizayni, hujjat). Izoh (caption) savol sifatida olinadi. JPG/PNG/WebP, 5 MB gacha, albomda faqat birinchi rasm. Model: Mistral Small 3.1, zaxira Llama 4 Scout.
- Ovoz: voice, audio fayl va video-xabar matnga aylantiriladi. Aniq soat boʻlsa — uchrashuv, boshqa hammasi AI suhbatga (transkript xatolari hisobga olinadi).

- `functions/web.js` — internet: AI avval vositani tanlaydi (router, Mistral), natija javob uchun kontekst boʻladi. Vositalar: ob-havo (Open-Meteo), valyuta (cbu.uz) va kripto (Coinbase), namoz vaqti (Aladhan), shahar vaqti, yangiliklar (kun.uz, BBC), Vikipediya, futbol (ESPN: natija, jonli hisob, keyingi oʻyin) va umumiy veb-qidiruv (Bing: bir nechta qisqa soʻrov + dolzarblik saralash + sahifa oʻqish). Soʻrov inglizcha/ruscha kalit soʻzlarga oʻgiriladi. Manba havolalari javob oxirida. Cheklov: DuckDuckGo/Google/Brave Cloudflare IP'larini bloklaydi; Bing mahalliy narxlarni (masalan Oʻzbekistondagi iPhone narxi) yaxshi topmaydi.
- Tuzatish: `DEBUG_AI=1` oʻzgaruvchisi bilan deploy qilinsa AI javoblari logga yoziladi (odatda oʻchiq).

- `functions/pay.js` — **toʻlash kerak** (majburiyatlar): kimga, nima uchun, qancha, qachon (`/tolash`; qisqa: `/tolash Sardor, maosh, 1 500 000, 5.12, oylik`). Eslatma: muddatdan 3 kun, 1 kun oldin, kuni va keyin har kuni (14 kungacha); “Toʻlandi / Qisman / +3 kun” tugmalari. Toʻlov avtomatik **xarajatga** yoziladi (sof foyda hisobiga kiradi), oylik boʻlsa keyingi oy oʻzi yaratiladi, oxirgi toʻlovni bekor qilish mumkin. Hisob-kitob: jami, muddati oʻtgan, 7 kun, oy, kimga qancha va 30 kunlik prognoz (kutilayotgan tushum − toʻlovlar). Ertalabki karta, haftalik xulosa, `/tahlil` va AI suhbatga ham kiradi.

## Deploy

```bash
npm ci
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npm run deploy
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" -d url=<SITE_URL>/api/tg -d secret_token=<WEBHOOK_SECRET>
```

`SITE_URL` va `BOT_USERNAME` — `wrangler.jsonc` ichida (`vars`). Vaqt zonasi: telefon vaqt zonasi ilovadan olinadi (standart: Toshkent, UTC+5).
Eslatma: cron har daqiqa barcha foydalanuvchilarni o'qiydi — Workers bepul rejasida KV o'qish limiti (100k/kun) kichik foydalanuvchi soniga yetadi.

## Qoʻshimcha modullar
- `alert.js` — xatolar haqida adminga ogohlantirish (bir xil xato 30 daqiqada 1 marta, soatiga ≤6).
- `pdf.js` — oylik PDF hisobot (kutubxonasiz). `/hisobot` yoki Daromad ekranidagi «📄 PDF»; har oyning 1-sanasi 09:30 dan avtomatik yuboriladi (`dsent.r`).
- Ertalabki xabarga «💰 Pul holati» qatori (`pay.moneyBlock`).
