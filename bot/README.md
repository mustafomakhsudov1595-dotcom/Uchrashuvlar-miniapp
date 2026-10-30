# Dr. Avazxon – zayafka boti (Cloudflare Worker)

Bemor botga `/start` yozadi, ism, telefon, muammo turi va izohni kiritadi. Zayafka shifokorning Telegramiga tushadi.
Bot saytdan alohida ishlaydi. Keyinchalik saytdagi forma ham shu botga ulanadi (`/api/apply`).

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
| `ALLOWED_ORIGIN` | Text (ixtiyoriy) | sayt manzili, masalan `https://avazxon.uz` |

6. **Chat ID olish**: shifokor botga kirib `/id` yozadi, bot raqam yuboradi. Shu raqamni `DOCTOR_CHAT_IDS` ga yozing (bir nechta bo‘lsa vergul bilan: `123,456`). Shifokor avval botda `/start` bosgan bo‘lishi shart, aks holda bot unga yoza olmaydi.
7. **Webhookni ulash**: brauzerda oching:
   `https://avazxon-bot.<akkaunt>.workers.dev/setup?key=WEBHOOK_SECRET_QIYMATI`
   Javobda `"ok":true` chiqsa, bot tayyor.
8. Botni sinab ko‘ring: `/start` → ism → telefon → muammo → izoh. Shifokorga xabar kelishi kerak.

## Saytni keyin ulash
Saytdagi formadan `POST https://avazxon-bot.<akkaunt>.workers.dev/api/apply` ga JSON yuboriladi:
`{"name":"Ali","phone":"901234567","topic":"Prostata","comment":"..."}`
(`website` maydoni bo‘sh bo‘lishi kerak, bu spamdan himoya). Bir IP’dan daqiqada 1 ta.

## Xavfsizlik
- Tokenni hech qachon kodga yoki GitHub’ga yozmang, faqat Secret sifatida.
- Token chatda yoki ochiq joyda ko‘rinib qolsa, BotFather → `/revoke` orqali yangisini oling va `BOT_TOKEN` ni almashtiring.
