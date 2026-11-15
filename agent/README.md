# Yaratish markazi (bepul): video, sayt, Telegram bot

Hamma foydalanuvchi uchun, kuniga: **5 video, 5 sayt, 5 bot**. Yaratilganlarni **cheklovsiz** oʻzgartirish mumkin (himoya: kuniga 60 tahrir).

## Buyruqlar
- `/video mavzu` — ssenariy Telegramda koʻrsatiladi → ✏️ xohlagancha oʻzgartirasiz → 🎬 render (GitHub Actions, ovoz + rasm + ffmpeg).
- `/sayt tavsif` — premium dizayndagi sayt Cloudflare'ga joylanadi (`site-<id>`); ✏️ tugmasi bilan istalgan joyini oʻzgartirasiz (link oʻzgarmaydi).
- `/botyasa tavsif` — BotFather tokenini yuborasiz (xabar oʻchiriladi), AI bot tavsifini yozadi va bot **darrov** bizning Cloudflare'da ishlaydi. Oʻzgartirish, lidlar, xabar yuborish, toʻxtatish, oʻchirish: `/botlarim`.
- `/mening` — hamma ishlar.

## Bot platformasi (`server/functions/ubot.js`)
Begona kod ishga tushmaydi: AI faqat JSON tavsif yozadi (menyu, buyruqlar, AI-javob bilimi, lid yigʻish), uni Worker ijro etadi. Tokenlar AES-GCM bilan shifrlanib KV'da turadi (`UB_KEY` ixtiyoriy qoʻshimcha kalit). Webhook: `/api/ub/<id>`.

## Sozlash (video va sayt uchun)
1. Gemini kaliti (aistudio.google.com) va rasm kaliti (ixtiyoriy): **Pixabay** (pixabay.com/api/docs, tijoriy foydalanish bepul) yoki Pexels (hozir yangi kalit bermayapti). Kalitsiz video rangli fon bilan chiqadi.
2. GitHub repo secrets: `BOT_TOKEN`, `GEMINI_API_KEY`, `PIXABAY_API_KEY` (yoki `PEXELS_API_KEY`), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. Cloudflare secrets: `GH_DISPATCH_TOKEN` (fine-grained PAT, faqat shu repo, *Actions: Read and write*), ixtiyoriy `GEMINI_API_KEY` (ssenariy va bot tavsifi tezroq/sifatliroq boʻladi; yoʻq boʻlsa Workers AI ishlatiladi).
4. `agent.yml` yangi `impro-notes` reponing **main** branchida (kodni shu repoga main qilib yuklaymiz). Boshqacha boʻlsa: Cloudflare vars `GH_REPO`, `AGENT_REF`.
5. Repo **private** boʻlsin (buyurtma matnlari loglarda koʻrinmasligi uchun).
Bot yasash (`/botyasa`) 1-4 qadamlarsiz ham ishlaydi.
