# Chilling Bet — do'kon Telegram Mini App

Katalog, qidiruv, kategoriyalar, savat va buyurtma berish.

- Narxlar: `src/products.js` (hozir DEMO narx) — `price` va ixtiyoriy `oldPrice` (chegirma).
- Do'kon nomi / buyurtma qabul qiluvchi: `src/config.js` (`MANAGER_USERNAME` — @siz yozing, buyurtma shu akkauntga xabar bo'lib boradi).
- Rasmlar: `public/img/`.

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # dist/ papkasi
```

Telegramga ulash: `dist` ni https manzilga joylang (GitHub Pages: repo Settings → Pages → Source: GitHub Actions),
so'ng @BotFather → `/newapp` yoki Bot Settings → Menu Button → shu https havola.

## Cloudflare Pages (hozirgi joylashuv)
Sayt: https://chilling-shop.pages.dev — admin panel: `/admin` (parol Cloudflare'dagi `ADMIN_PASSWORD` secret'ida, kodda yo'q).
Narxlar `functions/api/*` orqali Cloudflare KV'da saqlanadi (`KV` binding). Deploy: `npx wrangler pages deploy dist --project-name chilling-shop`.

## Admin mini ilova
Alohida loyiha: `admin/` → https://chilling-admin.pages.dev (Cloudflare Pages, `shop` bilan umumiy KV).
Botda `/admin <parol>` yozilsa, chat admin sifatida eslab qolinadi (yangi buyurtmalar shu chatga keladi) va admin panel tugmasi chiqadi.
Deploy: `cd admin && npm run build && npx wrangler pages deploy dist --project-name chilling-admin`.
