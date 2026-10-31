# Dr. Avazxon – ariza boti (Cloudflare Worker)

Bemor botga `/start` yozadi, pastdagi menyudan kerakli bo‘limni tanlaydi. Qabulga yozilganda masala, kun va soatni tanlab, ism, telefon va izohni kiritadi. Ariza shifokorning Telegramiga tushadi.
Saytdagi forma ham shu botga ulangan (`/api/apply`), sayt arizalari ham shifokorning Telegramiga tushadi.

## Menyu

Pastdagi tugmalar bosilgan bo‘limga qarab almashadi.

| Tugma | Vazifasi |
|---|---|
| 📝 Qabulga yozilish | Masala → kun (bugundan keyingi 10 ish kuni, yakshanbasiz) → soat tanlanadi, so‘ng ism, telefon va izoh so‘raladi |
| 💰 Narxlar | `PRICES_TEXT` matnini ko‘rsatadi (o‘rnatilmagan bo‘lsa umumiy matn) |
| 🩺 Xizmatlar | Qaysi masalalar bo‘yicha murojaat qilish mumkinligi ro‘yxati |
| 💬 Shifokordan so‘rash | Bemor savol yozadi, savol shifokorga boradi. Shifokor savol xabariga **reply** qilsa, javob bemorga yetadi |
| 📞 Aloqa | Telefon va klinika |
| ➕ Yana | Shifokor haqida ma’lumot va chat ID |
| 📊 Hisobot | **Faqat adminlarga ko‘rinadi.** Hisobot mini ilovasini ochadi (pastga qarang) |

Masalalar ro‘yxati va barcha matnlar `worker.js` boshida (`TOPICS`, `ABOUT_TEXT`, `CONTACT_TEXT` va boshqalar) turadi.

## Sozlash (faqat brauzer, dasturlash shart emas)

1. **Cloudflare**: dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → nom: `avazxon-bot` → **Deploy**.
2. **Edit code** bosing, ichidagini o‘chirib, `worker.js` mazmunini qo‘ying → **Deploy**.
3. **KV yarating**: chap menyu **Storage & Databases → KV → Create** (nom: `avazxon-bot-state`).
4. Worker sahifasida **Settings → Bindings → Add → KV namespace**: Variable name **`STATE`**, yaratgan KV’ni tanlang.
5. **Settings → Variables and Secrets** da quyidagilarni qo‘shing:

| Nomi | Turi | Qiymat |
|---|---|---|
| `BOT_TOKEN` | Secret | BotFather bergan token |
| `WEBHOOK_SECRET` | Secret | o‘zingiz yozgan uzun tasodifiy matn (harf va raqam, 30+ belgi) |
| `DOCTOR_CHAT_IDS` | Text | shifokorning chat ID’si (6-qadamga qarang) |
| `PRICES_TEXT` | Text (ixtiyoriy) | «Narxlar» tugmasida chiqadigan matn. `<b>qalin</b>` va `<i>qiyshiq</i>` ishlaydi |
| `SLOTS` | Text (ixtiyoriy) | qabul soatlari vergul bilan, masalan `09:00,10:00,14:00`. Bo‘sh bo‘lsa 09:00 dan 18:00 gacha har soat |
| `ADMIN_CODE` | Secret (ixtiyoriy) | admin kodi. Botga `/admin KOD` yozgan odam admin bo‘ladi |
| `ALLOWED_ORIGIN` | Text (ixtiyoriy) | sayt manzili, bir nechta bo‘lsa vergul bilan: `https://dravaz.uz,https://www.dravaz.uz` |

6. **Chat ID olish**: shifokor botga kirib `/id` yozadi (yoki «Yana» → «Mening ID»), bot raqam yuboradi. Shu raqamni `DOCTOR_CHAT_IDS` ga yozing (bir nechta bo‘lsa vergul bilan: `123,456`). Shifokor avval botda `/start` bosgan bo‘lishi shart, aks holda bot unga yoza olmaydi.
7. **Webhookni ulash**: brauzerda oching:
   `https://avazxon-bot.<akkaunt>.workers.dev/setup?key=WEBHOOK_SECRET_QIYMATI`
   Javobda `"ok":true` chiqsa, bot tayyor. Bu havola Telegramdagi buyruqlar ro‘yxatini ham yangilaydi.
8. Botni sinab ko‘ring: `/start` → «Qabulga yozilish» → masala → kun → soat → ism → telefon → izoh. Shifokorga xabar kelishi kerak.

