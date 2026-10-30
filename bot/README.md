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
| `ALLOWED_ORIGIN` | Text (ixtiyoriy) | sayt manzili, masalan `https://avazxon.uz` |

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
- Tugmalarni faqat `DOCTOR_CHAT_IDS` dagi chatlar bosa oladi. Admin qo‘shish uchun uning chat ID’sini shu o‘zgaruvchiga vergul bilan qo‘shing.


## Buyruqlar

`/start`, `/menu` – asosiy menyu · `/ariza` – qabulga yozilish · `/xizmatlar` – masalalar ro‘yxati · `/cancel` – bekor qilish · `/id` – chat ID

## Sayt bilan bog‘lanish (ulangan)
Saytdagi «Tezkor so‘rov» formasi (`netlify-sayt/index.html`) «Ariza yuborish» tugmasi bilan `POST https://avazxon-bot.<akkaunt>.workers.dev/api/apply` ga JSON yuboradi:
`{"name":"Ali","phone":"901234567","topic":"Prostata","comment":"..."}`
- Ariza shifokorning Telegramiga «veb-sayt orqali» belgisi bilan tushadi. Saytdan kelgan arizada ✅/❌ tugmalari yo‘q (bemorning Telegram chati bo‘lmagani uchun), shifokor telefon orqali bog‘lanadi.
- `website` maydoni yashirin (spamdan himoya), bo‘sh bo‘lishi kerak. Bir IP’dan daqiqada 1 ta ariza.
- Brauzer so‘rovi faqat `ALLOWED_ORIGIN` dagi sayt manzilidan o‘tadi (hozir `https://magenta-phoenix-dba70a.netlify.app`). Saytga o‘z domeningiz ulansa, `ALLOWED_ORIGIN` ni shu domenga o‘zgartiring.
- Yuborib bo‘lmasa, forma bemorga WhatsApp yoki qo‘ng‘iroq qilishni taklif qiladi.
- Sayt o‘zgargach, `netlify-sayt` papkasini (yoki `netlify-sayt.zip` ni) Netlify’ga qayta yuklang.

## Ma’lumotlar
Arizalar doimiy saqlanmaydi, shifokorning Telegramiga yuboriladi. Tasdiqlash tugmalari ishlashi uchun ariza matni (ism, telefon, kun/soat) KV’da 14 kun turadi va o‘zi o‘chadi. Boshqa vaqtinchalik ma’lumotlar (suhbat bosqichi, spamdan himoya, savollarga javob uchun bog‘lanish) ham o‘zi o‘chib ketadi.

## Xavfsizlik
- Tokenni hech qachon kodga yoki GitHub’ga yozmang, faqat Secret sifatida.
- Token chatda yoki ochiq joyda ko‘rinib qolsa, BotFather → `/revoke` orqali yangisini oling va `BOT_TOKEN` ni almashtiring.
