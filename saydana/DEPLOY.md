# Saydana saytini Cloudflare Pages'ga ulash

Sayt oddiy statik sayt (`index.html`, `style.css`, `script.js`, `img/`). Build kerak emas.

## 1-usul: GitHub orqali (tavsiya etiladi, push qilsangiz o'zi yangilanadi)

1. https://dash.cloudflare.com ga kiring → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. GitHub'ni ulang va `uchrashuvlar-miniapp` repozitoriyasini tanlang.
3. Sozlamalar:
   - **Production branch:** `claude/saydana-medical-center-site-ccqhxs`
     (yoki o'zgarishlarni `main` ga qo'shib, `main` ni tanlang)
   - **Framework preset:** `None`
   - **Build command:** bo'sh qoldiring
   - **Build output directory:** `saydana`
   - **Root directory:** bo'sh qoldiring
4. **Save and Deploy** ni bosing. Sayt `https://<loyiha-nomi>.pages.dev` manzilida ochiladi.
5. O'z domeningiz uchun: loyiha → **Custom domains** → **Set up a domain**.

Repozitoriyadagi boshqa ilova (Uchrashuvlar, Vite) bu sozlamada ishlatilmaydi.

## 2-usul: buyruq qatori orqali

```bash
npx wrangler login
npx wrangler pages deploy saydana --project-name=saydana
```

## Papkadagi Cloudflare fayllari

- `_headers` — xavfsizlik sarlavhalari (CSP va boshqalar) va kesh qoidalari.
  CSP faqat Google Fonts va Google Maps'ga ruxsat beradi. Boshqa tashqi manba qo'shsangiz (masalan, analitika), `_headers` dagi `Content-Security-Policy` ni yangilang.
- `404.html` — "Sahifa topilmadi" sahifasi.
- `robots.txt` — qidiruv tizimlariga ruxsat.

## Domen ulangandan keyin

- `index.html` ichiga `<link rel="canonical" href="https://SIZNING-DOMEN/">` qo'shing.
- Kerak bo'lsa `sitemap.xml` yarating va `robots.txt` ga `Sitemap: https://SIZNING-DOMEN/sitemap.xml` qatorini qo'shing.
