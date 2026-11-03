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
