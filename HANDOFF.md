# Impro It Notes — sessiyani davom ettirish yozuvi

Oxirgi yangilanish: 2026-11-15 · Branch: `bot-eslatma` · Deploy: Cloudflare Worker `impro-notes`
Sayt: https://impro-notes.uchrashuvlar-mini-app.workers.dev · Bot: @Improitnotes_bot

## Loyiha nima
Faqat jamoa (egasi Mustafo, oʻzbek tilida muloqot) uchun Telegram bot + mini ilova. Mijozlar botdan foydalanmaydi.
Stack: Cloudflare Worker (`server/worker.js`), KV, Workers AI, cron har daqiqa; mini ilova React 19 + Vite (`src/`).
Hujjat: `server/README.md` (modullar roʻyxati).

## Qilingan ishlar (hammasi deploy va push qilingan)
- Uchrashuvlar, loyihalar (toʻlov/qarz), mijozlar, oylik toʻlovlar, daromad/xarajat/maqsad, sayt monitoringi, zaxira, Servis (tayyor saytlar), SEO tekshiruv, Claude-prompt generatori, xabar shablonlari, offline rejim.
- AI chat (ma'lumot kontekstli), rasm/ovoz tahlili, internetga ulangan javoblar (ob-havo, kurs, yangilik, namoz, futbol, qidiruv).
- **Chiqim (Toʻlash kerak):** kimga/qachon/qancha, eslatmalar (3/1/0 kun, kechikkan), hisob-prognoz, oylik takror, **kredit** (`cn`/`ci`: N oylik, har oy keyingi toʻlov, 7/3/1 kun oldin eslatma).
- **Navigatsiya:** "+" tez qoʻshish menyusi (`QuickMenu`), pastki menyuda **Pul** boʻlimi (`MoneyView`: Chiqim | Daromad | Statistika), bosh sahifada "Toʻlash kerak" lentasi. Pastki menyu `fixed` xatosi tuzatilgan (`.app` transformi olib tashlangan).
- **Dizayn:** shrift Sora + Manrope (serif olib tashlangan), chiroyli sana tanlash (`DateField`), tanlov tugmalari (`Choice`) va tumblerlar.
- **Ertalabki xabar:** "💰 Pul holati" qatori. **Oylik PDF hisobot** (`pdf.js`): `/hisobot`, har oy 1-sana 09:30 avto.
- **Xato ogohlantirish** (`alert.js`) va **salomatlik nazorati** (`health.js`): webhook har 30 daqiqada tekshiriladi/avto-tiklanadi, `/holat` (admin).
- **Instagram lid boti** (`ig.js`): webhook `/api/ig`, AI javob (faqat Instagram'da), lidlar KV'da, kunlik hisobot 20:00, `/ig`, `/igtest`, mini ilovada Loyihalar → Lidlar (admin). Privacy Policy `/privacy`, token avto-yangilash qoʻshilgan (qarang: git log).
- **Tuzatilgan xato:** yarim qolgan uchrashuv qoralamasi (`u.state`) AI'ni toʻsib qoʻyardi → holat 20 daqiqadan keyin (yoki `at` yoʻq boʻlsa) tozalanadi, savol boʻlsa AI javob beradi, "ob-havo/kurs" uchrashuvga aylanmaydi.

## Kutilayotgan / ochiq masalalar
1. **Instagram Meta ulanishi hali qilinmagan** (egasi bajaradi): Business akkaunt, Meta app, secrets `IG_TOKEN`, `IG_ACCOUNT_ID`, `IG_VERIFY_TOKEN` (`IG_APP_SECRET` ixtiyoriy) Cloudflare'ga, webhook `…/api/ig`, tester bilan sinash, soʻng App Review. Yoʻriqnoma suhbatda berilgan.
2. Egasi Telegramda `/holat` va "Bugun ob-havo qanday?" bilan AI ishlashini tekshirishi kerak (oxirgi nosozlik tuzatildi, jonli tasdiq yoʻq).
3. Bepul Workers AI kunlik limiti tugashi mumkin (`AI_LIMIT` 80/kun foydalanuvchiga) — pullik rejani maslahat berish.
4. Keyingi gʻoyalar (egasi tasdiqlamagan): Tijoriy taklif (KP) PDF, toʻlov vaʼdasi, lidlar voronkasi, loyiha soatlik narxi.
5. Xavfsizlik: avval chatga yopishtirilgan tokenlar bekor qilinishi kerak; sirlar faqat Cloudflare secrets / environment secrets orqali.

## Ishlash qoidalari
- Oʻzbekcha javob bering, qisqa va aniq tavsiya bering (uzun roʻyxat yoqmaydi).
- Oʻzgarishdan keyin: `npx vite build` → `npx wrangler deploy` → commit va `git push origin bot-eslatma`. Tokenlar (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) sessiya environment'ida.
- Sinov: mock testlar (`ptest*.js`) va Playwright skrinshotlar; jonli tekshiruv uchun vaqtinchalik admin yoʻli qoʻshib, soʻng albatta olib tashlang.
- `git fetch origin bot-eslatma:refs/remotes/origin/bot-eslatma` — masofaviy branchda boshqa sessiya commitlari boʻlishi mumkin, push oldidan rebase qiling.
- Stop-hook "yuborilmagan commit" xabari ba'zan eskirgan boʻladi; `git ls-remote origin bot-eslatma` bilan tekshiring.

## 2026-11-17: Video / sayt / bot yasash funksiyalari OLIB TASHLANDI
Egasi talabi bilan `/video`, `/sayt`, `/botyasa`, `/mening` (agent.js, ubot.js, agent/, agent.yml) butunlay oʻchirildi. Cloudflare'da `GH_DISPATCH_TOKEN` va `GEMINI_API_KEY` secretlari, GitHub'dagi agent secretlari endi kerak emas (oʻchirish tavsiya qilinadi). Qolgan funksiyalar oʻzgarmagan.

## 2026-11-17: Hisob-kitob
Pul → **Hisob** (kirim, chiqim, foyda, kassa, 6 oylik dinamika, amallar daftari) va bot `/hisob`, `/kirim`. Qoʻlda kirim `expenses` ichida `k:"in"`; barcha chiqim hisoblari (`expensesIn`, `incomeByMonth`, PDF, CSV) buni hisobga oladi.

## 2026-11-17: Balans
`bal:{a0,d}` + `balAt` (foydalanuvchi sinxronlanadi). Balans = a0 + (d dan bugungacha kirim − chiqim). `setBalance` bugungi yozuvlar ikki marta hisoblanmasligi uchun a0 ni moslaydi. Bot: `/balans [summa]`, mini ilova: Pul → Hisob → Balans kartasi. Toʻlovlar (Chiqim) avtomatik xarajat boʻlgani uchun balansdan ayriladi.

## 2026-11-17: Hamyonlar va dollar
`bal` = { cash, card, usd: {a0,d}, def } (def — loyiha/oylik kirimlari tushadigan hamyon). Yozuvlarda `w` (hamyon), oʻtkazma `k:"tr"` (`w`→`w2`, `a`→`a2`). Dollar hamyonida summa USD (2 xona). Toʻlovda `cu:"USD"`. Kurs: `S.getRate()` (cbu.uz, KV `fx/<kun>`), mijozga API javobida `fx`. Bot: `/balans [naqd|karta|dollar] summa`, `/otkazma`, `/kurs`, `$` bilan `/kirim`, `/xarajat`, `/tolash`. Sinov uchun `FX_USD=12000` env.

## 2026-11-17: Umumiy hisob (login/parol) va admin panel
`ws.js`: hisob (workspace) = login+parol (PBKDF2). Hisobga kirgan hamma (`/kirish`) bir xil `meetings, projects, subs, expenses, services, payables, goal, bal, places, payInfo` (S.WS_DATA) koʻradi; maʼlumot KV `ws/<id>` da, foydalanuvchi yozuvida faqat `ws` koʻrsatkichi + shaxsiy sozlamalar. `getUser` hisob maʼlumotini ustiga qoʻyadi, `saveUser` `mergeWs` bilan birlashtirib yozadi (id/updatedAt/oʻchirish tombstone). Eslatmalar hisob uchun bir marta (cron), `globalThis.__fan` orqali hamma aʼzoga yuboriladi. Admin panel: `/admin` (adminlar); asosiy admin (ADMIN_IDS) aʼzoga 👑 beradi (`ws/admins`) va hisobni oʻchiradi. Kirish urinishlari 5 ta xatodan keyin 15 daqiqa bloklanadi. Cheklov: ikki aʼzo aynan bir vaqtda yozsa (KV atomik emas) kam ehtimol bilan bittasining oʻzgarishi yoʻqolishi mumkin.

## 2026-11-17: Kirishda login majburiy
`S.needLogin(u)` = GATE && !admin && !u.ws. Bot: `ws.gate` har xabarda (ruxsat: /start, /kirish, /til, /bekor va login yozilayotgan holat); mini ilova/API kirmagan foydalanuvchiga 401 `error:"login"` → `LoginGate` ekrani. Adminlar kirishsiz ishlaydi. Panel: «Kirishda login soʻrash» tugmasi (`ws/cfg`), favqulodda oʻchirish: Cloudflare var `LOGIN_REQUIRED=off`. Cron kirmagan foydalanuvchilarga eslatma yubormaydi.

Mini ilova login: `LoginGate` (login+parol) → API `action:"login"` (`ws.tryLogin`), muvaffaqiyatda `clearLocalData()` (eski shaxsiy maʼlumot hisobga qoʻshilib ketmasin) va qayta yuklanadi. Sozlamalarda «Chiqish» (`action:"logout"`).

## 2026-11-17: Eslatmalar 7/3/1 kun
Toʻlash kerak (Chiqim): hammasi uchun 7/3/1 kun oldin + kun + kechikkan (`pay.remind`). Kutilayotgan daromad (`inc.js`): oylik toʻlov (obuna) kunidan 7/3/1 kun oldin; loyihada `pdue` (toʻlov kutilayotgan sana, ProjectForm) boʻlsa 7/3/1/0 kun oldin va kechikkan (har 2 kun, 14 kungacha). Hammasi umumiy hisobdagi har bir aʼzoga boradi.

## 2026-11-17: Hodimga vazifa berish
`tasks.js`: `u.tasks` (+`tdeleted`) umumiy hisobda (WS_DATA/WS_COLL). Bot: `/vazifa` (roʻyxat), `/vazifa Sardor: banner, ertaga 18:00` yoki tugmalar (kimga → muddat); hodimga xabar + «Bajardim»; bajarilsa bergan odamga xabar; eslatma (ertaga/bugun/kechikkan, faqat egasiga, `__fan` oʻchiriladi). Mini ilova: Loyihalar → Vazifalar (`TasksView`), API: `tasks|taskadd|taskdone|taskdel`. Oʻchirish — faqat yaratuvchi yoki admin.

## 2026-11-17: Telegram Business (Chat Automation)
`biz.js`: `business_connection` (ulanish) va `business_message` (mijoz yozdi → AI sizning nomingizdan `business_connection_id` bilan javob; akkaunt egasi yozsa AI 12 soat jim). Lidlar Instagram bilan bir bazada (`iglead/tg<chatId>`, `src:"tg"`). BotFather → Bot Settings → Business Mode yoqilgan boʻlishi shart. Webhook `allowed_updates` ga business_* qoʻshilgan (`health.WANT`, avto-tiklash).

## 2026-11-17: Javob doirasi
`ig.js` AI (Instagram va Telegram Business): standart `mode:"any"` — kim nima soʻrasa oʻsha mavzuda va oʻsha odamning tilida/uslubida javob; `/ig` → «Faqat ish boʻyicha» tugmasi (`mode:"work"`). Jonli maʼlumot (ob-havo, kurs, yangilik, namoz, sport) `web.gather` orqali. Kirill javob lotinga oʻgirilmaydi (`ext.cleanAi`). AI egasi nomidan hech narsa va’da qilmaydi ([[OPERATOR]]).

## 2026-11-17: Telegram Business jim vaqti va ruxsat
Egasi chatda oʻzi yozsa AI shu chatda jim: `ig/cfg.muteMin` (15/60/240/720/0 daq; standart 60, `/ig` → «Egam yozsa AI jim» tugmasi). Egasi birinchi yozgan suhbatda ham lid yaratilib jim qilinadi. Telegram Business ulanishi faqat adminlar va hisobga kirgan aʼzolar uchun (`biz.onConnection`), begona akkauntlar rad etiladi.

## Doimiy xotira (bot)
`server/functions/ig.js` ichida `MEMORY` konstantasi: bot har doim biladigan faktlar. Hozir: Impro It direktori (xojayini) — Ali. Yangi fakt qoʻshish uchun shu satrni tahrirlang.

## Business: ovoz/rasm, muhim odamlar, mijozga eslatma
- `biz.js` `mediaText`: ovozli xabar (whisper, ≤90 s) → `[ovozli xabar] ...`, rasm (vision) → `[rasm: ...]`; AI shuni mijoz gapi deb javob beradi. Tushunilmasa AI'ga yuborilmaydi, aniq xabar ketadi.
- Muhim odamlar (`ig/cfg.vip`): AI javob bermaydi, egasiga darhol (har 10 daqiqada 1 marta) `notifyVip`. Boshqarish: `/muhim [@username]`, `/ig` → ⭐, lid kartasida «⭐ Muhim qilish».
- Mijozga toʻlov eslatmasi: lid kartasi → «🔗 Loyihaga bogʻlash» (KV `ig/clink`: loyiha id → {lead, conn, chat, name}). `inc.js` loyiha `pdue` 3/1/0 kun va kechiksa mijozga `biz.sendAs` bilan yuboradi (7 kunlik faqat egasiga).
- Callback: `bot.js` `ig.onCallback(ctx,u,act,a,b)` (b = uchinchi boʻlak).

## Direktor (haftalik tahlil va prognoz)
`server/functions/dir.js`: dushanba 09:00 dan keyin (hafta ichida bir marta, KV `dir/<ws|id>`) haftalik hisobot: kirim/chiqim/foyda oʻtgan hafta bilan solishtirilgan, balans, bu haftadagi kutilayotgan/chiqadigan pul, kechikkanlar, hodimlar reytingi + AI tavsiyasi (AI ishlamasa qoida asosida). Buyruqlar: `/direktor` (hozir), `/prognoz [N] [narx]` (yil oxirigacha bashorat, oyiga N ta yangi loyiha).
