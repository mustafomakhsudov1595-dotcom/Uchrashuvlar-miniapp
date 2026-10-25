# Server: bot buyruqlari, API va eslatmalar (Netlify Functions)

- `functions/bot.js` — Telegram webhook (/api/tg): /yangi, /kelgusi, /bugun, /ertaga, /taqvim, /royxat, /ochirish, /eslatma, /ilova
- `functions/api.js` — mini ilova uchun API (/api/meetings): uchrashuvlarni serverda saqlash va ikki tomonlama birlashtirish
- `functions/remind.js` — har daqiqada ishlaydi, uchrashuvdan 1 soat (yoki /eslatma da tanlangan vaqt) oldin eslatma yuboradi
- `functions/_shared.js` — umumiy kod. Ma'lumotlar Netlify Blobs'da (`impro` ombori, `user/<id>` kalitlari).

Kerakli o'zgaruvchilar (Netlify → Environment variables): `BOT_TOKEN`, `WEBHOOK_SECRET`, `SITE_URL`.
Vaqt zonasi: telefon vaqt zonasi ilovadan olinadi (standart: Toshkent, UTC+5).
