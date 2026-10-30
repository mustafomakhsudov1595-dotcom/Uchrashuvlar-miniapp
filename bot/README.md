# Dr. Avazxon – ariza boti (Cloudflare Worker)

Bemor botga `/start` yozadi, pastdagi menyudan kerakli bo‘limni tanlaydi. Qabulga yozilganda masalani tanlab, ism, telefon va izohni kiritadi. Ariza shifokorning Telegramiga tushadi.
Bot saytdan alohida ishlaydi. Keyinchalik saytdagi forma ham shu botga ulanadi (`/api/apply`).

## Menyu

Pastdagi tugmalar bosilgan bo‘limga qarab almashadi.

| Tugma | Vazifasi |
|---|---|
| 📝 Qabulga yozilish | Masalalar ro‘yxati chiqadi, tanlangach ariza (ism, telefon, izoh) so‘raladi |
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
| `ALLOWED_ORIGIN` | Text (ixtiyoriy) | sayt manzili, masalan `https://avazxon.uz` |

6. **Chat ID olish**: shifokor botga kirib `/id` yozadi (yoki «Yana» → «Mening ID»), bot raqam yuboradi. Shu raqamni `DOCTOR_CHAT_IDS` ga yozing (bir nechta bo‘lsa vergul bilan: `123,456`). Shifokor avval botda `/start` bosgan bo‘lishi shart, aks holda bot unga yoza olmaydi.
7. **Webhookni ulash**: brauzerda oching:
   `https://avazxon-bot.<akkaunt>.workers.dev/setup?key=WEBHOOK_SECRET_QIYMATI`
   Javobda `"ok":true` chiqsa, bot tayyor. Bu havola Telegramdagi buyruqlar ro‘yxatini ham yangilaydi.
8. Botni sinab ko‘ring: `/start` → «Qabulga yozilish» → masala → ism → telefon → izoh. Shifokorga xabar kelishi kerak.

## Buyruqlar

`/start`, `/menu` – asosiy menyu · `/ariza` – qabulga yozilish · `/xizmatlar` – masalalar ro‘yxati · `/cancel` – bekor qilish · `/id` – chat ID

## Saytni keyin ulash
Saytdagi formadan `POST https://avazxon-bot.<akkaunt>.workers.dev/api/apply` ga JSON yuboriladi:
`{"name":"Ali","phone":"901234567","topic":"Prostata","comment":"..."}`
(`website` maydoni bo‘sh bo‘lishi kerak, bu spamdan himoya). Bir IP’dan daqiqada 1 ta.

## Ma’lumotlar
Arizalar botda saqlanmaydi, faqat shifokorning Telegramiga yuboriladi. KV’da faqat vaqtinchalik holat (suhbat bosqichi, spamdan himoya va savollarga javob uchun bog‘lanish) turadi va o‘zi o‘chib ketadi.

## Xavfsizlik
- Tokenni hech qachon kodga yoki GitHub’ga yozmang, faqat Secret sifatida.
- Token chatda yoki ochiq joyda ko‘rinib qolsa, BotFather → `/revoke` orqali yangisini oling va `BOT_TOKEN` ni almashtiring.
