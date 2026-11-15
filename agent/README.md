# Agent (bepul): video va sayt yasash

Telegram: `/video mavzu`, `/sayt tavsif`  →  Cloudflare Worker GitHub Actions workflow'ni ishga tushiradi (`.github/workflows/agent.yml`) →  `agent/run.py` ishlaydi →  natija Telegramga qaytadi.

## Nima bepul
GitHub Actions (ochiq repoda cheksiz, yopiqda oyiga 2000 daq), Gemini API (bepul kalit), Edge TTS (ovoz), Pexels (rasm), Cloudflare Workers (sayt).

## Sozlash
1. **Gemini kaliti:** aistudio.google.com → Get API key.
2. **Pexels kaliti:** pexels.com/api → bepul kalit (rasmsiz ham ishlaydi, fon rangli boʻladi).
3. **GitHub repo secrets** (Settings → Secrets and variables → Actions): `BOT_TOKEN`, `GEMINI_API_KEY`, `PEXELS_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. **GitHub token (Worker uchun):** Settings → Developer settings → Fine-grained tokens → faqat shu repo → *Actions: Read and write*. Cloudflare'da `wrangler secret put GH_DISPATCH_TOKEN`.
5. `agent.yml` **main** branchda boʻlishi kerak (workflow_dispatch uchun). Boshqa branch uchun Cloudflare vars: `AGENT_REF`.

## Eslatma
- Repo ochiq boʻlsa, workflow kirishlari (buyurtma matni) hamma uchun koʻrinadi → reponi **private** qiling (2000 daq/oy yetadi).
- `run.py` logga buyurtma matnini chop etmaydi.
- Bot yasash rejimi keyingi bosqich (BotFather tokeni xavfsiz uzatilishi kerak).

## Hamma uchun
`/video` va `/sayt` botga kirgan **har kim** uchun ishlaydi (kirish qoidasi `BOT_ACCESS`). Foydalanuvchi oʻz tilida (uz/ru/en) javob oladi va video shu tilda ovozlanadi.
Bepul limitlarni asrash uchun kuniga: har kimga 3 video va 3 sayt, umumiy 40 ta; adminlar cheklanmaydi (`server/functions/agent.js` → `LIMIT`, `GLOBAL`).
Har foydalanuvchining buyurtmasi alohida navbatda (`agent-<chat>`), bir-birini kutib qolmaydi.
