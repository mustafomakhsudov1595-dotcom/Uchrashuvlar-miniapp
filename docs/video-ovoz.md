# Admin panel video — ovoz matni va AI-ovoz prompti

Video: `admin/public/guide.mp4` (1 daqiqa 34 soniya). Pastdagi vaqtlar shu videoga mos.

## 1. Vaqtli ovoz matni (o'zbekcha)

| № | Vaqt | Joy | Belgi | Matn |
|---|------|-----|-------|------|
| 1 | 0:01.4 – 0:05.0 | 3.6 s | 47 | Salom! Bu admin panel bo'yicha qisqa qo'llanma. |
| 2 | 0:05.2 – 0:10.6 | 5.4 s | 65 | Avval kirish: botga slesh admin va parolni yozib, tugmani bosing. |
| 3 | 0:11.3 – 0:16.6 | 5.3 s | 69 | Yoki admin ilovaga parolni kiriting. Parolni faqat adminlarga bering. |
| 4 | 0:16.9 – 0:19.5 | 2.6 s | 28 | Yangi buyurtmalar shu yerda. |
| 5 | 0:19.7 – 0:23.8 | 4.1 s | 49 | Ism, manzil, mahsulotlar va jami summa ko'rinadi. |
| 6 | 0:24.0 – 0:26.8 | 2.8 s | 29 | Telefon tugmasi — qo'ng'iroq. |
| 7 | 0:27.0 – 0:30.1 | 3.1 s | 45 | Yetkazib bergach, Bajarildi tugmasini bosing. |
| 8 | 0:30.3 – 0:33.4 | 3.1 s | 36 | Filtr bilan holat bo'yicha ajrating. |
| 9 | 0:33.6 – 0:36.3 | 2.7 s | 23 | Endi, Mahsulot bo'limi. |
| 10 | 0:36.5 – 0:43.7 | 7.2 s | 102 | Narxni va ombordagi sonini yozing, so'ng Saqlash tugmasini bosing. Ombor har buyurtmada o'zi kamayadi. |
| 11 | 0:44.0 – 1:06.5 | 22.5 s | 166 | Yangi mahsulot qo'shish uchun, plyus tugmasini bosing. Rasm yuklang, nomini, narxini va sonini yozing, so'ng Saqlashni bosing. Mahsulot do'konda darrov paydo bo'ladi. |
| 12 | 1:07.3 – 1:09.9 | 2.6 s | 35 | Aksiya bo'limi: skidka va promokod. |
| 13 | 1:10.2 – 1:18.7 | 8.5 s | 69 | Skidka uchun nom va foizni yozib, saqlang. Narxlar o'zi arzonlashadi. |
| 14 | 1:19.0 – 1:25.6 | 6.6 s | 85 | Promokod uchun kod va foizni yozing. Mijoz savatda shu kodni kiritsa, chegirma oladi. |
| 15 | 1:25.9 – 1:32.5 | 6.6 s | 96 | Haftalik hisobot har yakshanba kechqurun, soat sakkizda, o'zi keladi. Hozir ham yuborish mumkin. |
| 16 | 1:33.0 – 1:38.0 | 5.0 s | 42 | Tayyor! Admin panel shunchalik oson. Omad! |

> Tezlik: o'rtacha 12–14 belgi/soniya. Yuqoridagi qatorlar o'sha sahna uzunligiga sig'adigan qilib yozilgan.
> Subtitr fayli: `docs/guide.srt` (CapCut, InShot, VLC va Telegram uchun tayyor).

## 2. AI ovoz dasturiga beriladigan PROMPT (nusxa oling)

```
Sen — o'zbek tilidagi professional diktorsan. Quyidagi matnni o'zbek tilida (lotin yozuvi,
Toshkent shevasi, adabiy talaffuz) ovozlashtir.

Ovoz: samimiy, iliq, ishonchli, do'stona o'qituvchi ohangida. {ayol yoki erkak} ovozi.
Tezlik: o'rta-sekin (taxminan 12–14 belgi/soniya), har jumladan keyin 0,4 soniya pauza.
Urg'u: "Saqlash", "Bajarildi", "skidka", "promokod", "admin" so'zlariga yengil urg'u ber.
Intonatsiya: tabiiy, robotsimon emas; savol va hayrat ohangi kerak emas.
Raqam va belgilar: "/admin" ni "slesh admin" deb o'qi. "20:00" ni "soat sakkiz" deb o'qi.

Har bir qatorni ALOHIDA audio fayl qilib ber (01.mp3, 02.mp3 ... 16.mp3), chunki ular
videoning aniq joylariga qo'yiladi. Qator uzunligi ko'rsatilgan soniyadan oshmasin.
Matn (raqam — qator):
1. Salom! Bu admin panel bo'yicha qisqa qo'llanma.
2. Avval kirish: botga slesh admin va parolni yozib, tugmani bosing.
3. Yoki admin ilovaga parolni kiriting. Parolni faqat adminlarga bering.
4. Yangi buyurtmalar shu yerda.
5. Ism, manzil, mahsulotlar va jami summa ko'rinadi.
6. Telefon tugmasi — qo'ng'iroq.
7. Yetkazib bergach, Bajarildi tugmasini bosing.
8. Filtr bilan holat bo'yicha ajrating.
9. Endi, Mahsulot bo'limi.
10. Narxni va ombordagi sonini yozing, so'ng Saqlash tugmasini bosing. Ombor har buyurtmada o'zi kamayadi.
11. Yangi mahsulot qo'shish uchun, plyus tugmasini bosing. Rasm yuklang, nomini, narxini va sonini yozing, so'ng Saqlashni bosing. Mahsulot do'konda darrov paydo bo'ladi.
12. Aksiya bo'limi: skidka va promokod.
13. Skidka uchun nom va foizni yozib, saqlang. Narxlar o'zi arzonlashadi.
14. Promokod uchun kod va foizni yozing. Mijoz savatda shu kodni kiritsa, chegirma oladi.
15. Haftalik hisobot har yakshanba kechqurun, soat sakkizda, o'zi keladi. Hozir ham yuborish mumkin.
16. Tayyor! Admin panel shunchalik oson. Omad!
```

## 3. Qaysi dasturda qilish mumkin
- **Uzbekvoice.ai / Muxlisa** — bepul o'zbekcha ovoz (matn → ovoz).
- **ElevenLabs** — o'zbek tilini qo'llaydi, eng tabiiy ovoz (ovozni tanlab, yuqoridagi promptni qo'ying).
- **Microsoft Edge → "Ovoz chiqarib o'qish"** yoki Azure TTS: `uz-UZ-MadinaNeural` (ayol), `uz-UZ-SardorNeural` (erkak).
- Yoki **o'zingiz ovoz yozing**: videoni ochib, jadvaldagi matnni vaqtiga qarab o'qing (telefondagi diktofon yetadi).

## 4. Ovozni videoga qo'shish
- **Oson yo'l:** ovoz fayllarini (yoki bitta audio faylni) menga yuboring, men videoga vaqtiga qarab joylab, tayyor mp4 beraman.
- **Telefonda:** CapCut / InShot → videoni oching → Audio → ovoz fayllarini jadvaldagi vaqtga qo'ying.