Tanlangan kun va soat shifokorga arizada ko‘rinadi. Band soatlar botda hisobga olinmaydi: bemor so‘ragan vaqtni shifokor tasdiqlaydi yoki rad etadi.

## Arizani tasdiqlash (shifokor / admin)
`DOCTOR_CHAT_IDS` dagi har bir chatga kelgan arizada **✅ Tasdiqlash** va **❌ Rad etish** tugmalari bor (faqat bot orqali kelgan arizalarda).
- ✅ bosilsa, bemorga «Qabulingiz tasdiqlandi» va kun/soat yuboriladi.
- ❌ bosilsa, bemorga «tanlangan vaqt band, boshqa vaqtni tanlang» xabari boradi.
- Qaror qabul qilingach, tugmalar o‘chadi va arizada natija hamda kim bosgani ko‘rinadi. Bir nechta shifokor bo‘lsa, birinchi bosgan qarorni belgilaydi.
- Tugmalarni faqat adminlar bosa oladi.

## Admin qo‘shish (kod bilan)
Yangi admin botga **`/admin KOD`** yozadi (`KOD` – `ADMIN_CODE` secret qiymati). Kod to‘g‘ri bo‘lsa:
- u admin bo‘ladi: arizalar unga ham keladi, ✅/❌ tugmalarini bosa oladi va savollarga reply bilan javob beradi;
- kod yozilgan xabar chatdan avtomatik o‘chiriladi, boshqa adminlarga «yangi admin qo‘shildi» xabari boradi;
- noto‘g‘ri kod 5 martadan keyin bir soatga bloklanadi.

Adminlar uchun buyruqlar: `/adminlar` – ro‘yxat · `/adminni_ochir ID` – adminlikdan olish. `DOCTOR_CHAT_IDS` dagi asosiy adminlarni bot orqali o‘chirib bo‘lmaydi. Qo‘shilgan adminlar KV’da faqat chat ID sifatida saqlanadi. Kodni almashtirish: Cloudflare → Worker → Settings → Variables and Secrets → `ADMIN_CODE`.


## Hisobot mini ilovasi (adminlar uchun)
Telegram ichida ochiladigan sahifa: `https://avazxon-bot.<akkaunt>.workers.dev/admin`. Adminlar uni **«📊 Hisobot»** tugmasi, `/hisobot` buyrug‘i yoki chatdagi menyu tugmasi orqali ochadi.
Pastki panelda 3 ta bo‘lim bor:
- **Jadval**: kunlar tasmasi (bugun + keyingi 10 ish kuni, har kunning ariza soni bilan). Kun tanlansa, 09:00–18:00 soatlar ro‘yxati chiqadi: band soatda kim yozilgani (ism, masala, holat, qo‘ng‘iroq tugmasi), bo‘sh soatlar «Bo‘sh» deb ko‘rinadi. Band soatlar soni va bir vaqtga tushgan ortiqcha arizalar belgilanadi.
- **Arizalar**: barcha arizalar (yangisi tepada), ism / telefon / masala bo‘yicha qidiruv, holat filtri (soni bilan). Arizani bossangiz, batafsil oyna ochiladi (telefon, masala, qabul vaqti, izoh, manba, yuborilgan vaqt, «Qo‘ng‘iroq qilish» tugmasi).
- **Statistika**: jami va bugungi arizalar, kutilmoqda / tasdiqlangan / rad etilgan, kelgusi 10 kunlik grafik, bot va sayt ulushi, masalalar bo‘yicha taqsimot.

Dizayn sayt bilan bir xil: to‘q yashil fon, oltin urg‘u, Fraunces va Manrope shriftlari. Ilova telefon uchun mo‘ljallangan, Telegram sarlavhasi va pastki paneli ham shu ranglarga moslanadi.

Xavfsizlik: sahifani hamma ocha oladi, lekin ma’lumot faqat Telegram imzosi (`initData`, `BOT_TOKEN` bilan tekshiriladi) to‘g‘ri va foydalanuvchi admin bo‘lsa beriladi. Boshqalarga 401/403 qaytadi. Sahifaning manba kodi `bot/admin.html` (u `worker.js` ichiga `ADMIN_HTML` sifatida joylangan; o‘zgartirilsa, ikkalasini yangilang).

## Buyruqlar

