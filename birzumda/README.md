# Birzumda Hotdog — Telegram buyurtma Mini App

Bot + mini ilova (mijoz uchun) + alohida admin panel. Tashqi kutubxona yo'q, faqat **Node.js 20+**.

- **Mini ilova** (`/`) — Instagram "aktual" uslubidagi kategoriyalar, menyu, savat, promokod, buyurtma, pastda rasmlar galereyasi.
- **Admin panel** (`/admin`) — parol bilan kiriladi: buyurtmalar va statuslar, **promokodlar** (kod + chegirma foizini admin o'zi belgilaydi), menyu narxlari / "tugagan" belgisi, ish holati va sozlamalar.
- **Bot** — `/start` mini ilovani ochadi; yangi buyurtma adminga keladi (tugmalar bilan status o'zgartirish), mijozga status haqida xabar boradi.

## Ishga tushirish

```bash
cd birzumda
cp .env.example .env     # BOT_TOKEN, ADMIN_PASSWORD, WEBAPP_URL ni to'ldiring
npm start
```

Telegram Mini App faqat `https://` manzilda ochiladi. Serverni hosting/VPS'ga qo'ying (Render, Railway, VPS + Caddy/nginx) yoki test uchun `npx cloudflared tunnel --url http://localhost:3000`, so'ng olingan https manzilni `.env` dagi `WEBAPP_URL` ga yozing. Bot menyu tugmasini o'zi o'rnatadi.

## Admin sifatida buyurtma xabarlarini olish

Botga yozing: `/admin PAROL` (PAROL = `.env` dagi `ADMIN_PASSWORD`). Shundan keyin yangi buyurtmalar shu chatga keladi. Bir nechta admin qo'shish mumkin. Chiqish: `/adminoff`.

## Promokod

Admin panel → 🎟 Promokodlar → kod va foiz kiriting (masalan `BIRZUMDA10` / `10`). Mijoz savatda kodni yozsa, summadan shu foiz avtomatik ayriladi. Hisob serverda qayta tekshiriladi, shuning uchun mijoz narxni soxtalashtira olmaydi.

## Xavfsizlik

- **Bot token faqat `.env` da** (u `.gitignore` da, GitHub'ga yuklanmaydi). Frontend kodda token yo'q.
- Chatda yuborilgan token oshkor bo'lgan hisoblanadi — @BotFather → `/revoke` bilan yangisini oling.
- Buyurtma Telegram `initData` imzosi bilan tekshiriladi; narxlar va chegirma serverda hisoblanadi.
- Ma'lumotlar `data/db.json` faylida saqlanadi (zaxira nusxa oling).

## Sinash uchun

`DEV_MODE=1` imzo tekshiruvini o'chiradi (faqat lokal test, productionda **qo'ymang**).

## Hostingga joylash (Render misolida)

1. render.com'da ro'yxatdan o'ting → **New → Blueprint** → shu GitHub repozitoriyni tanlang (`birzumda/render.yaml` o'qiladi).
2. `BOT_TOKEN` va `ADMIN_PASSWORD` ni kiriting. `WEBAPP_URL` ni keyinroq to'ldiring.
3. Deploy tugagach Render bergan `https://....onrender.com` manzilni `WEBAPP_URL` ga yozib, qayta ishga tushiring.
4. Telegram'da botga `/start`, keyin `/admin PAROL` yozing. Admin panel: `WEBAPP_URL/admin`.

Bepul rejalarda server uxlab qoladi va disk o'chib ketadi (promokod va buyurtmalar yo'qoladi), shuning uchun doimiy disk bor reja yoki VPS tavsiya etiladi.
