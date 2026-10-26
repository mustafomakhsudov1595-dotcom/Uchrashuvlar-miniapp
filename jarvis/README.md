# J.A.R.V.I.S. — shaxsiy ovozli yordamchi (PWA)

Ishga tushirish (build kerak emas):

    cd jarvis && python3 -m http.server 8080

Telefonda ishlashi uchun HTTPS kerak (GitHub Pages / Netlify). Chrome'da oching → "Bosh ekranga qo'shish".

## Imkoniyatlar
- Ovoz (uz/ru/en), "jarvis" chaqiruv so'zi bilan qo'lsiz rejim, ekran o'chmaydi (wake lock)
- Qo'ng'iroq, SMS, WhatsApp, Telegram, email, kontaktlarni telefondan import
- Ilovalar va sozlamalarni ochish (Wi-Fi, Bluetooth, ekran, tovush, kamera…), budilnik, chiroq
- Doimiy taymer/eslatmalar (bildirishnoma bilan), vazifalar ro'yxati, daftar
- Ob-havo, valyuta kursi, kalkulyator (kalitsiz ham ishlaydi)
- Claude bilan: erkin til, kamera orqali "ko'rish" va rasm tahlili, internetdan qidirish,
  doimiy xotira, ko'p qadamli rejimlar ("ertalabki rejim")
- Model tanlash: Sonnet 5.5 / Fable 5.1 / Haiku 5.5 / Opus 5.5

Cheklov: brauzer ilovasi ekran yopiq paytda tinglamaydi va boshqa ilovalarni o'zi bosa olmaydi;
to'liq nazorat uchun native Android ilova kerak. API kalit faqat shu telefonda saqlanadi.
