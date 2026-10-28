# Server: bot buyruqlari, API va eslatmalar (Cloudflare Worker)

- `worker.js` — kirish nuqtasi: `/api/tg` (bot), `/api/meetings` (API), `/api/cal/<kalit>.ics` (kalendar), cron (har daqiqa → `remind`). Qolgan so'rovlar `dist/` statik fayllariga ketadi.
- `functions/bot.js` — Telegram webhook: /yangi, /kelgusi, /bugun, /ertaga, /taqvim, /royxat, /ochirish, /eslatma, /ilova
- `functions/api.js` — mini ilova uchun API: uchrashuvlarni serverda saqlash va ikki tomonlama birlashtirish
- `functions/remind.js` — uchrashuvdan 1 soat (yoki /eslatma da tanlangan vaqt) oldin eslatma yuboradi
- `functions/_shared.js` — umumiy kod. Ma'lumotlar Cloudflare KV'da (`user/<id>`, `cal/<token>`, `invite/<token>`, `idx/users`) — `kv.js`.

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