`/hisobot` – hisobot ilovasi (adminlar) · `/start`, `/menu` – asosiy menyu · `/ariza` – qabulga yozilish · `/xizmatlar` – masalalar ro‘yxati · `/cancel` – bekor qilish · `/id` – chat ID

## Sayt bilan bog‘lanish (ulangan)
Saytdagi «Tezkor so‘rov» formasi (`sayt/index.html`) «Ariza yuborish» tugmasi bilan `POST https://avazxon-bot.<akkaunt>.workers.dev/api/apply` ga JSON yuboradi:
`{"name":"Ali","phone":"901234567","topic":"Prostata","comment":"..."}`
- Ariza shifokorning Telegramiga «veb-sayt orqali» belgisi bilan tushadi. Saytdan kelgan arizada ✅/❌ tugmalari yo‘q (bemorning Telegram chati bo‘lmagani uchun), shifokor telefon orqali bog‘lanadi.
- `website` maydoni yashirin (spamdan himoya), bo‘sh bo‘lishi kerak. Bir IP’dan daqiqada 1 ta ariza.
- Brauzer so‘rovi faqat `ALLOWED_ORIGIN` dagi manzillardan o‘tadi (hozir `https://dravaz.uz`, `https://www.dravaz.uz`, `https://shy-term-577a.impro-6c9a2d.workers.dev`). Yangi domen qo‘shilsa, `ALLOWED_ORIGIN` ga vergul bilan qo‘shing.
- Yuborib bo‘lmasa, forma bemorga WhatsApp yoki qo‘ng‘iroq qilishni taklif qiladi.

## Sayt va domen (faqat Cloudflare)
Sayt Cloudflare’da (Workers & Pages → `shy-term-577a`) turadi, `dravaz.uz` domeni ham Cloudflare’da. Boshqa hosting kerak emas.
1. **Sayt yuklash:** Cloudflare → Workers & Pages → Create → **Upload your static files** → `sayt` papkasini (`sayt.zip` ochilgan papka) tashlang → Deploy. Sayt o‘zgargach, loyihada **New deployment** bosib yangi papkani yuklang.
2. **Nameserver:** Cloudflare `dravaz.uz` uchun 2 ta nameserver beradi. Domen sotib olingan joyda (Ahost: Домены → dravaz.uz → Серверы имён) shularni yozing. Cloudflare’da «Active» bo‘lguncha kuting.
3. **Domenni ulash:** loyiha → **Settings → Domains & Routes → Add → Custom domain** → `dravaz.uz`, keyin `www.dravaz.uz` ni qo‘shing. DNS va HTTPS avtomatik sozlanadi.
4. **Google Search Console** (search.google.com/search-console) → **Add property → Domain** → `dravaz.uz` → Google bergan **TXT** yozuvni Cloudflare → DNS → Add record (Type TXT, Name `@`) → Verify.
5. **Sitemap:** Search Console → **Sitemaps** → `sitemap.xml` yuboring. Keyin **URL Inspection** da `https://dravaz.uz/` ni kiritib **Request indexing** bosing. Google odatda bir necha kundan 2–4 haftagacha indekslaydi.
6. **Google Business Profile** (business.google.com): klinika yoki shifokor uchun profil yarating (manzil, telefon, sayt `https://dravaz.uz`). Xaritada va «urolog Qo‘qon» qidiruvida chiqish uchun eng muhimi shu. Tasdiqlash kodi telefon yoki pochta orqali keladi.

Saytda `canonical`, `og:url`, `sitemap.xml`, `robots.txt` va JSON-LD (shifokor/klinika, FAQ) allaqachon `https://dravaz.uz/` ga moslangan.

## Ma’lumotlar
Hisobot uchun har bir arizaning ma’lumotlari (ism, telefon, masala, kun/soat, izohning boshi, holat) KV’da **400 kun** saqlanadi, keyin o‘zi o‘chadi. Ma’lumotlarni faqat adminlar hisobot orqali ko‘ra oladi. Tasdiqlash tugmalari uchun ariza matni 14 kun turadi. Boshqa vaqtinchalik ma’lumotlar (suhbat bosqichi, spamdan himoya, savollarga javob uchun bog‘lanish) ham o‘zi o‘chib ketadi.

## Xavfsizlik
- Tokenni hech qachon kodga yoki GitHub’ga yozmang, faqat Secret sifatida.
- Token chatda yoki ochiq joyda ko‘rinib qolsa, BotFather → `/revoke` orqali yangisini oling va `BOT_TOKEN` ni almashtiring.
